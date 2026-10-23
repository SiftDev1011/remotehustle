import { AdminSkeleton } from "@/components/skeletons/workspace";

export default function Loading() {
  return <AdminSkeleton kind="users" filters={2} description={false} />;
}
