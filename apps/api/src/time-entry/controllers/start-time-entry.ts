import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTable, timeEntryTable } from "../../database/schema";
import { publishEvent } from "../../events";

type StartTimeEntryParams = {
  taskId: string;
  userId: string;
  description?: string;
};

async function startTimeEntry({
  taskId,
  userId,
  description,
}: StartTimeEntryParams) {
  const now = new Date();

  const activeEntries = await db
    .select()
    .from(timeEntryTable)
    .where(
      and(eq(timeEntryTable.userId, userId), isNull(timeEntryTable.endTime)),
    );

  for (const active of activeEntries) {
    const startTimeMs = active.startTime.getTime();
    const duration = Math.max(
      0,
      Math.floor((now.getTime() - startTimeMs) / 1000),
    );
    await db
      .update(timeEntryTable)
      .set({ endTime: now, duration })
      .where(eq(timeEntryTable.id, active.id));
  }

  const [createdTimeEntry] = await db
    .insert(timeEntryTable)
    .values({
      id: createId(),
      taskId,
      userId,
      description: description || "",
      startTime: now,
      endTime: null,
      duration: 0,
    })
    .returning();

  if (!createdTimeEntry) {
    throw new HTTPException(500, {
      message: "Failed to start time entry",
    });
  }

  const [task] = await db
    .select({ userId: taskTable.userId, title: taskTable.title })
    .from(taskTable)
    .where(eq(taskTable.id, taskId));

  await publishEvent("time-entry.created", {
    timeEntryId: createdTimeEntry.id,
    taskId: createdTimeEntry.taskId,
    userId,
    type: "create",
    content: "started time tracking",
    taskOwnerId: task?.userId,
    taskTitle: task?.title,
  });

  return createdTimeEntry;
}

export default startTimeEntry;
