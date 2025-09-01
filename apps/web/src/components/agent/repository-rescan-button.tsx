'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import posthog from "posthog-js"

export const RepositoryRescanButton = () => {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ newEvents: number, updatedEvents: number } | null>(null)

    const handleRescan = async () => {
        posthog.capture('repository_rescan_button: clicked')
        setLoading(true)
        setResult(null)
        // Simulate a 5 second scan
        setTimeout(() => {
            // Simulate result data
            const newEvents = Math.floor(Math.random() * 10)
            const updatedEvents = Math.floor(Math.random() * 5)
            setResult({ newEvents, updatedEvents })
            setLoading(false)
        }, 5000)
    }

    return (
        <div className="flex flex-col items-start gap-2">
            <Button
                variant="outline"
                onClick={handleRescan}
                disabled={loading}
                className="flex items-center gap-2 w-full"
            >
                {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {loading ? "Rescanning..." : "Rescan"}
            </Button>
            <AnimatePresence>
                {result && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.4, type: "spring" }}
                        className="text-sm text-muted-foreground mt-1"
                    >
                        {result.newEvents} new events, {result.updatedEvents} updated events
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}