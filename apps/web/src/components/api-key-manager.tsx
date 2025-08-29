"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Key, Plus, Clock, Copy, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
  key?: string // Only present when creating a new key
}

interface ApiKeyManagerProps {
  isAdmin: boolean
  orgId: string
}

export function ApiKeyManager({ isAdmin, orgId }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("365")
  const [creatingKey, setCreatingKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState<ApiKey | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      } else {
        toast.error("Failed to load API keys")
      }
    } catch (error) {
      toast.error("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("API key name is required")
      return
    }

    setCreatingKey(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresInDays: parseInt(expiresInDays) || 365
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setNewApiKey(data.apiKey)
        await loadApiKeys()
      } else {
        toast.error(data.error || "Failed to create API key")
      }
    } catch (error) {
      toast.error("Failed to create API key")
    } finally {
      setCreatingKey(false)
    }
  }

  const revokeApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/api-keys/${keyId}/revoke`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success("API key revoked successfully")
        loadApiKeys()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to revoke API key")
      }
    } catch (error) {
      toast.error("Failed to revoke API key")
    }
  }

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setKeyCopied(true)
    toast.success("API key copied to clipboard")
    setTimeout(() => setKeyCopied(false), 3000)
  }

  const resetCreateForm = () => {
    setNewKeyName("")
    setExpiresInDays("365")
    setNewApiKey(null)
  }

  const closeCreateDialog = () => {
    setCreateDialogOpen(false)
    setTimeout(resetCreateForm, 300) // Reset after dialog animation completes
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false
    return new Date(dateString) < new Date()
  }

  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false
    const expiryDate = new Date(dateString)
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)
    return expiryDate < thirtyDaysFromNow && expiryDate > now
  }

  if (loading) {
    return <div>Loading API keys...</div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>API Keys</CardTitle>
        {isAdmin && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{newApiKey ? "API Key Created" : "Create New API Key"}</DialogTitle>
                {!newApiKey && (
                  <DialogDescription>
                    Create an API key for integrating with external services like GitHub Actions.
                  </DialogDescription>
                )}
              </DialogHeader>
              
              {newApiKey ? (
                <div className="space-y-4 py-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700">
                      API key created successfully! Copy your key now - it will only be shown once.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label>API Key Name</Label>
                    <div className="font-medium">{newApiKey.name}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="flex items-center">
                      <div className="bg-muted p-2 rounded-md font-mono text-xs flex-1 overflow-x-auto">
                        {newApiKey.key}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="ml-2" 
                        onClick={() => copyApiKey(newApiKey.key!)}
                      >
                        {keyCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Expires On</Label>
                    <div>{formatDate(newApiKey.expires_at)}</div>
                  </div>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Store this key securely. For security reasons, we can't show it again.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="GitHub Action Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expires-in">Expires In (Days)</Label>
                    <Input
                      id="expires-in"
                      type="number"
                      min="1"
                      max="3650"
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value)}
                    />
                  </div>
                  
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertDescription>
                      This key will have permissions to validate tracking plans and scan repositories.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              <DialogFooter>
                {newApiKey ? (
                  <Button onClick={closeCreateDialog}>Done</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={closeCreateDialog}>
                      Cancel
                    </Button>
                    <Button onClick={createApiKey} disabled={creatingKey}>
                      {creatingKey ? "Creating..." : "Create API Key"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Key className="mx-auto h-12 w-12 opacity-20 mb-2" />
            <p>No API keys created yet.</p>
            {isAdmin && (
              <p className="text-sm mt-1">
                Create an API key to integrate with external services like GitHub Actions.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium flex items-center">
                      {key.name}
                      {isExpired(key.expires_at) && (
                        <Badge variant="destructive" className="ml-2">Expired</Badge>
                      )}
                      {isExpiringSoon(key.expires_at) && !isExpired(key.expires_at) && (
                        <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">Expiring Soon</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center space-x-2">
                      <span className="font-mono">{key.key_prefix}...</span>
                      <span>•</span>
                      <span>Created: {formatDate(key.created_at)}</span>
                      <span>•</span>
                      <span>Expires: {formatDate(key.expires_at)}</span>
                    </div>
                  </div>
                </div>
                
                {isAdmin && !isExpired(key.expires_at) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeApiKey(key.id, key.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
