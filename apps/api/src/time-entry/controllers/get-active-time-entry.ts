import { and, eq, isNull } from "drizzle-orm";
import db from "../../database";
import { taskTable, timeEntryTable, userTable } from "../../database/schema";

async function getActiveTimeEntry(userId: string) {
  const [active] = await db
    .select({
      id: timeEntryTable.id,
      taskId: timeEntryTable.taskId,
      taskTitle: taskTable.title,
      userId: timeEntryTable.userId,
      userName: userTable.name,
      description: timeEntryTable.description,
      startTime: timeEntryTable.startTime,
      endTime: timeEntryTable.endTime,
      duration: timeEntryTable.duration,
      createdAt: timeEntryTable.createdAt,
    })
    .from(timeEntryTable)
    .leftJoin(userTable, eq(timeEntryTable.userId, userTable.id))
    .leftJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
    .where(
      and(eq(timeEntryTable.userId, userId), isNull(timeEntryTable.endTime)),
    )
    .limit(1);

  return active ?? null;
}

export default getActiveTimeEntry;
