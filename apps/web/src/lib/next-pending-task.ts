import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";

/**
 * Resolves the "next pending task" of a project for time tracking.
 *
 * Pending = tasks that live in a non-final column (i.e. not "done"), walked in
 * board order (columns are already sorted by position) and, within a column, by
 * task position. Tasks assigned to the current user take precedence so that
 * "start my next task" is the common case; when the user has no pending task
 * assigned, we fall back to the first pending task in the project.
 */
export function getNextPendingTask(
  project: ProjectWithTasks | null | undefined,
  userId?: string | null,
): Task | null {
  if (!project) {
    return null;
  }

  const pendingTasks = project.columns
    .filter((column) => !column.isFinal)
    .flatMap((column) =>
      [...column.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    );

  if (pendingTasks.length === 0) {
    return null;
  }

  if (userId) {
    const ownTask = pendingTasks.find((task) => task.userId === userId);
    if (ownTask) {
      return ownTask;
    }
  }

  return pendingTasks[0];
}
