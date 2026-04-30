import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Inbox, Pause, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import icons from "@/constants/project-icons";
import useStartTimeEntry from "@/hooks/mutations/time-entry/use-start-time-entry";
import useStopTimeEntry from "@/hooks/mutations/time-entry/use-stop-time-entry";
import useGetMyTasks from "@/hooks/queries/task/use-get-my-tasks";
import useGetActiveTimeEntry from "@/hooks/queries/time-entry/use-get-active-time-entry";
import { formatDateMedium } from "@/lib/format";
import { toast } from "@/lib/toast";

type MyTask = {
  id: string;
  title: string;
  number: number | null;
  status: string;
  priority: string | null;
  dueDate: string | Date | null;
  projectId: string;
  projectName: string | null;
  projectSlug: string | null;
  projectIcon: string | null;
  workspaceId: string;
  workspaceName: string | null;
};

const PRIORITY_VARIANT: Record<
  string,
  "outline" | "warning" | "error" | "info" | "secondary"
> = {
  urgent: "error",
  high: "warning",
  medium: "info",
  low: "secondary",
  "no-priority": "outline",
};

const STATUS_DOT: Record<string, string> = {
  "to-do": "bg-muted-foreground/40",
  "in-progress": "bg-info",
  done: "bg-emerald-500",
  blocked: "bg-destructive",
  archived: "bg-muted-foreground/30",
};

type MyTasksViewProps = {
  workspaceId: string;
};

export default function MyTasksView({ workspaceId }: MyTasksViewProps) {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useGetMyTasks();
  const { data: active } = useGetActiveTimeEntry();
  const startMutation = useStartTimeEntry();
  const stopMutation = useStopTimeEntry();

  const [hideDone, setHideDone] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const workspaceTasks = useMemo<MyTask[]>(
    () => tasks.filter((t) => t.workspaceId === workspaceId),
    [tasks, workspaceId],
  );

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        projectSlug: string | null;
        projectIcon: string | null;
        tasks: MyTask[];
      }
    >();

    for (const task of workspaceTasks) {
      if (hideDone && task.status === "done") continue;
      const key = task.projectId;
      const group = map.get(key);
      if (group) {
        group.tasks.push(task);
      } else {
        map.set(key, {
          projectId: task.projectId,
          projectName: task.projectName ?? "Untitled project",
          projectSlug: task.projectSlug,
          projectIcon: task.projectIcon,
          tasks: [task],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.projectName.localeCompare(b.projectName),
    );
  }, [workspaceTasks, hideDone]);

  const totalCount = workspaceTasks.filter(
    (t) => !hideDone || t.status !== "done",
  ).length;

  const toggleProject = (projectId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handleOpenTask = (task: MyTask) => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
      params: {
        workspaceId,
        projectId: task.projectId,
        taskId: task.id,
      },
    });
  };

  const handleToggleTimer = async (task: MyTask) => {
    try {
      const isActiveOnThisTask = active?.taskId === task.id;
      if (isActiveOnThisTask) {
        await stopMutation.mutateAsync({
          id: active?.id,
          taskId: task.id,
        });
        toast.success("Timer paused");
      } else {
        await startMutation.mutateAsync({ taskId: task.id });
        toast.success(active ? "Switched timer" : "Timer started");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update timer",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-md bg-muted/40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (workspaceTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <div className="size-14 rounded-xl bg-muted flex items-center justify-center">
          <Inbox className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">No tasks assigned to you</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            When you get assigned to tasks in this workspace they will show up
            here, grouped by project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b text-xs">
        <span className="text-muted-foreground">
          {totalCount} {totalCount === 1 ? "task" : "tasks"} across{" "}
          {groups.length} {groups.length === 1 ? "project" : "projects"}
        </span>
        <Button
          variant={hideDone ? "outline" : "secondary"}
          size="xs"
          onClick={() => setHideDone((v) => !v)}
        >
          {hideDone ? "Show completed" : "Hide completed"}
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          No tasks match the current filter.
        </div>
      ) : (
        <div className="flex flex-col">
          {groups.map((group) => {
            const Icon =
              icons[group.projectIcon as keyof typeof icons] ?? icons.Layout;
            const isOpen = !collapsed.has(group.projectId);
            return (
              <Collapsible
                key={group.projectId}
                open={isOpen}
                onOpenChange={() => toggleProject(group.projectId)}
                className="border-b last:border-b-0"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent/40 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {group.projectName}
                    </span>
                    <span className="text-xs text-muted-foreground/80">
                      {group.projectSlug}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {group.tasks.length}
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <ul className="divide-y divide-border/60">
                    {group.tasks.map((task) => {
                      const dot =
                        STATUS_DOT[task.status] ?? "bg-muted-foreground/40";
                      const isActiveOnThisTask = active?.taskId === task.id;
                      const isOverdue =
                        task.dueDate &&
                        new Date(task.dueDate).getTime() < Date.now() &&
                        task.status !== "done";
                      return (
                        <li
                          key={task.id}
                          className="group flex items-center gap-3 px-4 py-2 hover:bg-accent/30 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenTask(task)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <span
                              className={`size-2 shrink-0 rounded-full ${dot}`}
                              aria-hidden
                            />
                            <span className="text-xs font-medium text-muted-foreground shrink-0">
                              {group.projectSlug}-{task.number}
                            </span>
                            <span className="text-sm truncate">
                              {task.title}
                            </span>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.priority &&
                              task.priority !== "no-priority" && (
                                <Badge
                                  variant={
                                    PRIORITY_VARIANT[task.priority] ??
                                    "secondary"
                                  }
                                  size="sm"
                                >
                                  {task.priority}
                                </Badge>
                              )}
                            {task.dueDate && (
                              <span
                                className={`text-[11px] tabular-nums ${
                                  isOverdue
                                    ? "text-destructive-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatDateMedium(
                                  task.dueDate instanceof Date
                                    ? task.dueDate.toISOString()
                                    : task.dueDate,
                                )}
                              </span>
                            )}

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon-xs"
                                    variant={
                                      isActiveOnThisTask
                                        ? "destructive-outline"
                                        : "ghost"
                                    }
                                    onClick={(
                                      e: React.MouseEvent<HTMLButtonElement>,
                                    ) => {
                                      e.stopPropagation();
                                      handleToggleTimer(task);
                                    }}
                                    disabled={
                                      startMutation.isPending ||
                                      stopMutation.isPending
                                    }
                                    aria-label={
                                      isActiveOnThisTask
                                        ? "Pause timer"
                                        : "Start timer"
                                    }
                                  >
                                    {isActiveOnThisTask ? (
                                      <Pause className="size-3" />
                                    ) : (
                                      <Play className="size-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isActiveOnThisTask
                                    ? "Pause"
                                    : active
                                      ? "Switch & start"
                                      : "Start timer"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
