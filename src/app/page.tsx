import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import LandingPage from "@/components/landing-page"

export default async function Home() {
  try {
    const session = await getSession()

    if (session) {
      throw redirect("/dashboard")
    }
  } catch (error) {
    console.error("Session error:", error)
    // Don't redirect if there's an error, just show the landing page
  }

  return <LandingPage />
}
