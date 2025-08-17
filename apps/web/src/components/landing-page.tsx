"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"
import MultiStepForm from "@/components/ui/multistep-form/index"
import { Separator } from "@/components/ui/separator"
import { posthog } from "posthog-js"


export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <header className="container z-40 bg-background">
        <div className="flex h-16 md:h-20 items-center justify-between py-4 md:py-6 px-4 md:px-8">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-lg md:text-xl">AATX Analytics</span>
            </Link>
          </div>
          <nav className="flex gap-4 md:gap-6">
            <Link
              href="/login"
              className="flex items-center text-sm md:text-base font-medium transition-colors hover:text-foreground/80 min-h-[44px] px-4 py-2 rounded-md touch-manipulation"
              onClick={() => {
                posthog.capture("landing_page_top_nav_login: clicked")
              }}
            >
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center">
        <section className="w-full flex flex-col items-center justify-center space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32 px-4">
          <div className="container flex max-w-[64rem] flex-col items-center gap-6 text-center">
            <h1 className="text-2xl font-bold sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight">Don&apos;t bother to add tracking code manually</h1>
            <p className="max-w-[42rem] px-4 leading-relaxed text-muted-foreground text-base sm:text-lg md:text-xl sm:leading-8">
              Scan your repositories, create tracking plans, and generate code with AI assistance. All in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
              <Link
                href="/login"
                onClick={() => {
                  posthog.capture("landing_page_sign_in_with_github: clicked")
                }}
                className="w-full sm:w-auto"
              >
                <Button size="lg" className="gap-2 min-h-[44px] w-full sm:w-auto touch-manipulation text-base px-8 py-3">
                  <Github className="h-5 w-5" />
                  Sign in with GitHub
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <Separator />
        <section className="w-full">
          <div className="flex flex-col items-center justify-center space-y-6 py-8 md:py-12 lg:py-24 px-4">
            <MultiStepForm />
          </div>
        </section>
        <Separator />
        <section className="container flex flex-col items-center justify-center space-y-6 py-8 md:py-12 lg:py-24 px-4">
          <div className="mx-auto grid justify-center gap-6 w-full max-w-6xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2 hover:shadow-lg transition-shadow">
              <div className="flex h-auto min-h-[160px] md:h-[180px] flex-col justify-between rounded-md p-4 md:p-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">Repository Scanning</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Automatically scan your repositories to detect analytics events.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2 hover:shadow-lg transition-shadow">
              <div className="flex h-auto min-h-[160px] md:h-[180px] flex-col justify-between rounded-md p-4 md:p-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">Tracking Plans</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Create and manage versioned tracking plans for your analytics.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2 hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
              <div className="flex h-auto min-h-[160px] md:h-[180px] flex-col justify-between rounded-md p-4 md:p-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">AI-Powered Code Generation</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
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
