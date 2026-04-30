import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import useCreateTimeEntry from "@/hooks/mutations/time-entry/use-create-time-entry";
import { toast } from "@/lib/toast";

type ManualTimeEntryDialogProps = {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toLocalInputValue(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

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

export default function ManualTimeEntryDialog({
  taskId,
  open,
  onOpenChange,
}: ManualTimeEntryDialogProps) {
  const { t } = useTranslation();
  const createMutation = useCreateTimeEntry();

  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setStartValue(toLocalInputValue(oneHourAgo));
      setEndValue(toLocalInputValue(now));
      setDescription("");
      setError(null);
    }
  }, [open]);

  const durationSeconds = useMemo(() => {
    if (!startValue || !endValue) return null;
    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    return Math.max(0, Math.floor((end - start) / 1000));
  }, [startValue, endValue]);

  const handleSubmit = async () => {
    setError(null);

    if (!startValue || !endValue) {
      setError(t("tasks:timeTracking.manual.errors.missingTimes"));
      return;
    }

    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError(t("tasks:timeTracking.manual.errors.missingTimes"));
      return;
    }

    if (end.getTime() <= start.getTime()) {
      setError(t("tasks:timeTracking.manual.errors.endBeforeStart"));
      return;
    }

    const now = Date.now();
    if (start.getTime() > now || end.getTime() > now) {
      setError(t("tasks:timeTracking.manual.errors.future"));
      return;
    }

    try {
      await createMutation.mutateAsync({
        taskId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        description: description.trim() || undefined,
      });
      toast.success(t("tasks:timeTracking.manual.toast.success"));
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("tasks:timeTracking.manual.toast.failed"),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {t("tasks:timeTracking.manual.dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("tasks:timeTracking.manual.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="manual-time-entry-start"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("tasks:timeTracking.manual.startLabel")}
              </label>
              <Input
                id="manual-time-entry-start"
                size="sm"
                nativeInput
                type="datetime-local"
                value={startValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStartValue(e.target.value)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="manual-time-entry-end"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("tasks:timeTracking.manual.endLabel")}
              </label>
              <Input
                id="manual-time-entry-end"
                size="sm"
                nativeInput
                type="datetime-local"
                value={endValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEndValue(e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manual-time-entry-description"
              className="text-xs font-medium text-muted-foreground"
            >
              {t("tasks:timeTracking.manual.descriptionLabel")}
            </label>
            <Input
              id="manual-time-entry-description"
              size="sm"
              placeholder={t(
                "tasks:timeTracking.manual.descriptionPlaceholder",
              )}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDescription(e.target.value)
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {t("tasks:timeTracking.manual.durationLabel")}
            </span>
            <span className="font-mono tabular-nums text-sm">
              {durationSeconds != null ? formatDuration(durationSeconds) : "—"}
            </span>
          </div>

          {error && (
            <p className="text-xs text-destructive-foreground" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            {t("common:actions.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {t("tasks:timeTracking.manual.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
