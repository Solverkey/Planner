import db from "../../database";
import { columnTable, projectTable } from "../../database/schema";

type ProjectColumnInput = {
  name: string;
  slug: string;
  position: number;
  isFinal: boolean;
};

export const DEFAULT_PROJECT_COLUMNS: readonly ProjectColumnInput[] = [
  { name: "To Do", slug: "to-do", position: 0, isFinal: false },
  { name: "In Progress", slug: "in-progress", position: 1, isFinal: false },
  { name: "In Review", slug: "in-review", position: 2, isFinal: false },
  { name: "Done", slug: "done", position: 3, isFinal: true },
] as const;

async function createProject(
  workspaceId: string,
  name: string,
  icon: string,
  slug: string,
  columns?: ProjectColumnInput[],
) {
  const columnsToInsert =
    columns && columns.length > 0 ? columns : DEFAULT_PROJECT_COLUMNS;

  return db.transaction(async (tx) => {
    const [createdProject] = await tx
      .insert(projectTable)
      .values({
        workspaceId,
        name,
        icon,
        slug,
      })
      .returning();

    if (createdProject) {
      for (const col of columnsToInsert) {
        await tx.insert(columnTable).values({
          projectId: createdProject.id,
          name: col.name,
          slug: col.slug,
          position: col.position,
          isFinal: col.isFinal,
        });
      }
    }

    return createdProject;
  });
}

export default createProject;
