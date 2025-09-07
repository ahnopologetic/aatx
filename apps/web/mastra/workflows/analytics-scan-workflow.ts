/**
 * Analytics Scan Workflow
 * 
 * This workflow uses the search-analytics-code-tool to analyze a repository
 * and saves the results to a JSON file, then converts it to our predefined
 * analytics code schema deterministically.
 * 
 * Features:
 * - Prevents handling of excessively long JSON responses
 * - Saves results to JSON file for persistence
 * - Converts to predefined analytics code schema
 * - Includes comprehensive error handling and validation
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
    validateAnalyticsScanResult, type AnalyticsScanResult, type Event
} from '../schemas/analytics-scan-result';
import { analyzeDirectory, getRepoDetails } from '@aatx/analyze-tracking';

// Configuration constants
const MAX_JSON_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit
const MAX_EVENTS_COUNT = 10000; // Prevent processing too many events
const MAX_IMPLEMENTATIONS_PER_EVENT = 1000; // Prevent excessive implementations per event

const scanAnalyticsCodeStep = createStep({
    id: 'scan-analytics-code',
    description: 'Use search-analytics-code-tool to analyze repository for analytics code',
    inputSchema: z.object({
        dirPath: z.string().describe('The path to the directory to analyze'),
        customFunction: z.array(z.string()).optional().describe('Custom function patterns to search for'),
        ignore: z.array(z.string()).optional().describe('Glob patterns or dirs to ignore'),
        timeoutMs: z.number().int().positive().optional().describe('Kill the process after this many ms'),
        maxOutputBytes: z.number().int().positive().optional().describe('Cap captured stdout size'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        jsonFilePath: z.string().optional().describe('Path to the saved JSON file'),
        scanDuration: z.number().optional().describe('Duration of the scan in milliseconds'),
        dirPath: z.string().describe('The path to the directory to analyze'),
    }),
    execute: async ({ inputData, mastra }) => {
        const logger = mastra.getLogger();
        const startTime = Date.now();

        if (!inputData) {
            throw new Error('Input data not found');
        }

        const {
            dirPath,
            customFunction = [],
            ignore = [],
            timeoutMs = 60_000,
            maxOutputBytes = 10 * 1024 * 1024,
        } = inputData;

        try {
            logger.info(`Starting analytics code scan for directory: ${dirPath}`);

            const events = await analyzeDirectory(dirPath, customFunction, ignore);
            const source = await getRepoDetails(dirPath);
            const result = { version: 1, source, events } as const;
            const scanDuration = Date.now() - startTime;

            // Check if result is too large
            const resultString = JSON.stringify(result);
            if (resultString.length > MAX_JSON_SIZE_BYTES) {
                return {
                    success: false,
                    message: `Analytics scan result too large: ${resultString.length} bytes (max: ${MAX_JSON_SIZE_BYTES})`,
                    jsonFilePath: undefined,
                    scanDuration,
                    dirPath,
                };
            }

            // save the result to a JSON file
            const jsonFilePath = join(dirPath, 'analytics-scan-result', source.commit ?? 'unknown', source.timestamp, 'result.json');
            // Ensure the directory exists before writing the file
            await fs.mkdir(join(jsonFilePath, '..'), { recursive: true });
            await fs.writeFile(jsonFilePath, JSON.stringify(result, null, 2));

            logger.info(`Analytics scan completed in ${scanDuration}ms and saved to ${jsonFilePath}`);

            return {
                success: true,
                message: `Analytics scan completed successfully in ${scanDuration}ms`,
                jsonFilePath,
                scanDuration,
                dirPath,
            };

        } catch (error) {
            const scanDuration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            logger.error(`Analytics scan failed: ${errorMessage}`);

            return {
                success: false,
                message: `Analytics scan failed: ${errorMessage}`,
                jsonFilePath: undefined,
                scanDuration,
                dirPath,
            };
        }
    },
});

const convertToSchemaStep = createStep({
    id: 'convert-to-schema',
    description: 'Convert saved JSON results to predefined analytics code schema',
    inputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        jsonFilePath: z.string().describe('Path to the saved JSON file'),
        scanDuration: z.number().optional().describe('Duration of the scan in milliseconds'),
        dirPath: z.string().describe('The path to the directory to analyze'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        scanResult: z.any().optional().describe('Converted analytics scan result'),
        jsonFilePath: z.string().describe('Path to the saved JSON file'),
        scanDuration: z.number().optional(),
        dirPath: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
        const logger = mastra.getLogger();

        if (!inputData) {
            throw new Error('Input data not found');
        }

        if (!inputData.success || !inputData.jsonFilePath) {
            return {
                ...inputData,
                scanResult: undefined,
            };
        }

        try {
            const jsonFilePath = inputData.jsonFilePath;
            const rawResultFile = await fs.readFile(jsonFilePath, 'utf8');
            const rawResult = JSON.parse(rawResultFile);

            // Validate that we have the expected structure
            if (!rawResult || typeof rawResult !== 'object') {
                throw new Error('Invalid raw result structure');
            }

            if (!rawResult.source || !rawResult.events) {
                throw new Error('Raw result missing required fields: source or events');
            }

            // Count events and implementations for validation
            const events = rawResult.events || {};
            const totalEvents = Object.keys(events).length;
            let totalImplementations = 0;

            // Validate event counts and structure
            if (totalEvents > MAX_EVENTS_COUNT) {
                throw new Error(`Too many events found: ${totalEvents} (max: ${MAX_EVENTS_COUNT})`);
            }

            // Process and validate each event
            const processedEvents: Record<string, Event> = {};

            for (const [eventName, eventData] of Object.entries(events)) {
                if (typeof eventData !== 'object' || eventData === null) {
                    logger.warn(`Skipping invalid event data for: ${eventName}`);
                    continue;
                }

                const event = eventData as any;
                const implementations = event.implementations || [];

                if (implementations.length > MAX_IMPLEMENTATIONS_PER_EVENT) {
                    logger.warn(`Event ${eventName} has too many implementations: ${implementations.length} (max: ${MAX_IMPLEMENTATIONS_PER_EVENT}). Truncating.`);
                    implementations.splice(MAX_IMPLEMENTATIONS_PER_EVENT);
                }

                totalImplementations += implementations.length;

                // Process implementations to ensure they have required fields
                const processedImplementations = implementations.map((impl: any) => ({
                    path: impl.path || '',
                    line: impl.line,
                    function: impl.function,
                    destination: impl.destination,
                    description: impl.description,
                }));

                processedEvents[eventName] = {
                    description: event.description,
                    implementations: processedImplementations,
                    properties: event.properties || {},
                };
            }

            // Create the final scan result
            const scanResult: AnalyticsScanResult = {
                version: 1,
                source: {
                    repository: rawResult.source.repository,
                    commit: rawResult.source.commit,
                    timestamp: rawResult.source.timestamp,
                },
                events: processedEvents,
                metadata: {
                    scanTimestamp: new Date().toISOString(),
                    totalEvents,
                    totalImplementations,
                    scanDuration: inputData.scanDuration,
                    customFunctions: rawResult.customFunctions,
                    ignoredPatterns: rawResult.ignoredPatterns,
                },
            };

            // Validate the final result against our schema
            const validatedResult = validateAnalyticsScanResult(scanResult);

            logger.info(`Successfully converted scan results: ${totalEvents} events, ${totalImplementations} implementations`);

            // save the result to a JSON file
            const schemaFilePath = join(jsonFilePath, '..', 'schema.json');
            await fs.mkdir(join(schemaFilePath, '..'), { recursive: true });
            await fs.writeFile(schemaFilePath, JSON.stringify(validatedResult, null, 2));

            return {
                ...inputData,
                message: `${inputData.message}. Converted to schema successfully.`,
                schemaFilePath,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error(`Failed to convert to schema: ${errorMessage}`);

            return {
                ...inputData,
                success: false,
                message: `${inputData.message}. Failed to convert to schema: ${errorMessage}`,
                schemaFilePath: undefined,
            };
        }
    },
});

const analyticsScanWorkflow = createWorkflow({
    id: 'analytics-scan-workflow',
    inputSchema: z.object({
        dirPath: z.string().describe('The path to the directory to analyze'),
        customFunction: z.array(z.string()).optional().describe('Custom function patterns to search for'),
        ignore: z.array(z.string()).optional().describe('Glob patterns or dirs to ignore'),
        timeoutMs: z.number().int().positive().optional().describe('Kill the process after this many ms'),
        maxOutputBytes: z.number().int().positive().optional().describe('Cap captured stdout size'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        schemaFilePath: z.string().optional().describe('Path to the saved schema file'),
        jsonFilePath: z.string().optional().describe('Path to the saved JSON file'),
        scanDuration: z.number().optional().describe('Duration of the scan in milliseconds'),
        dirPath: z.string(),
    }),
})
    .then(scanAnalyticsCodeStep)
    .then(convertToSchemaStep);

analyticsScanWorkflow.commit();

export { analyticsScanWorkflow };
