"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Github, Check, Zap, Crown } from "lucide-react"
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
              href="#how-it-works"
              className="flex items-center text-sm md:text-base font-medium transition-all min-h-[44px] px-4 py-2 rounded-md touch-manipulation bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:to-pink-600 hover:scale-105"
            >
              How it works
            </Link>
            <Link href="#pricing" className="flex items-center text-sm md:text-base font-medium transition-colors hover:text-foreground/80 min-h-[44px] px-4 py-2 rounded-md touch-manipulation">
              Pricing
            </Link>
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
        <section id="how-it-works" className="w-full">
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
        <Separator />
        <section id="pricing" className="container flex flex-col items-center justify-center space-y-8 py-8 md:py-12 lg:py-24 px-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              Start for free and upgrade when you need more power
            </p>
          </div>
          <div className="grid w-full max-w-4xl grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Free Plan */}
            <div className="relative overflow-hidden rounded-xl border bg-background p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    <h3 className="text-xl font-bold">Free</h3>
                  </div>
                  <Badge variant="outline">Perfect for getting started</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Forever free</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>3 AATX Coder uses per month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>1 tracking plan</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>5 repositories</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Community support</span>
                  </div>
                </div>
                <Link href="/signup" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      posthog.capture("landing_page_pricing_free_signup: clicked")
                    }}
                  >
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-xl border-2 border-primary bg-gradient-to-b from-background to-muted/20 p-6 shadow-lg">
              <div className="absolute -top-3 left-6">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    <h3 className="text-xl font-bold">Pro</h3>
                  </div>
                  <Badge variant="secondary">For teams</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$29</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">$290/year (save $58)</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span><strong>Unlimited</strong> AATX Coder usage</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span><strong>Unlimited</strong> tracking plans</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span><strong>Unlimited</strong> repositories</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Priority support</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Advanced integrations</span>
                  </div>
                </div>
                <Link href="/signup" className="w-full">
                  <Button
                    className="w-full"
                    onClick={() => {
                      posthog.capture("landing_page_pricing_pro_signup: clicked")
                    }}
                  >
                    Start Pro Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline"
                onClick={() => {
                  posthog.capture("landing_page_pricing_login: clicked")
                }}
              >
                Sign in to view pricing
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
