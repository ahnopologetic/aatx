import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import LoginForm from "@/components/login-form"

export default async function LoginPage() {
  const user = await getUser()

  if (user && user.id) {
    throw redirect("/dashboard")
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <LoginForm />
    </div>
  )
}
