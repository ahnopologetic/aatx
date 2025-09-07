import { z } from 'zod';

/**
 * Analytics Scan Result Schema
 * 
 * This schema defines the structure for analytics code scan results
 * that will be used across the aatx search agent workflow.
 * 
 * Based on the @aatx/analyze-tracking library output format.
 */

export const EventPropertySchema = z.object({
    description: z.string().optional(),
    type: z.string().optional(),
});

export const ImplementationSchema = z.object({
    path: z.string().describe('Relative path to the file where the event is tracked'),
    line: z.number().optional().describe('Line number in the file where the event is tracked'),
    function: z.string().optional().describe('Name of the function where the event is tracked'),
    destination: z.enum([
        'googleanalytics',
        'segment',
        'mixpanel',
        'amplitude',
        'rudderstack',
        'mparticle',
        'posthog',
        'pendo',
        'heap',
        'snowplow',
        'datadog',
        'gtm',
        'custom',
        'unknown'
    ]).optional().describe('Name of the platform where the event is sent'),
    description: z.string().optional().describe('Description of how the event is triggered'),
});

export const EventSchema = z.object({
    description: z.string().optional().describe('Description of the event'),
    implementations: z.array(ImplementationSchema).describe('List of implementations of this event'),
    properties: z.record(z.string(), EventPropertySchema).describe('Properties of the event'),
});

export const RepoDetailsSchema = z.object({
    repository: z.string().nullable().optional().describe('URL of git repository that was used to generate the schema'),
    commit: z.string().nullable().optional().describe('Git commit hash when this schema was generated'),
    timestamp: z.string().describe('Git commit timestamp when this schema was generated (ISO 8601)'),
});

export const AnalyticsScanResultSchema = z.object({
    version: z.literal(1).describe('Version of the schema'),
    source: RepoDetailsSchema.describe('Repository source information'),
    events: z.record(z.string(), EventSchema).describe('Map of event names to event details'),
    metadata: z.object({
        scanTimestamp: z.string().describe('When this scan was performed (ISO 8601)'),
        totalEvents: z.number().describe('Total number of events found'),
        totalImplementations: z.number().describe('Total number of implementations found'),
        scanDuration: z.number().optional().describe('Duration of the scan in milliseconds'),
        customFunctions: z.array(z.string()).optional().describe('Custom function patterns used in the scan'),
        ignoredPatterns: z.array(z.string()).optional().describe('Patterns that were ignored during the scan'),
    }).describe('Additional metadata about the scan'),
});

// Type exports for TypeScript usage
export type EventProperty = z.infer<typeof EventPropertySchema>;
export type Implementation = z.infer<typeof ImplementationSchema>;
export type Event = z.infer<typeof EventSchema>;
export type RepoDetails = z.infer<typeof RepoDetailsSchema>;
export type AnalyticsScanResult = z.infer<typeof AnalyticsScanResultSchema>;

// Validation helper functions
export const validateAnalyticsScanResult = (data: unknown): AnalyticsScanResult => {
    return AnalyticsScanResultSchema.parse(data);
};

export const isValidAnalyticsScanResult = (data: unknown): data is AnalyticsScanResult => {
    return AnalyticsScanResultSchema.safeParse(data).success;
};
