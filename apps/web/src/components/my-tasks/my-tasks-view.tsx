import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  Inbox,
  Pause,
  Play,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
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
import { useUserPreferencesStore } from "@/store/user-preferences";

type MyTasksSort = "date" | "date-priority";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  "no-priority": 4,
};

function toTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

// Chronological by due date (soonest first); tasks without a due date come
// last, ordered by creation date. Optionally breaks ties by priority so the
// "date and priority" mode surfaces higher-priority tasks (notably useful for
// the many tasks that share no due date).
function compareMyTasks(a: MyTask, b: MyTask, sort: MyTasksSort) {
  const aDue = toTime(a.dueDate);
  const bDue = toTime(b.dueDate);

  if (aDue !== null && bDue !== null) {
    if (aDue !== bDue) return aDue - bDue;
  } else if (aDue !== null) {
    return -1;
  } else if (bDue !== null) {
    return 1;
  }

  if (sort === "date-priority") {
    const aPriority = PRIORITY_ORDER[a.priority ?? "no-priority"] ?? 4;
    const bPriority = PRIORITY_ORDER[b.priority ?? "no-priority"] ?? 4;
    if (aPriority !== bPriority) return aPriority - bPriority;
  }

  return (toTime(a.createdAt) ?? 0) - (toTime(b.createdAt) ?? 0);
}

type MyTask = {
  id: string;
  title: string;
  number: number | null;
  status: string;
  priority: string | null;
  dueDate: string | Date | null;
  createdAt: string | Date;
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useGetMyTasks();
  const { data: active } = useGetActiveTimeEntry();
  const startMutation = useStartTimeEntry();
  const stopMutation = useStopTimeEntry();
  const { myTasksSort, setMyTasksSort } = useUserPreferencesStore();

  const [hideDone, setHideDone] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const workspaceTasks = useMemo<MyTask[]>(
    () => tasks.filter((task) => task.workspaceId === workspaceId),
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
          projectName: task.projectName ?? t("tasks:myTasks.untitledProject"),
          projectSlug: task.projectSlug,
          projectIcon: task.projectIcon,
          tasks: [task],
        });
      }
    }

    const grouped = Array.from(map.values());
    for (const group of grouped) {
      group.tasks.sort((a, b) => compareMyTasks(a, b, myTasksSort));
    }

    return grouped.sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [workspaceTasks, hideDone, t, myTasksSort]);

  const totalCount = workspaceTasks.filter(
    (task) => !hideDone || task.status !== "done",
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
        toast.success(t("tasks:timeTracking.toast.paused"));
      } else {
        await startMutation.mutateAsync({ taskId: task.id });
        toast.success(
          active
            ? t("tasks:timeTracking.toast.switchedShort")
            : t("tasks:timeTracking.toast.started"),
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:timeTracking.toast.updateFailed"),
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
          <h3 className="text-lg font-semibold">
            {t("tasks:myTasks.empty.title")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t("tasks:myTasks.empty.description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b text-xs">
        <span className="text-muted-foreground">
          {t("tasks:myTasks.summary.tasks", { count: totalCount })}{" "}
          {t("tasks:myTasks.summary.across")}{" "}
          {t("tasks:myTasks.summary.projects", { count: groups.length })}
        </span>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs">
                <ArrowDownUp className="size-3" />
                {myTasksSort === "date"
                  ? t("tasks:myTasks.sort.date")
                  : t("tasks:myTasks.sort.datePriority")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={myTasksSort}
                onValueChange={(value) => setMyTasksSort(value as MyTasksSort)}
              >
                <DropdownMenuRadioItem value="date">
                  {t("tasks:myTasks.sort.date")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date-priority">
                  {t("tasks:myTasks.sort.datePriority")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={hideDone ? "outline" : "secondary"}
            size="xs"
            onClick={() => setHideDone((v) => !v)}
          >
            {hideDone
              ? t("tasks:myTasks.filter.showCompleted")
              : t("tasks:myTasks.filter.hideCompleted")}
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          {t("tasks:myTasks.filter.noMatches")}
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
                                  {t(`tasks:priority.${task.priority}`)}
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
                                        ? t("tasks:myTasks.aria.pauseTimer")
                                        : t("tasks:myTasks.aria.startTimer")
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
                                    ? t("tasks:myTasks.tooltip.pause")
                                    : active
                                      ? t(
                                          "tasks:myTasks.tooltip.switchAndStart",
                                        )
                                      : t("tasks:myTasks.tooltip.start")}
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
