import { AdminSkeleton } from "@/components/skeletons/workspace";

export default function Loading() {
  return <AdminSkeleton kind="stats" filters={1} />;
}
