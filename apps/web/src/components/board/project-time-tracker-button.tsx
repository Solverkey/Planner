import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useStartTimeEntry from "@/hooks/mutations/time-entry/use-start-time-entry";
import useStopTimeEntry from "@/hooks/mutations/time-entry/use-stop-time-entry";
import useGetActiveTimeEntry from "@/hooks/queries/time-entry/use-get-active-time-entry";
import { getNextPendingTask } from "@/lib/next-pending-task";
import { toast } from "@/lib/toast";
import type { ProjectWithTasks } from "@/types/project";

type ProjectTimeTrackerButtonProps = {
  project: ProjectWithTasks | null | undefined;
};

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

export default function ProjectTimeTrackerButton({
  project,
}: ProjectTimeTrackerButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: active } = useGetActiveTimeEntry();
  const startMutation = useStartTimeEntry();
  const stopMutation = useStopTimeEntry();

  const nextPendingTask = useMemo(
    () => getNextPendingTask(project, user?.id),
    [project, user?.id],
  );

  const isActive = Boolean(active);

  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const liveSeconds = useMemo(() => {
    if (!active) {
      return 0;
    }
    const start = new Date(active.startTime).getTime();
    return Math.max(0, Math.floor((now - start) / 1000));
  }, [active, now]);

  const isMutating = startMutation.isPending || stopMutation.isPending;

  const handleClick = async () => {
    try {
      if (active) {
        await stopMutation.mutateAsync({
          id: active.id,
          taskId: active.taskId,
        });
        toast.success(t("tasks:timeTracking.toast.paused"));
        return;
      }

      if (!nextPendingTask) {
        toast.error(t("tasks:timeTracking.project.noPendingTask"));
        return;
      }

      await startMutation.mutateAsync({ taskId: nextPendingTask.id });
      toast.success(
        t("tasks:timeTracking.project.startedOnTask", {
          title: nextPendingTask.title,
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:timeTracking.toast.updateFailed"),
      );
    }
  };

  const tooltip = isActive
    ? t("tasks:timeTracking.actions.pause")
    : nextPendingTask
      ? t("tasks:timeTracking.project.startTooltip", {
          title: nextPendingTask.title,
        })
      : t("tasks:timeTracking.project.noPendingTask");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant={isActive ? "destructive-outline" : "default"}
            onClick={handleClick}
            disabled={isMutating || (!isActive && !nextPendingTask)}
            aria-label={tooltip}
          >
            {isActive ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
            {isActive ? (
              <span className="font-mono tabular-nums text-xs">
                {formatDuration(liveSeconds)}
              </span>
            ) : (
              <span>{t("tasks:timeTracking.project.start")}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
