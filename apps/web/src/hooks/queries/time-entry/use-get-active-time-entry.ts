import { useQuery } from "@tanstack/react-query";
import getActiveTimeEntry from "@/fetchers/time-entry/get-active-time-entry";

function useGetActiveTimeEntry() {
  return useQuery({
    queryKey: ["time-entry", "active"],
    queryFn: () => getActiveTimeEntry(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export default useGetActiveTimeEntry;
