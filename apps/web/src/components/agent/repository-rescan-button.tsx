'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import posthog from "posthog-js"

type RepositoryRescanButtonProps = {
  repositoryId?: string
  onRescanComplete?: () => void
}

export const RepositoryRescanButton = ({ 
  repositoryId, 
  onRescanComplete 
}: RepositoryRescanButtonProps) => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ newEvents: number, updatedEvents: number } | null>(null)

  const handleRescan = async () => {
    if (!repositoryId) {
      toast.error('Repository ID is required')
      return
    }

    posthog.capture('repository_rescan_button: clicked')
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/repositories/${repositoryId}/rescan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to start rescan')
      }

      const data = await response.json()
      
      // Show success message
      toast.success('Rescan started successfully! You will receive an email when it completes.')
      
      // Update result if available
      if (data.result) {
        setResult(data.result)
      }

      // Call completion callback
      if (onRescanComplete) {
        onRescanComplete()
      }

    } catch (error) {
      console.error('Rescan failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start rescan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="outline"
        onClick={handleRescan}
        disabled={loading || !repositoryId}
        className="flex items-center gap-2 w-full"
      >
        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        {loading ? "Starting Rescan..." : "Rescan"}
      </Button>
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="text-sm text-muted-foreground mt-1"
          >
            {result.newEvents} new events, {result.updatedEvents} updated events
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}