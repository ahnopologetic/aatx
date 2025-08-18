import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import LoginForm from "@/components/login-form"
import { validateInvitation } from "@/app/api/organizations/invitations/validate/action"
import { acceptInvitation } from "@/app/api/organizations/invitations/accept/action"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined
  }>
}) {
  const params = await searchParams
  const user = await getUser()
  if (params?.token) {
    const token = params.token as string
    const data = await validateInvitation(token)
    if ('error' in data) {
      throw new Error("Invalid invitation token")
    }

    const acceptData = await acceptInvitation(token)
    if (acceptData.error == "Invite not pending") {
      console.warn(`Invite already accepted`)
    }
    else {
      throw new Error(`Failed to accept invitation: ${acceptData.error}`)
    }
  }

  if (user && user.id) {
    throw redirect("/dashboard")
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center mx-auto">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your AATX Analytics account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
