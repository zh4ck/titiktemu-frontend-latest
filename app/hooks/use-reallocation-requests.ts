import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchReallocationRequests,
  reviewReallocationRequest,
  submitReallocationRequest,
} from "@/app/lib/api";
import type { ReallocationRequestInput, ReallocationRequestStatus } from "@/app/types/reallocation-request";

/** UMKM-side: submit a request to relocate to a chosen candidate zone. */
export function useSubmitReallocationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReallocationRequestInput) => submitReallocationRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reallocation-requests"] });
    },
  });
}

/** Operator-side: list submitted requests for review. */
export function useReallocationRequests(status?: ReallocationRequestStatus) {
  return useQuery({
    queryKey: ["reallocation-requests", status],
    queryFn: () => fetchReallocationRequests(status),
  });
}

/** Operator-side: approve/reject a request. */
export function useReviewReallocationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Extract<ReallocationRequestStatus, "approved" | "rejected"> }) =>
      reviewReallocationRequest(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reallocation-requests"] });
    },
  });
}
