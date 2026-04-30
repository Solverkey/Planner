import { useQuery } from "@tanstack/react-query";
import getMyTasks from "@/fetchers/task/get-my-tasks";

function useGetMyTasks(enabled = true) {
  return useQuery({
    queryKey: ["tasks", "me"],
    queryFn: () => getMyTasks(),
    enabled,
    staleTime: 30_000,
  });
}

export default useGetMyTasks;
