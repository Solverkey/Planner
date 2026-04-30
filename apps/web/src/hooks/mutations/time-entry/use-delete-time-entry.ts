import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteTimeEntry from "@/fetchers/time-entry/delete-time-entry";

type DeleteTimeEntryVariables = {
  id: string;
  taskId?: string;
};

function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteTimeEntryVariables) => deleteTimeEntry(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["time-entry", "active"] });
      if (variables.taskId) {
        queryClient.invalidateQueries({
          queryKey: ["time-entries", variables.taskId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      }
    },
  });
}

export default useDeleteTimeEntry;
