"use client"

import { useState, useCallback } from "react"
import { AatxCoderContainer } from "./aatx-coder-container"
import { ReviewData } from "./aatx-coder-review"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Link } from "lucide-react"

interface AatxCoderClientWrapperProps {
  trackingPlanId: string
  eventsToImplement: number
  repositoryName: string
  hasRepositories: boolean
}

export function AatxCoderClientWrapper({
  trackingPlanId,
  eventsToImplement,
  repositoryName,
  hasRepositories
}: AatxCoderClientWrapperProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const handleStartCoder = useCallback(async (planId: string) => {
    try {
      const response = await fetch('/api/ai/coder/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingPlanId: planId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start AATX Coder')
      }

      const result = await response.json()
      setCurrentSessionId(result.sessionId || crypto.randomUUID())

      // TODO: Start streaming logs
      // This would connect to the streaming endpoint and update the progress

    } catch (error) {
      console.error('Failed to start AATX Coder:', error)
      throw error
    }
  }, [])

  const handleStopCoder = useCallback(async () => {
    if (!currentSessionId) return

    try {
      // TODO: Implement stop functionality
      console.log('Stopping AATX Coder session:', currentSessionId)
      setCurrentSessionId(null)
    } catch (error) {
      console.error('Failed to stop AATX Coder:', error)
      throw error
    }
  }, [currentSessionId])

  const handleRunInBackground = useCallback(async () => {
    if (!currentSessionId) return

    try {
      // TODO: Implement background functionality
      console.log('Running AATX Coder in background:', currentSessionId)
    } catch (error) {
      console.error('Failed to run AATX Coder in background:', error)
      throw error
    }
  }, [currentSessionId])

  const handleApprovePR = useCallback(async (reviewData: ReviewData) => {
    try {
      // TODO: Implement PR creation
      console.log('Creating PR with review data:', reviewData)

      // Mock PR creation for now
      return {
        pullRequestUrl: `https://github.com/example/${repositoryName}/pull/123`,
        branchName: reviewData.branchName
      }
    } catch (error) {
      console.error('Failed to create PR:', error)
      throw error
    }
  }, [repositoryName])

  const handleRedoCoder = useCallback(async (planId: string, customPrompt?: string) => {
    try {
      const response = await fetch('/api/ai/coder/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingPlanId: planId,
          customPrompt,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to redo AATX Coder')
      }

      const result = await response.json()
      setCurrentSessionId(result.sessionId || crypto.randomUUID())

      // TODO: Start streaming logs

    } catch (error) {
      console.error('Failed to redo AATX Coder:', error)
      throw error
    }
  }, [])

  // Show repository connection required message if no repositories
  if (!hasRepositories) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
              <Link className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">Repository Required</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Connect a repository to this tracking plan to use AATX Coder for automatic implementation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show warning if no events to implement
  if (eventsToImplement === 0) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">No Events to Implement</h3>
              <p className="text-sm text-gray-700 mt-1">
                All events in this tracking plan are already implemented. AATX Coder will be available when new or updated events are detected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <AatxCoderContainer
      trackingPlanId={trackingPlanId}
      eventsToImplement={eventsToImplement}
      repositoryName={repositoryName}
      onStartCoder={handleStartCoder}
      onStopCoder={handleStopCoder}
      onRunInBackground={handleRunInBackground}
      onApprovePR={handleApprovePR}
      onRedoCoder={handleRedoCoder}
    />
  )
}
