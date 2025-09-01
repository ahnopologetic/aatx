"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Plus, Edit, Trash2 } from "lucide-react"

type RescanChange = {
  id: string
  change_type: 'new_event' | 'updated_event' | 'removed_event'
  event_name: string
  old_data?: any
  new_data: any
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  created_at: string
}

type ChangeApprovalDialogProps = {
  changes: RescanChange[]
  onApprove: (changeId: string) => void
  onReject: (changeId: string) => void
  onClose: () => void
}

export function ChangeApprovalDialog({ 
  changes, 
  onApprove, 
  onReject, 
  onClose 
}: ChangeApprovalDialogProps) {
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)

  const handleSelectChange = (changeId: string) => {
    const newSelected = new Set(selectedChanges)
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId)
    } else {
      newSelected.add(changeId)
    }
    setSelectedChanges(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedChanges.size === changes.length) {
      setSelectedChanges(new Set())
    } else {
      setSelectedChanges(new Set(changes.map(c => c.id)))
    }
  }

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedChanges.size === 0) return
    
    setProcessing(true)
    try {
      const promises = Array.from(selectedChanges).map(changeId => 
        action === 'approve' ? onApprove(changeId) : onReject(changeId)
      )
      await Promise.all(promises)
      setSelectedChanges(new Set())
    } catch (error) {
      console.error(`Failed to ${action} changes:`, error)
    } finally {
      setProcessing(false)
    }
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'new_event':
        return <Plus className="h-4 w-4 text-green-500" />
      case 'updated_event':
        return <Edit className="h-4 w-4 text-blue-500" />
      case 'removed_event':
        return <Trash2 className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getChangeBadge = (changeType: string) => {
    const variants = {
      new_event: 'default',
      updated_event: 'secondary',
      removed_event: 'destructive'
    } as const

    return (
      <Badge variant={variants[changeType as keyof typeof variants] || 'outline'}>
        {changeType.replace('_', ' ')}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Review Detected Changes</DialogTitle>
          <DialogDescription>
            Review and approve or reject the changes detected in the latest scan.
            You can select individual changes or use bulk actions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Bulk Actions */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedChanges.size === changes.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedChanges.size} of {changes.length} changes selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('approve')}
                disabled={selectedChanges.size === 0 || processing}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('reject')}
                disabled={selectedChanges.size === 0 || processing}
                className="flex items-center gap-1"
              >
                <XCircle className="h-4 w-4" />
                Reject Selected
              </Button>
            </div>
          </div>

          {/* Changes List */}
          <div className="space-y-3">
            {changes.map((change) => (
              <Card key={change.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedChanges.has(change.id)}
                        onChange={() => handleSelectChange(change.id)}
                        className="mt-1"
                      />
                      {getChangeIcon(change.change_type)}
                      <div>
                        <CardTitle className="text-base">{change.event_name}</CardTitle>
                        <CardDescription>
                          {formatDate(change.created_at)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getChangeBadge(change.change_type)}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onApprove(change.id)}
                          disabled={processing}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReject(change.id)}
                          disabled={processing}
                          className="h-8 w-8 p-0"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {change.change_type === 'updated_event' && change.old_data && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Previous Data</h4>
                        <div className="p-3 bg-muted/50 rounded text-sm font-mono">
                          {JSON.stringify(change.old_data, null, 2)}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">New Data</h4>
                        <div className="p-3 bg-muted/50 rounded text-sm font-mono">
                          {JSON.stringify(change.new_data, null, 2)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {change.change_type !== 'updated_event' && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        {change.change_type === 'new_event' ? 'Event Data' : 'Event Details'}
                      </h4>
                      <div className="p-3 bg-muted/50 rounded text-sm font-mono">
                        {JSON.stringify(change.new_data, null, 2)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
