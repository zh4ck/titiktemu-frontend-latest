import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUmkmSelfReports, submitUmkmSelfReport } from "@/app/lib/api";
import type { UmkmSelfReportInput } from "@/app/types/self-report";

/** UMKM-side: submit the self-tracker survey form. */
export function useSubmitSelfReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UmkmSelfReportInput) => submitUmkmSelfReport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umkm-self-reports"] });
    },
  });
}

/** Operator-side: list submitted self-reports for review. */
export function useSelfReports() {
  return useQuery({
    queryKey: ["umkm-self-reports"],
    queryFn: () => fetchUmkmSelfReports(),
  });
}
