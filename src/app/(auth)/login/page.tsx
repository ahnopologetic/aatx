import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import LoginForm from "@/components/login-form"

export default async function LoginPage() {
  const session = await getSession()

  if (!!session) {
    throw redirect("/dashboard")
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <LoginForm />
    </div>
  )
}
