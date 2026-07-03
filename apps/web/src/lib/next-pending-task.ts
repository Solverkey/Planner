import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";

// Column slugs (stable across locales) used to prioritise which column the
// project-level timer should pull the "next pending task" from.
const IN_PROGRESS_SLUG = "in-progress";
const TO_DO_SLUG = "to-do";

/**
 * Resolves the "next pending task" of a project for time tracking.
 *
 * Column priority: "In Progress" first (keep logging on what you're already
 * working on), then "To Do" (start the next queued task), then any other
 * non-final columns in board order. "Done"/final columns are excluded. The
 * first non-empty column in that priority wins; within it, a task assigned to
 * the current user takes precedence, otherwise the first task by position.
 */
export function getNextPendingTask(
  project: ProjectWithTasks | null | undefined,
  userId?: string | null,
): Task | null {
  if (!project) {
    return null;
  }

  const nonFinalColumns = project.columns.filter((column) => !column.isFinal);

  const prioritisedColumns = [
    ...nonFinalColumns.filter((column) => column.id === IN_PROGRESS_SLUG),
    ...nonFinalColumns.filter((column) => column.id === TO_DO_SLUG),
    ...nonFinalColumns.filter(
      (column) => column.id !== IN_PROGRESS_SLUG && column.id !== TO_DO_SLUG,
    ),
  ];

  for (const column of prioritisedColumns) {
    if (column.tasks.length === 0) {
      continue;
    }

    const tasksByPosition = [...column.tasks].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );

    const ownTask = userId
      ? tasksByPosition.find((task) => task.userId === userId)
      : undefined;

    return ownTask ?? tasksByPosition[0];
  }

  return null;
}
