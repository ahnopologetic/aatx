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

type Org = { id: string; name: string }

export default function OrgSelector() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string>("")
  const [orgs, setOrgs] = useState<Org[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [inviteEmails, setInviteEmails] = useState("")
  const [loading, setLoading] = useState(false)

  const currentLabel = useMemo(() => orgs.find((o) => o.id === value)?.name ?? "Select organization...", [orgs, value])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const res = await fetch("/api/organizations", { cache: "no-store" })
        const data = await res.json()
        if (!ignore && Array.isArray(data.organizations)) {
          setOrgs(data.organizations)
          if (!value && data.organizations.length > 0) setValue(data.organizations[0].id)
        }
      } catch {}
    }
    load()
    return () => { ignore = true }
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
    } catch {}
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
        setOrgs((prev) => [...prev, data.organization])
        setValue(data.organization.id)
        setCreateOpen(false)
        setOrgName("")
        setInviteEmails("")
      } else {
        alert(data.error || "Failed to create organization")
      }
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
            className="w-[120px] justify-between bg-transparent"
          >
            {currentLabel}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0">
          <Command>
            <CommandInput placeholder="Search organization..." />
            <CommandList>
              <CommandEmpty>No organization found.</CommandEmpty>
              <CommandGroup>
                {orgs.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.id}
                    onSelect={(currentValue) => switchOrg(currentValue)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === org.id ? "opacity-100" : "opacity-0")} />
                    {org.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Create organization">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. AATX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-emails">Invite emails (comma separated)</Label>
              <Input id="invite-emails" value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} placeholder="alice@ex.com, bob@ex.com" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createOrg} disabled={loading} className="bg-transparent">{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
