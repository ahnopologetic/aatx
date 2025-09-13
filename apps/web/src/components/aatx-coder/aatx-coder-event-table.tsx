import { Database } from "@/lib/database.types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Button } from "../ui/button"
import { EyeOpenIcon } from "@radix-ui/react-icons"

type AatxCoderEvent = Database['public']['Tables']['user_events']['Row'] & {
    entryStatus: 'new' | 'updated' | 'existing'
    repoName: string
}

type AatxCoderEventTableProps = {
    events: AatxCoderEvent[]
    type: 'new' | 'updated' | 'existing'
}

export function AatxCoderEventTable({ events, type }: AatxCoderEventTableProps) {
    return (
        <Table className="w-full border rounded-md p-2">
            <TableHeader>
                <TableRow>
                    <TableHead>Entry status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Repo</TableHead>
                    {
                        type !== 'new' && (
                            <TableHead>Location</TableHead>
                        )
                    }
                    <TableHead>Properties</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {events.map((event) => (
                    <TableRow key={event.id}>
                        <TableCell>{event.entryStatus}</TableCell>
                        <TableCell>{event.event_name}</TableCell>
                        <TableCell>{event.description}</TableCell>
                        <TableCell>{event.repoName}</TableCell>
                        {
                            type !== 'new' && (
                                <TableCell>{event.file_path}</TableCell>
                            )
                        }
                        {/* TODO: show the properties in a more readable format */}
                        <TableCell>{JSON.stringify(event.properties)}</TableCell>
                        <TableCell>
                            <Button variant="ghost" className="flex items-center gap-2" disabled={!event.file_path}>
                                <EyeOpenIcon className="w-4 h-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}