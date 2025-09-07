"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { ChangeApprovalDialog } from "./change-approval-dialog"
import { toast } from "sonner"

type RescanJob = {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  triggered_by: string
  started_at?: string
  completed_at?: string
  total_events: number
  new_events: number
  updated_events: number
  pending_changes: number
  error_message?: string
}

type RescanChange = {
  id: string
  change_type: 'new_event' | 'updated_event' | 'removed_event'
  event_name: string
  old_data?: any
  new_data: any
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  created_at: string
}

export function RescanHistoryTab({ repositoryId }: { repositoryId: string }) {
  const [rescanJobs, setRescanJobs] = useState<RescanJob[]>([])
  const [pendingChanges, setPendingChanges] = useState<RescanChange[]>([])
  const [loading, setLoading] = useState(true)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)

  const fetchRescanData = async () => {
    try {
      const [jobsResponse, changesResponse] = await Promise.all([
        fetch(`/api/repositories/${repositoryId}/rescan-jobs`),
        fetch(`/api/repositories/${repositoryId}/rescan-changes?status=pending`)
      ])

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setRescanJobs(jobsData.jobs || [])
      }

      if (changesResponse.ok) {
        const changesData = await changesResponse.json()
        setPendingChanges(changesData.changes || [])
      }
    } catch (error) {
      console.error('Failed to fetch rescan data:', error)
      toast.error('Failed to load rescan history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRescanData()
  }, [repositoryId])

  const handleApproveChange = async (changeId: string) => {
    try {
      const response = await fetch(`/api/rescan-changes/${changeId}/approve`, {
        method: 'PUT'
      })
      if (response.ok) {
        toast.success('Change approved')
        fetchRescanData() // Refresh data
      } else {
        toast.error('Failed to approve change')
      }
    } catch (error) {
      toast.error('Failed to approve change')
    }
  }

  const handleRejectChange = async (changeId: string) => {
    try {
      const response = await fetch(`/api/rescan-changes/${changeId}/reject`, {
        method: 'PUT'
      })
      if (response.ok) {
        toast.success('Change rejected')
        fetchRescanData() // Refresh data
      } else {
        toast.error('Failed to reject change')
      }
    } catch (error) {
      toast.error('Failed to reject change')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Changes Section */}
      {pendingChanges.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Pending Changes
                </CardTitle>
                <CardDescription>
                  Review and approve or reject the changes detected in the latest scan.
                </CardDescription>
              </div>
              <Button onClick={() => setShowApprovalDialog(true)}>
                Review Changes ({pendingChanges.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingChanges.slice(0, 3).map((change) => (
                <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{change.event_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {change.change_type.replace('_', ' ')} • {formatDate(change.created_at)}
                    </div>
                  </div>
                  <Badge variant="outline">{change.change_type}</Badge>
                </div>
              ))}
              {pendingChanges.length > 3 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{pendingChanges.length - 3} more changes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rescan History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>
            Recent scans and their results for this repository.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rescanJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scan history available.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Pending Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rescanJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        {getStatusBadge(job.status)}
                      </div>
                    </TableCell>
                    <TableCell>{job.triggered_by}</TableCell>
                    <TableCell>
                      {job.started_at ? formatDate(job.started_at) : '-'}
                    </TableCell>
                    <TableCell>
                      {job.completed_at ? formatDate(job.completed_at) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Total: {job.total_events}</div>
                        <div>New: {job.new_events}</div>
                        <div>Updated: {job.updated_events}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.pending_changes > 0 ? (
                        <Badge variant="destructive">{job.pending_changes}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Change Approval Dialog */}
      {showApprovalDialog && (
        <ChangeApprovalDialog
          changes={pendingChanges}
          onApprove={handleApproveChange}
          onReject={handleRejectChange}
          onClose={() => setShowApprovalDialog(false)}
        />
      )}
    </div>
  )
}
