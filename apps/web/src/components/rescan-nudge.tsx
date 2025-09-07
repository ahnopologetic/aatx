'use client'

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, GitCommit, Clock, X, Github, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface CommitInfo {
  hash: string
  timestamp: string
  message?: string
  author?: string
}

interface RescanNudgeProps {
  repositoryId: string
  repositoryUrl?: string
  onRescanClick?: () => void
  onDismiss?: () => void
}

export function RescanNudge({ repositoryId, repositoryUrl, onRescanClick, onDismiss }: RescanNudgeProps) {
  const [needsRescan, setNeedsRescan] = useState(false)
  const [commitInfo, setCommitInfo] = useState<{
    currentCommit?: CommitInfo
    lastScanCommit?: CommitInfo
    daysSinceLastScan?: number
    commitsAhead?: number
    reason?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  const checkForChanges = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/repositories/${repositoryId}/commits/check`)

      if (response.ok) {
        const data = await response.json()
        setNeedsRescan(data.needsRescan)
        setCommitInfo({
          currentCommit: data.currentCommit,
          lastScanCommit: data.lastScanCommit,
          daysSinceLastScan: data.daysSinceLastScan,
          commitsAhead: data.commitsAhead,
          reason: data.reason
        })
      } else {
        console.error('Failed to check for changes:', response.statusText)
      }
    } catch (error) {
      console.error('Error checking for changes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkForChanges()
  }, [repositoryId])

  const handleRescan = () => {
    if (onRescanClick) {
      onRescanClick()
    }
    // Optionally dismiss the nudge after rescan is triggered
    setDismissed(true)
  }

  const handleDismiss = () => {
    setDismissed(true)
    if (onDismiss) {
      onDismiss()
    }
  }

  const formatCommitHash = (hash: string) => {
    return hash.substring(0, 7)
  }

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  const getGitHubUrl = () => {
    if (!repositoryUrl) return null

    // Extract owner/repo from GitHub URL
    const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (match) {
      const [, owner, repo] = match
      return `https://github.com/${owner}/${repo}`
    }
    return null
  }

  const getCommitUrl = (commitHash: string) => {
    const githubUrl = getGitHubUrl()
    if (!githubUrl) return null
    return `${githubUrl}/commit/${commitHash}`
  }

  const handleGitHubClick = () => {
    const githubUrl = getGitHubUrl()
    if (githubUrl) {
      window.open(githubUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCommitClick = (commitHash: string) => {
    const commitUrl = getCommitUrl(commitHash)
    if (commitUrl) {
      window.open(commitUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading || dismissed || !needsRescan || !commitInfo) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Repository has new changes
                </span>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Rescan Recommended
                </Badge>
                {getGitHubUrl() && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGitHubClick}
                    className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                    title="Open GitHub repository"
                  >
                    <Github className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {commitInfo.reason}
                {commitInfo.commitsAhead !== undefined && commitInfo.commitsAhead > 0 && (
                  <span className="block mt-1 text-sm font-medium">
                    {commitInfo.commitsAhead} new commit{commitInfo.commitsAhead > 1 ? 's' : ''} since last scan
                  </span>
                )}
                {commitInfo.daysSinceLastScan !== undefined && (
                  <span className="block mt-1 text-sm">
                    Last scan was {commitInfo.daysSinceLastScan === 0 ? 'today' : `${commitInfo.daysSinceLastScan} days ago`}
                  </span>
                )}
              </AlertDescription>

              {commitInfo.currentCommit && (
                <div className="mt-3 space-y-2">
                  {/* Current Commit */}
                  <div className="p-3 bg-white/50 dark:bg-black/20 rounded-md border border-amber-200 dark:border-amber-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <GitCommit className="h-3 w-3" />
                        <span className="font-mono text-xs">
                          {formatCommitHash(commitInfo.currentCommit.hash)}
                        </span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span className="text-xs">
                          {formatRelativeTime(commitInfo.currentCommit.timestamp)}
                        </span>
                        <Badge variant="outline" className="text-xs px-1 py-0 text-green-600 border-green-300">
                          Current
                        </Badge>
                      </div>
                      {getCommitUrl(commitInfo.currentCommit.hash) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCommitClick(commitInfo.currentCommit!.hash)}
                          className="h-5 w-5 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                          title="View commit on GitHub"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {commitInfo.currentCommit.message && (
                      <p className="text-xs mt-2 text-amber-600 dark:text-amber-400 overflow-hidden" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {commitInfo.currentCommit.message}
                      </p>
                    )}
                    {commitInfo.currentCommit.author && (
                      <p className="text-xs mt-1 text-amber-500 dark:text-amber-500">
                        by {commitInfo.currentCommit.author}
                      </p>
                    )}
                  </div>

                  {/* Last Scan Commit (if available) */}
                  {commitInfo.lastScanCommit && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <GitCommit className="h-3 w-3 text-gray-500" />
                          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {formatCommitHash(commitInfo.lastScanCommit.hash)}
                          </span>
                          <Clock className="h-3 w-3 ml-2 text-gray-500" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {formatRelativeTime(commitInfo.lastScanCommit.timestamp)}
                          </span>
                          <Badge variant="outline" className="text-xs px-1 py-0 text-gray-600 border-gray-300">
                            Last Scan
                          </Badge>
                        </div>
                        {getCommitUrl(commitInfo.lastScanCommit.hash) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCommitClick(commitInfo.lastScanCommit!.hash)}
                            className="h-5 w-5 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="View commit on GitHub"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {commitInfo.lastScanCommit.message && (
                        <p className="text-xs mt-2 text-gray-600 dark:text-gray-400 overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {commitInfo.lastScanCommit.message}
                        </p>
                      )}
                      {commitInfo.lastScanCommit.author && (
                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-500">
                          by {commitInfo.lastScanCommit.author}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Button
                size="sm"
                onClick={handleRescan}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Rescan Now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Alert>
      </motion.div>
    </AnimatePresence>
  )
}
