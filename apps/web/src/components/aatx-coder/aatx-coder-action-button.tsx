'use client'
import { PlayIcon } from "lucide-react"
import { Button } from "../ui/button"

type AatxCoderActionButtonProps = {
    state: 'idle' | 'running' | 'background' | 'review' | 'creating-pr' | 'success'
    result?: {
        pullRequestUrl: string
        branchName: string
        eventsImplemented: number
    } | null
    onRun: () => void
}

export function AatxCoderActionButton({ state, result, onRun }: AatxCoderActionButtonProps) {
    if (state === 'idle') {
        return <Button variant="outline" className="cursor-pointer flex items-center gap-2 hover:bg-primary/10 hover:text-primary" onClick={onRun}>
            <PlayIcon className="w-4 h-4" />
            Run
        </Button>
    }
    return <Button variant="outline" className="cursor-pointer flex items-center gap-2 hover:bg-primary/10 hover:text-primary" onClick={() => {
        console.log('run')
    }}>
        <PlayIcon className="w-4 h-4" />
        Run
    </Button>
}