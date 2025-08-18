"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

interface InvitationData {
  organizationName: string
  inviterName: string
  inviterEmail: string
  isValid: boolean
  token: string
}

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = searchParams?.get('token')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [invitationLoading, setInvitationLoading] = useState(!!invitationToken)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Load invitation data if token is provided
  useEffect(() => {
    if (invitationToken) {
      loadInvitationData(invitationToken)
    }
  }, [invitationToken])

  const loadInvitationData = async (token: string) => {
    setInvitationLoading(true)
    try {
      const response = await fetch(`/api/organizations/invitations/validate?token=${token}`)
      const data = await response.json()

      if (response.ok && data.valid) {
        setInvitation({
          organizationName: data.organizationName,
          inviterName: data.inviterName,
          inviterEmail: data.inviterEmail,
          isValid: true,
          token
        })
        // Pre-fill email if it's in the invitation
        if (data.email) {
          setFormData(prev => ({ ...prev, email: data.email }))
        }
      } else {
        setError(data.error || 'Invalid or expired invitation link')
      }
    } catch (err) {
      setError('Failed to validate invitation')
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/confirm`
        }
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // If there's an invitation token, accept it
      if (invitationToken && invitation?.isValid) {
        const acceptResponse = await fetch('/api/organizations/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: invitationToken })
        })

        const acceptData = await acceptResponse.json()

        if (!acceptResponse.ok) {
          console.warn('Failed to accept invitation:', acceptData.error)
          // Don't fail the signup if invitation acceptance fails
        }
      }

      setSuccess(true)

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  if (invitationLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Validating invitation...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">Account Created Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                {invitation ? `Welcome to ${invitation.organizationName}!` : 'Welcome to AATX Analytics!'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                An email has been sent to your inbox with a link to verify your account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-4">
      <CardContent className="pt-6">
        {invitation && (
          <Alert className="mb-6">
            <AlertDescription>
              <div className="font-semibold text-sm mb-1">Organization Invitation</div>
              <strong>{invitation.inviterName}</strong> ({invitation.inviterEmail}) invited you to join{" "}
              <strong>{invitation.organizationName}</strong>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignup} className="space-y-4">

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="min-h-[44px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="min-h-[44px]"
              disabled={!!invitation} // Disable if email is from invitation
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Choose a password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="min-h-[44px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="min-h-[44px]"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full min-h-[44px] touch-manipulation" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              invitation ? 'Accept Invitation & Create Account' : 'Create Account'
            )}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Button variant="link" className="text-primary hover:underline" onClick={() => router.push(`/login?${searchParams?.toString()}`)}>
              Sign in
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
