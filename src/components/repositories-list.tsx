"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { GitBranch, Search } from "lucide-react"

export function RepositoriesList() {
  const [repositories, setRepositories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        // In a real app, this would fetch from your API
        const response = await fetch("/api/repositories")
        const data = await response.json()
        setRepositories(data.repositories || [])
      } catch (error) {
        console.error("Failed to fetch repositories:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRepositories()
  }, [])

  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.owner.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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
              <Button>Add Repository</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRepositories.map((repo) => (
            <Card key={repo.id}>
              <CardHeader>
                <CardTitle>{repo.name}</CardTitle>
                <CardDescription>{repo.owner}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p>Last scanned: {new Date(repo.lastScanned).toLocaleDateString()}</p>
                  <p>Events detected: {repo.eventsCount}</p>
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
