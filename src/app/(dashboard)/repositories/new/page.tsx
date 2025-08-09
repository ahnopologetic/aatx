"use client"

import MultiStepForm from "@/components/ui/multistep-form";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";

export default function NewRepositoryPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Add Repository" text="Scan and save a repository with its events." />
      <div className="max-w-5xl">
        <MultiStepForm />
      </div>
    </DashboardShell>
  )
}


