import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"
import MultiStepForm from "@/components/ui/multistep-form"
import { Separator } from "./ui/separator"
import posthog from "posthog-js"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <header className="container z-40 bg-background">
        <div className="flex h-20 items-center justify-between py-6">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block">AATX Analytics</span>
            </Link>
          </div>
          <nav className="flex gap-6">
            <Link
              href="/login"
              className="flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center">
        <section className="w-full flex flex-col items-center justify-center space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="text-3xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">Don&apos;t bother to add tracking code manually</h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Scan your repositories, create tracking plans, and generate code with AI assistance. All in one platform.
            </p>
            <div className="space-x-4">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  <Github className="h-5 w-5" />
                  Sign in with GitHub
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <Separator />
        <section>
          <div className="container flex flex-col items-center justify-center space-y-6 py-8 md:py-12 lg:py-24">
            <MultiStepForm />
          </div>
        </section>
        <Separator />
        <section className="container flex flex-col items-center justify-center space-y-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Repository Scanning</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically scan your repositories to detect analytics events.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Tracking Plans</h3>
                  <p className="text-sm text-muted-foreground">
                    Create and manage versioned tracking plans for your analytics.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">AI-Powered Code Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate implementation code and create PRs automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
