import React, { Suspense } from "react";
import { CustomerExperience } from "@/components/CustomerExperience";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const dynamic = "force-dynamic";

export default function OrderPage({
  searchParams,
}: {
  searchParams?: { table?: string };
}) {
  const tableParam = searchParams?.table || "T12";
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-obsidian" />}>
        <CustomerExperience initialTableParam={tableParam} />
      </Suspense>
    </ErrorBoundary>
  );
}
