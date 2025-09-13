"use client"

import { useState, useCallback } from "react"
import { AatxCoderButton } from "./aatx-coder-button"
import { AatxCoderProgress, LogEntry } from "./aatx-coder-progress"
import { AatxCoderReview, ReviewData } from "./aatx-coder-review"
import { AatxCoderSuccess } from "./aatx-coder-success"

type AatxCoderState = 'idle' | 'running' | 'background' | 'review' | 'creating-pr' | 'success'

interface AatxCoderContainerProps {
  trackingPlanId: string
  eventsToImplement: number
  repositoryName?: string
  onStartCoder: (planId: string) => Promise<void>
  onStopCoder: () => Promise<void>
  onRunInBackground: () => Promise<void>
  onApprovePR: (reviewData: ReviewData) => Promise<{ pullRequestUrl: string; branchName: string }>
  onRedoCoder: (planId: string, customPrompt?: string) => Promise<void>
}

export function AatxCoderContainer({
  trackingPlanId,
  eventsToImplement,
  repositoryName = "Repository",
  onStartCoder,
  onStopCoder,
  onRunInBackground,
  onApprovePR,
  onRedoCoder
}: AatxCoderContainerProps) {
  const [state, setState] = useState<AatxCoderState>('idle')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentStage, setCurrentStage] = useState('clone')
  const [progress, setProgress] = useState(0)
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [successData, setSuccessData] = useState<{
    pullRequestUrl: string
    branchName: string
  } | null>(null)

  const handleStartCoder = useCallback(async () => {
    setState('running')
    setLogs([])
    setProgress(0)
    setCurrentStage('clone')
    
    try {
      await onStartCoder(trackingPlanId)
    } catch (error) {
      console.error('Failed to start AATX Coder:', error)
      setState('idle')
    }
  }, [trackingPlanId, onStartCoder])

  const handleStopCoder = useCallback(async () => {
    try {
      await onStopCoder()
      setState('idle')
      setLogs([])
      setProgress(0)
    } catch (error) {
      console.error('Failed to stop AATX Coder:', error)
    }
  }, [onStopCoder])

  const handleRunInBackground = useCallback(async () => {
    try {
      await onRunInBackground()
      setState('background')
    } catch (error) {
      console.error('Failed to run AATX Coder in background:', error)
    }
  }, [onRunInBackground])

  const handleApprovePR = useCallback(async () => {
    if (!reviewData) return
    
    setState('creating-pr')
    try {
      const result = await onApprovePR(reviewData)
      setSuccessData(result)
      setState('success')
    } catch (error) {
      console.error('Failed to create PR:', error)
      setState('review')
    }
  }, [reviewData, onApprovePR])

  const handleRedo = useCallback(async () => {
    setState('running')
    setLogs([])
    setProgress(0)
    setCurrentStage('clone')
    
    try {
      await onRedoCoder(trackingPlanId)
    } catch (error) {
      console.error('Failed to redo AATX Coder:', error)
      setState('review')
    }
  }, [trackingPlanId, onRedoCoder])

  const handleRedoWithPrompt = useCallback(async (prompt: string) => {
    setState('running')
    setLogs([])
    setProgress(0)
    setCurrentStage('clone')
    
    try {
      await onRedoCoder(trackingPlanId, prompt)
    } catch (error) {
      console.error('Failed to redo AATX Coder with prompt:', error)
      setState('review')
    }
  }, [trackingPlanId, onRedoCoder])

  const handleSuccessClose = useCallback(() => {
    setState('idle')
    setReviewData(null)
    setSuccessData(null)
    setLogs([])
    setProgress(0)
  }, [])

  // These would be called by the parent component when receiving real-time updates
  const addLog = useCallback((log: LogEntry) => {
    setLogs(prev => [...prev, log])
  }, [])

  const updateProgress = useCallback((newProgress: number, stage?: string) => {
    setProgress(newProgress)
    if (stage) setCurrentStage(stage)
  }, [])

  const setReview = useCallback((data: ReviewData) => {
    setReviewData(data)
    setState('review')
  }, [])

  // Expose methods for parent component to call
  const methods = {
    addLog,
    updateProgress,
    setReview
  }

  // Render based on current state
  switch (state) {
    case 'idle':
      return (
        <AatxCoderButton
          eventsToImplement={eventsToImplement}
          onStartCoder={handleStartCoder}
          loading={false}
        />
      )

    case 'running':
      return (
        <AatxCoderProgress
          logs={logs}
          currentStage={currentStage}
          progress={progress}
          isRunning={true}
          onStop={handleStopCoder}
          onRunInBackground={handleRunInBackground}
        />
      )

    case 'background':
      return (
        <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <div>
              <h3 className="font-semibold text-blue-900">Running in Background</h3>
              <p className="text-sm text-blue-700">
                AATX Coder is working on your tracking plan. You'll be notified when the PR is ready for review.
              </p>
            </div>
          </div>
        </div>
      )

    case 'review':
    case 'creating-pr':
      return reviewData ? (
        <AatxCoderReview
          reviewData={reviewData}
          onApprove={handleApprovePR}
          onRedo={handleRedo}
          onRedoWithPrompt={handleRedoWithPrompt}
          isCreatingPR={state === 'creating-pr'}
        />
      ) : null

    case 'success':
      return (
        <>
          <div className="p-4 border rounded-lg bg-green-50 border-green-200">
            <div className="text-center">
              <h3 className="font-semibold text-green-900 mb-2">PR Created Successfully!</h3>
              <p className="text-sm text-green-700">
                Your analytics tracking events have been implemented and a pull request has been created.
              </p>
            </div>
          </div>
          {successData && (
            <AatxCoderSuccess
              isOpen={true}
              onClose={handleSuccessClose}
              pullRequestUrl={successData.pullRequestUrl}
              branchName={successData.branchName}
              eventsImplemented={eventsToImplement}
              repositoryName={repositoryName}
            />
          )}
        </>
      )

    default:
      return null
  }
}
