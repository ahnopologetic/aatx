"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Simple spinner component for progress indication
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-muted-foreground mr-2"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  )
}

type Org = { id: string; name: string }

export default function OrgSelector() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string>("")
  const [orgs, setOrgs] = useState<Org[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [inviteEmails, setInviteEmails] = useState("")
  const [loading, setLoading] = useState(false)
  const [orgsLoading, setOrgsLoading] = useState(true)

  const currentLabel = useMemo(
    () =>
      orgs.find((o) => o.id === value)?.name ??
      (orgsLoading ? "Loading..." : "Select organization..."),
    [orgs, value, orgsLoading]
  )

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setOrgsLoading(true)
      try {
        const res = await fetch("/api/organizations", { cache: "no-store" })
        const data = await res.json()
        if (!ignore && Array.isArray(data.organizations)) {
          setOrgs(data.organizations)
          // Use the current organization from profile if it exists in the list, otherwise fallback to first org
          let currentOrgId = data.current_org_id
          if (
            currentOrgId &&
            !data.organizations.some((org: Org) => org.id === currentOrgId)
          ) {
            // Current org not in the list (maybe user lost access), fallback to first org
            currentOrgId =
              data.organizations.length > 0 ? data.organizations[0].id : ""
          } else if (!currentOrgId && data.organizations.length > 0) {
            // No current org set, use first available
            currentOrgId = data.organizations[0].id
          }
          if (!value && currentOrgId) setValue(currentOrgId)
        }
      } catch {
        // Optionally handle error
      } finally {
        setOrgsLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchOrg = async (org_id: string) => {
    if (!org_id) return
    setValue(org_id)
    setOpen(false)
    try {
      await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id }),
      })
      // Optionally refresh page data
      if (typeof window !== "undefined") window.location.reload()
    } catch { }
  }

  const createOrg = async () => {
    if (!orgName.trim()) return
    setLoading(true)
    try {
      const emails = inviteEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim(), invite_emails: emails }),
      })
      const data = await res.json()
      if (res.ok) {
        // Add new organization to the list
        setOrgs((prev) => [...prev, data.organization])
        // Switch to the new organization
        await switchOrg(data.organization.id)
        setCreateOpen(false)
        setOrgName("")
        setInviteEmails("")
      } else {
        alert(data.error || "Failed to create organization")
      }
    } catch (error) {
      alert("Failed to create organization")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[120px] sm:w-[140px] justify-between bg-transparent min-h-[44px] touch-manipulation"
            disabled={orgsLoading}
          >
            <span className="flex items-center truncate">
              {orgsLoading && <Spinner />}
              <span className="truncate">{currentLabel}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0">
          <Command>
            <CommandInput placeholder="Search organization..." disabled={orgsLoading} />
            <CommandList>
              {orgsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner />
                  <span className="text-sm text-muted-foreground ml-2">Loading organizations...</span>
                </div>
              ) : (
                <>
                  <CommandEmpty>No organization found.</CommandEmpty>
                  <CommandGroup>
                    {orgs.map((org) => (
                      <CommandItem
                        key={org.id}
                        value={org.id}
                        onSelect={(currentValue) => switchOrg(currentValue)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === org.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {org.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Create organization" className="min-h-[44px] min-w-[44px] touch-manipulation">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] mx-4">
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. AATX"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-emails">Invite emails (comma separated)</Label>
              <Input
                id="invite-emails"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="alice@ex.com, bob@ex.com"
                className="min-h-[44px]"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={createOrg}
              disabled={loading}
              className="bg-transparent min-h-[44px] w-full sm:w-auto"
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
