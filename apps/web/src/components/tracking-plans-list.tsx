"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart, Search, AlertCircle } from "lucide-react"
import { Database } from "@/lib/database.types"
import { NoOrganizationAccess } from "@/components/no-organization-access"
import { NewTrackingPlanDialog } from "@/components/new-tracking-plan-dialog"

export function TrackingPlansList() {
  const [trackingPlans, setTrackingPlans] = useState<Database["public"]["Tables"]["plans"]["Row"][]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [hasOrgAccess, setHasOrgAccess] = useState(true)

  useEffect(() => {
    const fetchTrackingPlans = async () => {
      try {
        const response = await fetch("/api/tracking-plans")
        const data = await response.json()
        
        if (!response.ok) {
          if (response.status === 403 || data.error?.includes("organization")) {
            setHasOrgAccess(false)
            return
          }
          throw new Error(data.error || "Failed to fetch tracking plans")
        }
        
        setTrackingPlans(data.trackingPlans || [])
        setHasOrgAccess(true)
      } catch (error) {
        console.error("Failed to fetch tracking plans:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch tracking plans")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrackingPlans()
  }, [])

  const filteredTrackingPlans = trackingPlans.filter((plan) =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle organization access issues
  if (!hasOrgAccess) {
    return <NoOrganizationAccess message="You need organization access to view tracking plans." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tracking plans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 md:w-[300px]"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <p>Loading tracking plans...</p>
      ) : filteredTrackingPlans.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center justify-center text-center">
              <BarChart className="h-8 w-8 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No tracking plans found</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Create a tracking plan to get started"}
              </p>
              <NewTrackingPlanDialog onSuccess={() => window.location.reload()}>
                <Button>New Tracking Plan</Button>
              </NewTrackingPlanDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrackingPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>Version {plan.version}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p>Last updated: {new Date(plan.updated_at || "").toLocaleDateString()}</p>
                  <p>Events: {plan.description}</p>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/tracking-plans/${plan.id}`} className="w-full">
                  <Button variant="outline" className="w-full bg-transparent">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
