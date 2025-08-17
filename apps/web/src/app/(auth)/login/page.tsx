import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import LoginForm from "@/components/login-form"

export default async function LoginPage() {
  const user = await getUser()

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
