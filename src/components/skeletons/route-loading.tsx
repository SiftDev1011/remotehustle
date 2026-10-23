"use client";

import FaqLoading from "@/app/faq/loading";
import { SearchSkeleton } from "./search";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AboutSkeleton,
  AuthSkeleton,
  HomeSkeleton,
  JobDetailSkeleton,
  JobsSkeleton,
  PolicySkeleton,
  ProductSkeleton,
  ProgramsSkeleton,
  RegistrationSkeleton,
  ShopSkeleton,
} from "./public";
import {
  AdminSkeleton,
  ApplicationSkeleton,
  CheckoutSkeleton,
  OrdersSkeleton,
  JobFormSkeleton,
  ManagedFormSkeleton,
  ProfileSkeleton,
  WorkspaceShellSkeleton,
  WorkspaceSkeleton,
} from "./workspace";

export function ManagedLoading() {
  const edit = useSearchParams().has("edit");
  const section = usePathname().split("/").at(-1) || "";
  if (edit) return <ManagedFormSkeleton section={section} />;
  return (
    <AdminSkeleton kind="records" description={false} filters={1} actions />
  );
}

// The root fallback also covers asynchronous admin/workspace layouts on first
// entry. Page-level loading files below them select the destination explicitly.
export default function RouteLoading() {
  const path = usePathname();
  if (path.startsWith("/admin"))
    return (
      <WorkspaceShellSkeleton admin>
        {path === "/admin" ? (
          <AdminSkeleton kind="overview" />
        ) : path === "/admin/users" ? (
          <AdminSkeleton kind="users" filters={2} description={false} />
        ) : path.startsWith("/admin/users/") ? (
          <ProfileSkeleton admin />
        ) : path.startsWith("/admin/jobs/") ? (
          <JobFormSkeleton />
        ) : path.startsWith("/admin/orders/") ? (
          <CheckoutSkeleton />
        ) : path === "/admin/content" ? (
          <AdminSkeleton kind="content" />
        ) : path === "/admin/lists" ? (
          <AdminSkeleton kind="lists" />
        ) : path === "/admin/analytics" || path === "/admin/operations" ? (
          <AdminSkeleton kind="stats" />
        ) : (
          <AdminSkeleton />
        )}
      </WorkspaceShellSkeleton>
    );
  if (path.startsWith("/workspace"))
    return (
      <WorkspaceShellSkeleton>
        {path.includes("/orders/") ? (
          <CheckoutSkeleton />
        ) : path.endsWith("/orders") ? (
          <OrdersSkeleton />
        ) : path.endsWith("/profile") ? (
          <ProfileSkeleton />
        ) : path.endsWith("/applications") ? (
          <ApplicationSkeleton />
        ) : (
          <WorkspaceSkeleton />
        )}
      </WorkspaceShellSkeleton>
    );
  if (path === "/") return <HomeSkeleton />;
  if (path === "/faq") return <FaqLoading />;
  if (path === "/search") return <SearchSkeleton />;
  if (path === "/jobs") return <JobsSkeleton />;
  if (path.startsWith("/jobs/")) return <JobDetailSkeleton />;
  if (path === "/shop") return <ShopSkeleton />;
  if (path.startsWith("/shop/")) return <ProductSkeleton />;
  if (path.startsWith("/buy/")) return <ProductSkeleton buy />;
  if (path === "/cart") return <CheckoutSkeleton cart />;
  if (path === "/programs") return <ProgramsSkeleton />;
  if (path === "/about") return <AboutSkeleton />;
  if (path === "/registration") return <RegistrationSkeleton />;
  if (path === "/privacy" || path === "/terms") return <PolicySkeleton />;
  return (
    <AuthSkeleton
      signup={path === "/sign-up"}
      description={path !== "/sign-in"}
      fields={["/forgot-password", "/verify-email"].includes(path) ? 1 : 2}
    />
  );
}
