'use client'

import { ListBulletIcon } from "@radix-ui/react-icons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { useRouter } from "next/navigation"
import { Database } from "@/lib/database.types"

export function AatxCoderPlanCard({ trackingPlan }: { trackingPlan: Database['public']['Tables']['plans']['Row'] }) {
    const router = useRouter()
    // TODO: show the changes 

    return (
        <Card className="cursor-pointer border-primary/10 bg-primary/5 max-w-2xl hover:shadow-lg hover:bg-primary/10 transition-all duration-300">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ListBulletIcon className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-md text-muted-foreground">Tracking Plan</CardTitle>
                </div>
                <CardDescription className="text-2xl font-light italic text-primary">{trackingPlan.name}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="text-sm font-bold text-primary">{trackingPlan.version}</p>
                </div>
            </CardContent>
        </Card>
    )
}