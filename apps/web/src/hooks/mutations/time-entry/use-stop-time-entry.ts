import { useMutation, useQueryClient } from "@tanstack/react-query";
import stopTimeEntry from "@/fetchers/time-entry/stop-time-entry";

type StopTimeEntryVariables = {
  id?: string;
  taskId?: string;
};

function useStopTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: StopTimeEntryVariables = {}) => stopTimeEntry({ id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["time-entry", "active"] });
      if (variables?.taskId) {
        queryClient.invalidateQueries({
          queryKey: ["time-entries", variables.taskId],
        });
        queryClient.invalidateQueries({
          queryKey: ["activities", variables.taskId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      }
    },
  });
}

export default useStopTimeEntry;
