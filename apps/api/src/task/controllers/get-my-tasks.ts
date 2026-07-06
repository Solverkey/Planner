import { and, desc, eq, isNull } from "drizzle-orm";
import db from "../../database";
import {
  projectTable,
  taskTable,
  workspaceTable,
  workspaceUserTable,
} from "../../database/schema";

async function getMyTasks(userId: string) {
  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      number: taskTable.number,
      status: taskTable.status,
      priority: taskTable.priority,
      dueDate: taskTable.dueDate,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      projectId: taskTable.projectId,
      projectName: projectTable.name,
      projectSlug: projectTable.slug,
      projectIcon: projectTable.icon,
      workspaceId: projectTable.workspaceId,
      workspaceName: workspaceTable.name,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .innerJoin(workspaceTable, eq(projectTable.workspaceId, workspaceTable.id))
    .innerJoin(
      workspaceUserTable,
      and(
        eq(workspaceUserTable.workspaceId, projectTable.workspaceId),
        eq(workspaceUserTable.userId, userId),
      ),
    )
    .where(and(eq(taskTable.userId, userId), isNull(projectTable.archivedAt)))
    .orderBy(desc(taskTable.updatedAt));

  return tasks;
}

export default getMyTasks;
