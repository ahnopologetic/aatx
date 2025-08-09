import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import LandingPage from "@/components/landing-page"

export default async function Home() {
  const user = await getUser()

  if (!!user) {
    redirect("/dashboard")
  }

  return <LandingPage />
}
