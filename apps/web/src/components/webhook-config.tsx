'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, ExternalLink, Webhook, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface WebhookConfigProps {
  repositoryId: string
  repositoryName: string
  repositoryUrl?: string
}

export function WebhookConfig({ repositoryId, repositoryName, repositoryUrl }: WebhookConfigProps) {
  const [autoRescanEnabled, setAutoRescanEnabled] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Generate webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    setWebhookUrl(`${baseUrl}/api/webhooks/github`)

    // Load current webhook configuration
    loadWebhookConfig()
  }, [repositoryId])

  const loadWebhookConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/repositories/${repositoryId}/webhook-config`)
      if (response.ok) {
        const data = await response.json()
        setAutoRescanEnabled(data.autoRescanEnabled || false)
      }
    } catch (error) {
      console.error('Failed to load webhook config:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveWebhookConfig = async (enabled: boolean) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/repositories/${repositoryId}/webhook-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          autoRescanEnabled: enabled
        })
      })

      if (response.ok) {
        setAutoRescanEnabled(enabled)
        toast.success(enabled ? 'Webhook auto-rescan enabled' : 'Webhook auto-rescan disabled')
      } else {
        throw new Error('Failed to save webhook configuration')
      }
    } catch (error) {
      console.error('Failed to save webhook config:', error)
      toast.error('Failed to save webhook configuration')
    } finally {
      setSaving(false)
    }
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied to clipboard')
  }

  const getGitHubWebhookUrl = () => {
    if (!repositoryUrl) return null
    
    // Extract owner/repo from GitHub URL
    const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (match) {
      const [, owner, repo] = match
      return `https://github.com/${owner}/${repo}/settings/hooks/new`
    }
    return null
  }

  const githubWebhookUrl = getGitHubWebhookUrl()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Configuration
        </CardTitle>
        <CardDescription>
          Configure automatic rescans when code changes are pushed to your repository
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-rescan toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-rescan">Automatic Rescan on Push</Label>
            <p className="text-sm text-muted-foreground">
              Automatically trigger a rescan when commits are pushed to the main branch
            </p>
          </div>
          <Switch
            id="auto-rescan"
            checked={autoRescanEnabled}
            onCheckedChange={saveWebhookConfig}
            disabled={saving || loading}
          />
        </div>

        {autoRescanEnabled && (
          <>
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyWebhookUrl}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this URL when setting up your GitHub webhook
              </p>
            </div>

            {/* Setup instructions */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to your repository settings on GitHub</li>
                    <li>Navigate to Webhooks → Add webhook</li>
                    <li>Paste the webhook URL above</li>
                    <li>Set Content type to &quot;application/json&quot;</li>
                    <li>Select &quot;Just the push event&quot;</li>
                    <li>Click &quot;Add webhook&quot;</li>
                  </ol>
                  {githubWebhookUrl && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a
                          href={githubWebhookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open GitHub Webhook Settings
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Auto-rescan enabled
              </Badge>
              <span className="text-sm text-muted-foreground">
                Rescans will be triggered automatically on push events
              </span>
            </div>
          </>
        )}

        {!autoRescanEnabled && (
          <div className="text-sm text-muted-foreground">
            Enable automatic rescans to receive real-time updates when your repository changes.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
