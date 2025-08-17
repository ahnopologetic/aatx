"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, UserPlus, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface NoOrganizationAccessProps {
  message?: string
  showCreateOption?: boolean
}

export function NoOrganizationAccess({
  message = "You don't have access to any organizations or no organization is selected.",
  showCreateOption = true
}: NoOrganizationAccessProps) {
  return (
    <div className="container flex h-[60vh] w-full flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>No Organization Access</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You need to be a member of an organization to access this feature.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {showCreateOption && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Create a new organization to get started:
                </p>
                <Button className="w-full" asChild>
                  <Link href="/dashboard">
                    <Building2 className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Or ask your team admin to invite you:
              </p>
              <div className="text-xs text-muted-foreground bg-muted rounded p-2">
                Your admin can send you an invitation email from their organization management page.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
