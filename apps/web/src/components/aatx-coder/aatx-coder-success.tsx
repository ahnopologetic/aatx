"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ExternalLink, GitPullRequest, Copy } from "lucide-react"
import { useState } from "react"

interface AatxCoderSuccessProps {
  isOpen: boolean
  onClose: () => void
  pullRequestUrl: string
  branchName: string
  eventsImplemented: number
  repositoryName: string
}

export function AatxCoderSuccess({
  isOpen,
  onClose,
  pullRequestUrl,
  branchName,
  eventsImplemented,
  repositoryName
}: AatxCoderSuccessProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pullRequestUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const handleViewPR = () => {
    window.open(pullRequestUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl">Pull Request Created Successfully!</DialogTitle>
          <DialogDescription className="text-center">
            AATX Coder has successfully implemented your analytics tracking events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-green-900">Implementation Summary</h4>
              <Badge className="bg-green-100 text-green-700">
                {eventsImplemented} events
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-green-800">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4" />
                <span className="font-medium">Repository:</span>
                <span>{repositoryName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-600 rounded-full flex-shrink-0" />
                <span className="font-medium">Branch:</span>
                <code className="bg-white px-2 py-1 rounded text-xs">{branchName}</code>
              </div>
            </div>
          </div>

          {/* Pull Request URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Pull Request URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-gray-50 border rounded text-sm font-mono truncate">
                {pullRequestUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="flex-shrink-0"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleViewPR}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Pull Request
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-900 mb-2">Next Steps</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Review the code changes in the pull request</li>
              <li>• Test the analytics implementation in your staging environment</li>
              <li>• Merge the pull request when ready</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
