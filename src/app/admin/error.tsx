"use client";
import { PageFailure } from "@/components/page-failure";
export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <PageFailure retry={retry} workspace />;
}
