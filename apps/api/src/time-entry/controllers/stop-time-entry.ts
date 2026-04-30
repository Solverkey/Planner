import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { timeEntryTable } from "../../database/schema";

type StopTimeEntryParams = {
  userId: string;
  timeEntryId?: string;
};

async function stopTimeEntry({ userId, timeEntryId }: StopTimeEntryParams) {
  const now = new Date();

  const activeEntries = timeEntryId
    ? await db
        .select()
        .from(timeEntryTable)
        .where(
          and(
            eq(timeEntryTable.id, timeEntryId),
            eq(timeEntryTable.userId, userId),
            isNull(timeEntryTable.endTime),
          ),
        )
    : await db
        .select()
        .from(timeEntryTable)
        .where(
          and(
            eq(timeEntryTable.userId, userId),
            isNull(timeEntryTable.endTime),
          ),
        );

  if (activeEntries.length === 0) {
    throw new HTTPException(404, {
      message: "No active time entry to stop",
    });
  }

  const stoppedEntries = [];
  for (const active of activeEntries) {
    const startTimeMs = active.startTime.getTime();
    const duration = Math.max(
      0,
      Math.floor((now.getTime() - startTimeMs) / 1000),
    );
    const [updated] = await db
      .update(timeEntryTable)
      .set({ endTime: now, duration })
      .where(eq(timeEntryTable.id, active.id))
      .returning();
    if (updated) stoppedEntries.push(updated);
  }

  return stoppedEntries[0];
}

export default stopTimeEntry;
