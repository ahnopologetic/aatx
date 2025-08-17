"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { Github } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${window.location.origin}/dashboard` } })
    if (error) {
      console.error("Error signing in:", error)
    } else {
      router.push(data.url ?? "/dashboard")
    }
    setIsLoading(false)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>Sign in to your account to access your analytics dashboard</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button onClick={handleLogin} disabled={isLoading} className="w-full min-h-[44px] touch-manipulation">
          <Github className="mr-2 h-4 w-4" />
          {isLoading ? "Signing in..." : "Sign in with GitHub"}
        </Button>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardFooter>
    </Card>
  )
}
