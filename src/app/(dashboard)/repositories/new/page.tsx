import MultiStepForm from "@/components/ui/multistep-form";
import AuthedMultiStepForm from "@/components/ui/multistep-form-authed";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { getUser } from "@/lib/auth";

export default async function NewRepositoryPage() {
  const user = await getUser();
  return (
    <DashboardShell>
      <DashboardHeader heading="Add Repository" text="Scan and save a repository with its events." />
      <div className="max-w-5xl">
        {user ? <AuthedMultiStepForm user={user} /> : <MultiStepForm />}
      </div>
    </DashboardShell>
  )
}


