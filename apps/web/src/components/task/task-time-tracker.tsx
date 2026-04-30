import { ChevronDown, ChevronRight, Pause, Play, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
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
import useDeleteTimeEntry from "@/hooks/mutations/time-entry/use-delete-time-entry";
import useStartTimeEntry from "@/hooks/mutations/time-entry/use-start-time-entry";
import useStopTimeEntry from "@/hooks/mutations/time-entry/use-stop-time-entry";
import useGetActiveTimeEntry from "@/hooks/queries/time-entry/use-get-active-time-entry";
import useGetTimeEntriesByTaskId from "@/hooks/queries/time-entry/use-get-time-entries";
import { toast } from "@/lib/toast";

type TaskTimeTrackerProps = {
  taskId: string;
};

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s
      .toString()
      .padStart(2, "0")}s`;
  }
  if (m > 0) {
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${s}s`;
}

function formatRelativeDate(value: string | Date | null) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function useNow(enabled: boolean) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return now;
}

export default function TaskTimeTracker({ taskId }: TaskTimeTrackerProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const { data: entries = [], isLoading } = useGetTimeEntriesByTaskId(taskId);
  const { data: active } = useGetActiveTimeEntry();
  const startMutation = useStartTimeEntry();
  const stopMutation = useStopTimeEntry();
  const deleteMutation = useDeleteTimeEntry();

  const isActiveOnThisTask = active?.taskId === taskId;
  const isActiveElsewhere = active && !isActiveOnThisTask;

  const now = useNow(Boolean(active));

  const totalSeconds = useMemo(() => {
    const finished = entries
      .filter((e) => e.endTime)
      .reduce((acc, e) => acc + (e.duration ?? 0), 0);
    const inProgress = entries
      .filter((e) => !e.endTime)
      .reduce((acc, e) => {
        const start = new Date(e.startTime).getTime();
        return acc + Math.max(0, Math.floor((now - start) / 1000));
      }, 0);
    return finished + inProgress;
  }, [entries, now]);

  const handleToggle = async () => {
    try {
      if (isActiveOnThisTask) {
        await stopMutation.mutateAsync({
          id: active?.id,
          taskId,
        });
        toast.success("Timer paused");
        return;
      }

      if (isActiveElsewhere) {
        await startMutation.mutateAsync({ taskId });
        toast.success("Switched timer to this task");
        return;
      }

      await startMutation.mutateAsync({ taskId });
      toast.success("Timer started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update timer",
      );
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteMutation.mutateAsync({ id: entryId, taskId });
      toast.success("Time entry deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete time entry",
      );
    }
  };

  const isMutating =
    startMutation.isPending ||
    stopMutation.isPending ||
    deleteMutation.isPending;

  const buttonLabel = isActiveOnThisTask
    ? "Pause"
    : isActiveElsewhere
      ? "Switch & start"
      : "Start";

  const buttonTooltip = isActiveElsewhere
    ? `Currently tracking time on "${active?.taskTitle ?? "another task"}". Click to switch.`
    : isActiveOnThisTask
      ? "Pause the timer"
      : "Start tracking time on this task";

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => +new Date(b.startTime) - +new Date(a.startTime),
      ),
    [entries],
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span>Time tracking</span>
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            <span
              className={`font-mono tabular-nums text-sm ${
                isActiveOnThisTask
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {formatDuration(totalSeconds)}
            </span>
            {isActiveOnThisTask && (
              <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                live
              </span>
            )}
            {isActiveElsewhere && (
              <span className="text-[11px] text-muted-foreground truncate">
                tracking on {active?.taskTitle ?? "another task"}
              </span>
            )}
          </div>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isActiveOnThisTask ? "destructive-outline" : "default"}
                onClick={handleToggle}
                disabled={isMutating}
                aria-label={buttonLabel}
              >
                {isActiveOnThisTask ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
                <span>{buttonLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{buttonTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <CollapsibleContent>
        <div className="mt-2 flex flex-col gap-1.5">
          {isLoading && (
            <p className="text-xs text-muted-foreground px-2 py-1">
              Loading entries…
            </p>
          )}

          {!isLoading && sortedEntries.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">
              No time entries yet. Press Start to begin tracking.
            </p>
          )}

          {sortedEntries.map((entry) => {
            const isOpenSegment = !entry.endTime;
            const liveDuration = isOpenSegment
              ? Math.max(
                  0,
                  Math.floor(
                    (now - new Date(entry.startTime).getTime()) / 1000,
                  ),
                )
              : (entry.duration ?? 0);
            const isOwnEntry = entry.userId && entry.userId === user?.id;

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground truncate">
                    {entry.userName ?? "Unknown user"}
                  </span>
                  <span className="text-[11px] text-muted-foreground/80">
                    · {formatRelativeDate(entry.startTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      isOpenSegment
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-foreground/80"
                    }`}
                  >
                    {formatDuration(liveDuration)}
                    {isOpenSegment && " ·"}
                  </span>
                  {isOwnEntry && !isOpenSegment && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Delete entry"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
