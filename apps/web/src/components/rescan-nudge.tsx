'use client'

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, GitCommit, Clock, X } from "lucide-react"
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
  onRescanClick?: () => void
  onDismiss?: () => void
}

export function RescanNudge({ repositoryId, onRescanClick, onDismiss }: RescanNudgeProps) {
  const [needsRescan, setNeedsRescan] = useState(false)
  const [commitInfo, setCommitInfo] = useState<{
    currentCommit?: CommitInfo
    lastScanCommit?: CommitInfo
    daysSinceLastScan?: number
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
              </div>
              
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {commitInfo.reason}
                {commitInfo.daysSinceLastScan !== undefined && (
                  <span className="block mt-1 text-sm">
                    Last scan was {commitInfo.daysSinceLastScan === 0 ? 'today' : `${commitInfo.daysSinceLastScan} days ago`}
                  </span>
                )}
              </AlertDescription>

              {commitInfo.currentCommit && (
                <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-md border border-amber-200 dark:border-amber-700">
                  <div className="flex items-center gap-2 text-sm">
                    <GitCommit className="h-3 w-3" />
                    <span className="font-mono text-xs">
                      {formatCommitHash(commitInfo.currentCommit.hash)}
                    </span>
                    <Clock className="h-3 w-3 ml-2" />
                    <span className="text-xs">
                      {formatRelativeTime(commitInfo.currentCommit.timestamp)}
                    </span>
                  </div>
                  {commitInfo.currentCommit.message && (
                    <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                      {commitInfo.currentCommit.message}
                    </p>
                  )}
                  {commitInfo.currentCommit.author && (
                    <p className="text-xs mt-1 text-amber-500 dark:text-amber-500">
                      by {commitInfo.currentCommit.author}
                    </p>
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
