import { useMutation, useQueryClient } from "@tanstack/react-query";
import startTimeEntry, {
  type StartTimeEntryRequest,
} from "@/fetchers/time-entry/start-time-entry";

function useStartTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartTimeEntryRequest) => startTimeEntry(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["time-entries", variables.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["time-entry", "active"] });
      queryClient.invalidateQueries({
        queryKey: ["activities", variables.taskId],
      });
    },
  });
}

export default useStartTimeEntry;
