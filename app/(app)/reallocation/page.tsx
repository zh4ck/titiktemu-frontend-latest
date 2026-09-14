import { Suspense } from "react";
import ReallocationView from "@/app/modules/reallocation/reallocation-view";

export default function ReallocationPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading...</p>}>
      <ReallocationView />
    </Suspense>
  );
}
