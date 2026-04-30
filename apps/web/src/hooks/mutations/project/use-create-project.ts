import { useMutation } from "@tanstack/react-query";
import createProject from "@/fetchers/project/create-project";

type CreateProjectColumn = {
  name: string;
  slug: string;
  position: number;
  isFinal: boolean;
};

function useCreateProject({
  name,
  slug,
  workspaceId,
  icon,
  columns,
}: {
  name: string;
  slug: string;
  workspaceId: string;
  icon: string;
  columns?: CreateProjectColumn[];
}) {
  return useMutation({
    mutationFn: () => createProject({ name, slug, workspaceId, icon, columns }),
  });
}

export default useCreateProject;
