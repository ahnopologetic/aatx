"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  CheckCircle, 
  GitPullRequest, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Plus,
  Minus,
  ExternalLink
} from "lucide-react"

export type CodeEdit = {
  filePath: string
  anchorPattern: string
  snippetPreview: string
  changeType: 'addition' | 'modification' | 'creation'
  linesAdded: number
  linesRemoved?: number
}

export type ImplementedEvent = {
  name: string
  description?: string
  properties?: Record<string, any>
  status: 'implemented' | 'modified' | 'error'
}

export type ReviewData = {
  rootPath: string
  provider: 'posthog' | 'mixpanel' | 'segment' | 'amplitude' | 'ga4' | 'unknown'
  edits: CodeEdit[]
  events: ImplementedEvent[]
  branchName: string
  notes?: string[]
}

interface AatxCoderReviewProps {
  reviewData: ReviewData
  onApprove: () => void
  onRedo: () => void
  onRedoWithPrompt: (prompt: string) => void
  isCreatingPR?: boolean
}

export function AatxCoderReview({
  reviewData,
  onApprove,
  onRedo,
  onRedoWithPrompt,
  isCreatingPR = false
}: AatxCoderReviewProps) {
  const [showRedoPrompt, setShowRedoPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const toggleFileExpansion = (filePath: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath)
    } else {
      newExpanded.add(filePath)
    }
    setExpandedFiles(newExpanded)
  }

  const handleRedoWithPrompt = () => {
    if (customPrompt.trim()) {
      onRedoWithPrompt(customPrompt.trim())
      setCustomPrompt("")
      setShowRedoPrompt(false)
    }
  }

  const getEventStatusColor = (status: ImplementedEvent['status']) => {
    switch (status) {
      case 'implemented':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'modified':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getChangeTypeIcon = (changeType: CodeEdit['changeType']) => {
    switch (changeType) {
      case 'addition':
        return <Plus className="w-4 h-4 text-green-600" />
      case 'modification':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'creation':
        return <Plus className="w-4 h-4 text-purple-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review Changes</h2>
          <p className="text-muted-foreground">
            Review the proposed code changes before creating a pull request
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onRedo}
            disabled={isCreatingPR}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Redo
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowRedoPrompt(!showRedoPrompt)}
            disabled={isCreatingPR}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Redo with Prompt
          </Button>
          <Button 
            onClick={onApprove}
            disabled={isCreatingPR}
            className="bg-green-600 hover:bg-green-700"
          >
            {isCreatingPR ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating PR...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Create PR
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Custom Prompt Input */}
      {showRedoPrompt && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Custom Instructions for AATX Coder
              </label>
              <Textarea
                placeholder="Provide specific instructions for the agent to improve the implementation..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleRedoWithPrompt}
                  disabled={!customPrompt.trim()}
                  size="sm"
                >
                  Redo with Instructions
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowRedoPrompt(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GitPullRequest className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-semibold">{reviewData.branchName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Events Implemented</p>
                <p className="font-semibold">{reviewData.events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Files Modified</p>
                <p className="font-semibold">{reviewData.edits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Implemented Events */}
      <Card>
        <CardHeader>
          <CardTitle>Implemented Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reviewData.events.map((event, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getEventStatusColor(event.status)}`}
              >
                <CheckCircle className="w-5 h-5 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{event.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {event.status}
                    </Badge>
                  </div>
                  {event.description && (
                    <p className="text-sm mt-1 opacity-90">{event.description}</p>
                  )}
                  {event.properties && Object.keys(event.properties).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.keys(event.properties).slice(0, 5).map((prop) => (
                        <Badge key={prop} variant="secondary" className="text-xs">
                          {prop}
                        </Badge>
                      ))}
                      {Object.keys(event.properties).length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{Object.keys(event.properties).length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Code Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Code Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reviewData.edits.map((edit, index) => (
              <Collapsible key={index}>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleFileExpansion(edit.filePath)}
                >
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {getChangeTypeIcon(edit.changeType)}
                      <div className="text-left">
                        <p className="font-medium text-sm">{edit.filePath}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="text-green-600">+{edit.linesAdded}</span>
                          {edit.linesRemoved && (
                            <span className="text-red-600">-{edit.linesRemoved}</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {edit.changeType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {expandedFiles.has(edit.filePath) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Anchor Pattern:
                      </p>
                      <code className="text-xs bg-white p-2 rounded border block mt-1">
                        {edit.anchorPattern}
                      </code>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Code to Insert:
                      </p>
                      <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                        {edit.snippetPreview}
                      </pre>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {reviewData.notes && reviewData.notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reviewData.notes.map((note, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
