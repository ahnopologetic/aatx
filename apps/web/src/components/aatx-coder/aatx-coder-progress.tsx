"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Square, 
  Play, 
  GitBranch, 
  Search, 
  Code, 
  GitCommit,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from "lucide-react"

export type LogEntry = {
  id: string
  timestamp: number
  stage: 'clone' | 'analyze' | 'generate' | 'apply' | 'commit' | 'pr'
  tool?: string
  message: string
  status: 'running' | 'success' | 'error' | 'info'
  details?: any
}

interface AatxCoderProgressProps {
  logs: LogEntry[]
  currentStage: string
  progress: number
  isRunning: boolean
  onStop: () => void
  onRunInBackground: () => void
  canRunInBackground?: boolean
}

const stageConfig = {
  clone: { 
    label: "Cloning Repository", 
    icon: GitBranch, 
    color: "text-blue-600",
    bgColor: "bg-blue-50" 
  },
  analyze: { 
    label: "Analyzing Code", 
    icon: Search, 
    color: "text-orange-600",
    bgColor: "bg-orange-50" 
  },
  generate: { 
    label: "Generating Snippets", 
    icon: Code, 
    color: "text-purple-600",
    bgColor: "bg-purple-50" 
  },
  apply: { 
    label: "Applying Patches", 
    icon: Play, 
    color: "text-green-600",
    bgColor: "bg-green-50" 
  },
  commit: { 
    label: "Committing Changes", 
    icon: GitCommit, 
    color: "text-indigo-600",
    bgColor: "bg-indigo-50" 
  },
  pr: { 
    label: "Creating Pull Request", 
    icon: CheckCircle, 
    color: "text-emerald-600",
    bgColor: "bg-emerald-50" 
  }
} as const

export function AatxCoderProgress({
  logs,
  currentStage,
  progress,
  isRunning,
  onStop,
  onRunInBackground,
  canRunInBackground = true
}: AatxCoderProgressProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [groupedLogs, setGroupedLogs] = useState<Record<string, LogEntry[]>>({})

  useEffect(() => {
    // Group logs by stage
    const grouped = logs.reduce((acc, log) => {
      const stage = log.stage
      if (!acc[stage]) acc[stage] = []
      acc[stage].push(log)
      return acc
    }, {} as Record<string, LogEntry[]>)
    
    setGroupedLogs(grouped)
  }, [logs])

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getStatusIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AATX Coder in Progress</h2>
          <p className="text-muted-foreground">
            Implementing analytics tracking events in your repository
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canRunInBackground && (
            <Button 
              variant="outline" 
              onClick={onRunInBackground}
              disabled={!isRunning}
            >
              Run in Background
            </Button>
          )}
          <Button 
            variant="destructive" 
            onClick={onStop}
            disabled={!isRunning}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Currently: {stageConfig[currentStage as keyof typeof stageConfig]?.label || currentStage}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Process completed
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="h-96">
        <CardHeader>
          <CardTitle className="text-lg">Real-time Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="space-y-4">
              {Object.entries(stageConfig).map(([stageKey, config]) => {
                const stageLogs = groupedLogs[stageKey] || []
                const isCurrentStage = currentStage === stageKey
                const hasLogs = stageLogs.length > 0
                
                if (!hasLogs && !isCurrentStage) return null

                const StageIcon = config.icon

                return (
                  <div key={stageKey} className="space-y-2">
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${config.bgColor}`}>
                      <StageIcon className={`w-4 h-4 ${config.color}`} />
                      <span className="font-medium text-sm">{config.label}</span>
                      {isCurrentStage && isRunning && (
                        <Badge variant="secondary" className="ml-auto">
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Running
                        </Badge>
                      )}
                    </div>
                    
                    {stageLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-start gap-3 pl-6 py-2 text-sm"
                      >
                        {getStatusIcon(log.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {formatTimestamp(log.timestamp)}
                            </span>
                            {log.tool && (
                              <Badge variant="outline" className="text-xs">
                                {log.tool}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 break-words">{log.message}</p>
                          {log.details && (
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {typeof log.details === 'string' 
                                ? log.details 
                                : JSON.stringify(log.details, null, 2)
                              }
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
