import { useNavigate } from "@tanstack/react-router";
import { ListChecks, Pause, Play, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useStartTimeEntry from "@/hooks/mutations/time-entry/use-start-time-entry";
import useStopTimeEntry from "@/hooks/mutations/time-entry/use-stop-time-entry";
import useGetMyTasks from "@/hooks/queries/task/use-get-my-tasks";
import useGetActiveTimeEntry from "@/hooks/queries/time-entry/use-get-active-time-entry";
import { toast } from "@/lib/toast";

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FloatingTimeTracker() {
  const navigate = useNavigate();
  const { data: active } = useGetActiveTimeEntry();
  const stopMutation = useStopTimeEntry();
  const startMutation = useStartTimeEntry();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: myTasks = [] } = useGetMyTasks(isSwitcherOpen);

  useEffect(() => {
    if (!isSwitcherOpen) {
      setQuery("");
      return;
    }
    const handle = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [isSwitcherOpen]);

  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const liveSeconds = useMemo(() => {
    if (!active) return 0;
    const start = new Date(active.startTime).getTime();
    return Math.max(0, Math.floor((now - start) / 1000));
  }, [active, now]);

  const switchableTasks = useMemo(
    () => myTasks.filter((t) => t.id !== active?.taskId && t.status !== "done"),
    [myTasks, active],
  );

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return switchableTasks;
    return switchableTasks.filter((t) => {
      const ref = `${t.projectSlug ?? ""}-${t.number ?? ""}`.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        ref.includes(q) ||
        (t.projectName ?? "").toLowerCase().includes(q) ||
        (t.workspaceName ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, switchableTasks]);

  if (!active) return null;

  const handlePause = async () => {
    try {
      await stopMutation.mutateAsync({
        id: active.id,
        taskId: active.taskId,
      });
      toast.success("Timer paused");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to pause timer",
      );
    }
  };

  const handleSwitchToTask = async (taskId: string) => {
    try {
      await startMutation.mutateAsync({ taskId });
      toast.success("Switched timer");
      setIsSwitcherOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to switch timer",
      );
    }
  };

  const handleOpenTask = () => {
    if (!active.taskId) return;
    const task = myTasks.find((t) => t.id === active.taskId);
    if (task) {
      navigate({
        to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
        params: {
          workspaceId: task.workspaceId,
          projectId: task.projectId,
          taskId: task.id,
        },
      });
    }
  };

  return (
    <section
      className="fixed bottom-4 right-4 z-50 max-w-[min(calc(100vw-2rem),22rem)]"
      aria-label="Active time tracker"
    >
      <div className="flex items-center gap-2 rounded-xl border bg-popover/95 backdrop-blur shadow-lg/10 px-3 py-2 not-dark:bg-clip-padding">
        <button
          type="button"
          onClick={handleOpenTask}
          className="flex items-center gap-2 min-w-0 text-left hover:opacity-90 transition-opacity"
          aria-label="Open active task"
        >
          <span
            className="size-2 shrink-0 rounded-full bg-emerald-500 animate-pulse"
            aria-hidden
          />
          <div className="flex flex-col min-w-0">
            <span className="font-mono tabular-nums text-sm font-semibold leading-none">
              {formatDuration(liveSeconds)}
            </span>
            <span className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
              {active.taskTitle ?? "Active task"}
            </span>
          </div>
        </button>

        <div className="ml-auto flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive-outline"
                  size="icon-sm"
                  onClick={handlePause}
                  disabled={stopMutation.isPending}
                  aria-label="Pause timer"
                >
                  <Pause className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Pause</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover open={isSwitcherOpen} onOpenChange={setIsSwitcherOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Switch task"
                    >
                      <ListChecks className="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Switch task</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <PopoverContent
              side="top"
              align="end"
              alignOffset={-4}
              sideOffset={8}
              className="w-80 p-0 max-h-[min(28rem,calc(100vh-6rem))] flex flex-col"
            >
              <div className="border-b p-2">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={inputRef}
                    size="sm"
                    className="pl-8"
                    placeholder="Search your tasks…"
                    value={query}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setQuery(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" && filteredTasks[0]) {
                        e.preventDefault();
                        handleSwitchToTask(filteredTasks[0].id);
                      }
                      if (e.key === "Escape") {
                        setIsSwitcherOpen(false);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-1">
                {filteredTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 px-2">
                    {switchableTasks.length === 0
                      ? "No other tasks assigned to you"
                      : "No matching tasks"}
                  </p>
                ) : (
                  filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleSwitchToTask(task.id)}
                      disabled={startMutation.isPending}
                      className="w-full text-left rounded-md px-2.5 py-2 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-60 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Play className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          {task.projectSlug}-{task.number}
                        </span>
                        <span className="text-sm truncate">{task.title}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground/80 truncate mt-0.5 block">
                        {task.workspaceName}
                        {task.projectName ? ` · ${task.projectName}` : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </section>
  );
}
