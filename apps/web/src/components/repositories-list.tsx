"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GitBranch, Search, AlertCircle } from "lucide-react"
import { Database } from "@/lib/database.types"
import { NoOrganizationAccess } from "@/components/no-organization-access"
import Link from "next/link"

type Repository = Database["public"]["Tables"]["repos"]["Row"]

export function RepositoriesList() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [hasOrgAccess, setHasOrgAccess] = useState(true)

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await fetch("/api/repositories")
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 403 || data.error?.includes("organization")) {
            setHasOrgAccess(false)
            return
          }
          throw new Error(data.error || "Failed to fetch repositories")
        }

        setRepositories(data.repositories || [])
        setHasOrgAccess(true)
      } catch (error) {
        console.error("Failed to fetch repositories:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch repositories")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRepositories()
  }, [])

  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle organization access issues
  if (!hasOrgAccess) {
    return <NoOrganizationAccess message="You need organization access to view repositories." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
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
        <p>Loading repositories...</p>
      ) : filteredRepositories.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center justify-center text-center">
              <GitBranch className="h-8 w-8 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No repositories found</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Add a repository to get started"}
              </p>
              <Link href="/repositories/new">
                <Button>Add Repository</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRepositories.map((repo) => (
            <Card key={repo.id}>
              <CardHeader>
                <CardTitle>{repo.name}</CardTitle>
                <CardDescription>{repo.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p>Last scanned: {new Date(repo.updated_at || "").toLocaleDateString()}</p>
                  <p>Events detected: {repo.description}</p>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/repositories/${repo.id}`} className="w-full">
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
