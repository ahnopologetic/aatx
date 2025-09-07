import { z } from "zod"

// Schema for individual event properties
export const EventPropertySchema = z.object({
  name: z.string().describe("Property name"),
  type: z.enum(["string", "number", "boolean", "object", "array"]).describe("Property data type"),
  description: z.string().optional().describe("Property description"),
  required: z.boolean().default(false).describe("Whether this property is required"),
  example: z.any().optional().describe("Example value for this property")
})

// Schema for detected events
export const DetectedEventSchema = z.object({
  name: z.string().describe("Event name"),
  description: z.string().optional().describe("Event description"),
  file_path: z.string().optional().describe("File path where event was detected"),
  line_number: z.number().optional().describe("Line number where event was detected"),
  properties: z.array(EventPropertySchema).default([]).describe("Event properties"),
  context: z.string().optional().describe("Additional context about the event"),
  confidence: z.number().min(0).max(1).default(0.8).describe("Confidence score for this detection"),
  source: z.enum(["posthog", "mixpanel", "amplitude", "google_analytics", "custom"]).optional().describe("Analytics provider source")
})

// Schema for changes detected between scans
export const RescanChangeSchema = z.object({
  change_type: z.enum(["new_event", "updated_event", "removed_event"]).describe("Type of change detected"),
  event_name: z.string().describe("Name of the event that changed"),
  old_data: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    properties: z.array(EventPropertySchema).optional(),
    file_path: z.string().optional(),
    line_number: z.number().optional()
  }).optional().describe("Previous event data (for updates)"),
  new_data: z.object({
    name: z.string(),
    description: z.string().optional(),
    properties: z.array(EventPropertySchema),
    file_path: z.string().optional(),
    line_number: z.number().optional(),
    context: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    source: z.enum(["posthog", "mixpanel", "amplitude", "google_analytics", "custom"]).optional()
  }).describe("New event data"),
  reason: z.string().optional().describe("Reason for the change detection"),
  impact: z.enum(["low", "medium", "high"]).default("medium").describe("Impact level of this change")
})

// Schema for scan summary statistics
export const ScanSummarySchema = z.object({
  total_files_scanned: z.number().describe("Total number of files scanned"),
  total_events_found: z.number().describe("Total number of events found"),
  new_events_found: z.number().describe("Number of new events detected"),
  updated_events_found: z.number().describe("Number of events that were updated"),
  removed_events_found: z.number().describe("Number of events that were removed"),
  scan_duration_seconds: z.number().describe("Time taken to complete the scan"),
  files_with_events: z.number().describe("Number of files that contained events"),
  languages_detected: z.array(z.string()).describe("Programming languages detected in the repository"),
  analytics_providers: z.array(z.string()).describe("Analytics providers detected")
})

// Schema for scan errors or warnings
export const ScanIssueSchema = z.object({
  type: z.enum(["error", "warning", "info"]).describe("Type of issue"),
  message: z.string().describe("Issue message"),
  file_path: z.string().optional().describe("File where issue occurred"),
  line_number: z.number().optional().describe("Line number where issue occurred"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium").describe("Issue severity")
})

// Main rescan result schema
export const AatxAgentRescanResultSchema = z.object({
  // Scan metadata
  scan_id: z.string().describe("Unique identifier for this scan"),
  repository_url: z.string().url().describe("Repository URL that was scanned"),
  scan_timestamp: z.string().datetime().describe("When the scan was performed"),
  scan_version: z.string().describe("Version of the scanning algorithm used"),
  
  // Scan results
  summary: ScanSummarySchema.describe("Summary statistics of the scan"),
  
  // Detected events
  events: z.array(DetectedEventSchema).describe("All events detected in the repository"),
  
  // Changes from previous scan
  changes: z.array(RescanChangeSchema).describe("Changes detected compared to previous scan"),
  
  // Issues encountered during scan
  issues: z.array(ScanIssueSchema).default([]).describe("Errors, warnings, or info messages from the scan"),
  
  // Scan configuration used
  scan_config: z.object({
    include_patterns: z.array(z.string()).optional().describe("File patterns included in scan"),
    exclude_patterns: z.array(z.string()).optional().describe("File patterns excluded from scan"),
    max_file_size_mb: z.number().optional().describe("Maximum file size to scan"),
    supported_languages: z.array(z.string()).optional().describe("Programming languages supported"),
    analytics_providers: z.array(z.string()).optional().describe("Analytics providers to detect")
  }).optional().describe("Configuration used for this scan"),
  
  // Recommendations
  recommendations: z.array(z.object({
    type: z.enum(["event_consolidation", "property_standardization", "naming_convention", "performance", "security"]).describe("Type of recommendation"),
    title: z.string().describe("Recommendation title"),
    description: z.string().describe("Detailed recommendation description"),
    priority: z.enum(["low", "medium", "high"]).describe("Recommendation priority"),
    affected_events: z.array(z.string()).optional().describe("Events affected by this recommendation")
  })).default([]).describe("Recommendations based on scan results")
})

// Type exports
export type AatxAgentRescanResult = z.infer<typeof AatxAgentRescanResultSchema>
export type DetectedEvent = z.infer<typeof DetectedEventSchema>
export type RescanChange = z.infer<typeof RescanChangeSchema>
export type ScanSummary = z.infer<typeof ScanSummarySchema>
export type ScanIssue = z.infer<typeof ScanIssueSchema>

// Helper function to validate rescan result
export const validateRescanResult = (data: unknown): AatxAgentRescanResult => {
  return AatxAgentRescanResultSchema.parse(data)
}

// Helper function to create a minimal valid rescan result
export const createMinimalRescanResult = (repositoryUrl: string): AatxAgentRescanResult => {
  return {
    scan_id: crypto.randomUUID(),
    repository_url: repositoryUrl,
    scan_timestamp: new Date().toISOString(),
    scan_version: "1.0.0",
    summary: {
      total_files_scanned: 0,
      total_events_found: 0,
      new_events_found: 0,
      updated_events_found: 0,
      removed_events_found: 0,
      scan_duration_seconds: 0,
      files_with_events: 0,
      languages_detected: [],
      analytics_providers: []
    },
    events: [],
    changes: [],
    issues: [],
    recommendations: []
  }
}

