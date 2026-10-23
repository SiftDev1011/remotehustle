import { AdminSkeleton } from "@/components/skeletons/workspace";

export default function Loading() {
  return <AdminSkeleton filters={2} description={false} actions />;
}
