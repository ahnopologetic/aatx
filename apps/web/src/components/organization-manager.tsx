"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Plus, MoreVertical, UserPlus, Mail, Trash2, Crown, Shield, User, RefreshCw, CheckCircle, Clock, XCircle } from "lucide-react"
import { toast } from "sonner"

interface Organization {
    id: string
    name: string
    created_at: string | null
}

interface Member {
    id: string
    user_id: string
    role: 'owner' | 'admin' | 'member'
    created_at: string
    user: {
        id: string
        name: string | null
        email: string
    }
}

interface Invitation {
    id: string
    email: string
    status: 'pending' | 'accepted' | 'revoked'
    created_at: string | null
    expires_at: string | null
    token: string
    invited_by: {
        name: string | null
        email: string
    }
}

interface OrganizationManagerProps {
    organization: Organization
    currentUserRole: string
    currentUserId: string
}

export function OrganizationManager({ organization, currentUserRole, currentUserId }: OrganizationManagerProps) {
    const [members, setMembers] = useState<Member[]>([])
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteLoading, setInviteLoading] = useState(false)

    const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin'
    const isOwner = currentUserRole === 'owner'

    useEffect(() => {
        loadData()
    }, [organization.id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [membersRes, invitationsRes] = await Promise.all([
                fetch(`/api/organizations/${organization.id}/members`),
                fetch(`/api/organizations/${organization.id}/invitations`)
            ])

            if (membersRes.ok) {
                const membersData = await membersRes.json()
                setMembers(membersData.members || [])
            }

            if (invitationsRes.ok) {
                const invitationsData = await invitationsRes.json()
                setInvitations(invitationsData.invitations || [])
            }
        } catch (error) {
            toast.error("Failed to load organization data")
        } finally {
            setLoading(false)
        }
    }

    const sendInvite = async () => {
        if (!inviteEmail.trim()) return

        setInviteLoading(true)
        try {
            const response = await fetch(`/api/organizations/${organization.id}/invitations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails: [inviteEmail.trim()] })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success("Invitation sent successfully")
                setInviteEmail("")
                setInviteOpen(false)
                loadData() // Reload to show new invitation
            } else {
                toast.error(data.error || "Failed to send invitation")
            }
        } catch (error) {
            toast.error("Failed to send invitation")
        } finally {
            setInviteLoading(false)
        }
    }

    const updateMemberRole = async (memberId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/organizations/${organization.id}/members/${memberId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            })

            if (response.ok) {
                toast.success("Member role updated")
                loadData()
            } else {
                const data = await response.json()
                toast.error(data.error || "Failed to update role")
            }
        } catch (error) {
            toast.error("Failed to update member role")
        }
    }

    const removeMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) {
            return
        }

        try {
            const response = await fetch(`/api/organizations/${organization.id}/members/${memberId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast.success("Member removed from organization")
                loadData()
            } else {
                const data = await response.json()
                toast.error(data.error || "Failed to remove member")
            }
        } catch (error) {
            toast.error("Failed to remove member")
        }
    }

    const revokeInvitation = async (invitationId: string, email: string) => {
        if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
            return
        }

        try {
            const response = await fetch(`/api/organizations/${organization.id}/invitations/${invitationId}/revoke`, {
                method: 'POST'
            })

            if (response.ok) {
                toast.success("Invitation revoked")
                loadData()
            } else {
                const data = await response.json()
                toast.error(data.error || "Failed to revoke invitation")
            }
        } catch (error) {
            toast.error("Failed to revoke invitation")
        }
    }

    const resendInvitation = async (invitationId: string, email: string) => {
        try {
            const response = await fetch(`/api/organizations/${organization.id}/invitations/${invitationId}/resend`, {
                method: 'POST'
            })

            if (response.ok) {
                toast.success(`Invitation resent to ${email}`)
            } else {
                const data = await response.json()
                toast.error(data.error || "Failed to resend invitation")
            }
        } catch (error) {
            toast.error("Failed to resend invitation")
        }
    }

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner': return <Crown className="h-4 w-4" />
            case 'admin': return <Shield className="h-4 w-4" />
            default: return <User className="h-4 w-4" />
        }
    }

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'owner': return 'default'
            case 'admin': return 'secondary'
            default: return 'outline'
        }
    }

    const getInvitationStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
            case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'revoked': return <XCircle className="h-4 w-4 text-red-500" />
            default: return <Clock className="h-4 w-4" />
        }
    }

    if (loading) {
        return <div>Loading organization data...</div>
    }

    return (
        <div className="space-y-6">
            {/* Organization Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Organization Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div>
                            <span className="font-medium">Name:</span> {organization.name}
                        </div>
                        <div>
                            <span className="font-medium">Created:</span> {new Date(organization.created_at || '').toLocaleDateString()}
                        </div>
                        <div>
                            <span className="font-medium">Your Role:</span>{" "}
                            <Badge variant={getRoleBadgeVariant(currentUserRole)} className="ml-2">
                                {getRoleIcon(currentUserRole)}
                                <span className="ml-1 capitalize">{currentUserRole}</span>
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Members Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Members ({members.length})</CardTitle>
                    {isOwnerOrAdmin && (
                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Invite Member
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Invite New Member</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="invite-email">Email Address</Label>
                                        <Input
                                            id="invite-email"
                                            type="email"
                                            placeholder="member@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    <Alert>
                                        <Mail className="h-4 w-4" />
                                        <AlertDescription>
                                            An invitation email will be sent to this address. New members will join as regular members.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setInviteOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={sendInvite} disabled={inviteLoading}>
                                        {inviteLoading ? "Sending..." : "Send Invitation"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div>
                                        <div className="font-medium">
                                            {member.user.name || member.user.email.split('@')[0]}
                                            {member.user_id === currentUserId && (
                                                <span className="text-muted-foreground ml-2">(You)</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{member.user.email}</div>
                                    </div>
                                    <Badge variant={getRoleBadgeVariant(member.role)}>
                                        {getRoleIcon(member.role)}
                                        <span className="ml-1 capitalize">{member.role}</span>
                                    </Badge>
                                </div>

                                {isOwnerOrAdmin && member.user_id !== currentUserId && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {isOwner && member.role !== 'owner' && (
                                                <>
                                                    {member.role !== 'admin' && (
                                                        <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'admin')}>
                                                            <Shield className="mr-2 h-4 w-4" />
                                                            Make Admin
                                                        </DropdownMenuItem>
                                                    )}
                                                    {member.role !== 'member' && (
                                                        <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'member')}>
                                                            <User className="mr-2 h-4 w-4" />
                                                            Make Member
                                                        </DropdownMenuItem>
                                                    )}
                                                    <Separator />
                                                </>
                                            )}
                                            <DropdownMenuItem
                                                onClick={() => removeMember(member.id, member.user.name || member.user.email)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remove Member
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Invitations Section */}
            {isOwnerOrAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Invitations ({invitations.filter(i => i.status === 'pending').length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {invitations.length === 0 ? (
                            <p className="text-muted-foreground">No invitations sent yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {invitations.map((invitation) => (
                                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            {getInvitationStatusIcon(invitation.status)}
                                            <div>
                                                <div className="font-medium">{invitation.email}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Invited by {invitation.invited_by.name || invitation.invited_by.email} on{" "}
                                                    {new Date(invitation.created_at || '').toLocaleDateString()}
                                                </div>
                                            </div>
                                            <Badge variant={invitation.status === 'pending' ? 'secondary' : 'outline'}>
                                                {invitation.status}
                                            </Badge>
                                        </div>

                                        {invitation.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => resendInvitation(invitation.id, invitation.email)}
                                                >
                                                    <RefreshCw className="mr-2 h-4 w-4" />
                                                    Resend
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => revokeInvitation(invitation.id, invitation.email)}
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                    Revoke
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
