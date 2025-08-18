"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Database } from "@/lib/database.types"
import { createClient } from "@/utils/supabase/client"

type ProfileFormProps = {
  profile: Database['public']['Tables']['profiles']['Row']
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [name, setName] = useState(profile.name ?? '')
  const [email, setEmail] = useState(profile.email ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.from('profiles').update({
      name,
      email,
    }).eq('id', profile.id)

    if (error) {
      toast.error("Failed to update profile", {
        description: error.message,
      })
    }

    setTimeout(() => {
      setIsLoading(false)
      toast.success("Profile updated", {
        description: "Your profile has been updated successfully.",
      })
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal information and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue={profile.name ?? ''} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={profile?.email ?? ''} disabled onChange={(e) => setEmail(e.target.value)} />
            <p className="text-xs text-muted-foreground">Your email is managed by GitHub and cannot be changed here.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
