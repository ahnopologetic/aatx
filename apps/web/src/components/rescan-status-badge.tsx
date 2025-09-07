"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

type RescanStatus = {
  lastScan?: string
  pendingChanges: number
  isScanning: boolean
  lastScanDate?: string
}

export function RescanStatusBadge({ repositoryId }: { repositoryId: string }) {
  const [status, setStatus] = useState<RescanStatus>({ 
    pendingChanges: 0, 
    isScanning: false 
  })
  const [loading, setLoading] = useState(true)

  const fetchRescanStatus = async () => {
    try {
      const response = await fetch(`/api/repositories/${repositoryId}/rescan-status`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch rescan status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRescanStatus()
    // Poll for updates every 10 seconds if scanning
    const interval = setInterval(() => {
      if (status.isScanning) {
        fetchRescanStatus()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [repositoryId, status.isScanning])

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  if (loading) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading...
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {status.isScanning ? (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Scanning...
        </Badge>
      ) : status.lastScanDate ? (
        <Badge variant="outline">
          Last scan: {formatRelativeTime(status.lastScanDate)}
        </Badge>
      ) : (
        <Badge variant="outline">Never scanned</Badge>
      )}
      
      {status.pendingChanges > 0 && (
        <Badge variant="destructive">
          {status.pendingChanges} pending changes
        </Badge>
      )}
    </div>
  )
}
