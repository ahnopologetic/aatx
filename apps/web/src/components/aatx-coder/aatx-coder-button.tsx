"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Code2, Sparkles } from "lucide-react"

interface AatxCoderButtonProps {
  eventsToImplement: number
  onStartCoder: () => void
  disabled?: boolean
  loading?: boolean
}

export function AatxCoderButton({ 
  eventsToImplement, 
  onStartCoder, 
  disabled = false,
  loading = false 
}: AatxCoderButtonProps) {
  if (eventsToImplement === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
        <Code2 className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-blue-900">Ready for Implementation</h3>
        <p className="text-sm text-blue-700">
          {eventsToImplement} event{eventsToImplement > 1 ? 's' : ''} can be automatically implemented in your codebase
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          {eventsToImplement} events
        </Badge>
        <Button 
          onClick={onStartCoder}
          disabled={disabled || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Starting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Ask AATX Coder
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
