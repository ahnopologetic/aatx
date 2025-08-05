import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const TrackingEventSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    properties: z.record(z.string(), z.any()).optional(),
    implementation: z.array(z.object({
        path: z.string(),
        line: z.number(),
        function: z.string().optional(),
        destination: z.string().optional(),
    })).optional(),
    isNew: z.boolean().optional(),
});

const ExportRequestSchema = z.object({
    repositoryUrl: z.string(),
    analyticsProviders: z.array(z.string()),
    trackingEvents: z.array(TrackingEventSchema),
    spreadsheetTitle: z.string().optional(),
});

type TrackingEvent = z.infer<typeof TrackingEventSchema>;
type ExportRequest = z.infer<typeof ExportRequestSchema>;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = ExportRequestSchema.parse(body);

        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
        const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!;

        if (!serviceAccountEmail || !serviceAccountPrivateKey) {
            return Response.json(
                {
                    error: 'Missing Google Service Account credentials. Please configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables.',
                    code: 'MISSING_CREDENTIALS'
                },
                { status: 500 }
            );
        }

        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: serviceAccountPrivateKey.replace(/\\n/g, '\n'),
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file',
            ],
        });


        // Create a new Google Spreadsheet
        const spreadsheetTitle = validatedData.spreadsheetTitle ||
            `Analytics Tracking Plan - ${new URL(validatedData.repositoryUrl).pathname.replace('/', '').replace('/', '-')} - ${new Date().toLocaleDateString()}`;
        const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(serviceAccountAuth, {
            title: spreadsheetTitle,
        });

        // Create the spreadsheet

        await doc.addSheet({
            headerValues: [
                'Property',
                'Value',
                'Type',
                'Description',
                'Implementation Files',
                'Implementation Lines',
                'Functions',
                'Destinations',
                'Status'
            ]
        });

        // Add project overview sheet
        const overviewSheet = doc.sheetsByIndex[0];
        await overviewSheet.updateProperties({ title: 'Project Overview' });

        // Set up overview sheet headers and data
        await overviewSheet.setHeaderRow([
            'Property',
            'Value'
        ]);

        const overviewData = [
            ['Repository URL', validatedData.repositoryUrl],
            ['Analytics Providers', validatedData.analyticsProviders.join(', ')],
            ['Total Events', validatedData.trackingEvents.length.toString()],
            ['New Events', validatedData.trackingEvents.filter(e => e.isNew).length.toString()],
            ['Detected Events', validatedData.trackingEvents.filter(e => !e.isNew).length.toString()],
            ['Export Date', new Date().toLocaleString()],
        ];

        await overviewSheet.addRows(overviewData);

        // Format overview sheet
        await overviewSheet.loadCells('A1:B10');
        for (let i = 0; i < overviewData.length + 1; i++) {
            const headerCell = overviewSheet.getCell(i, 0);
            headerCell.textFormat = { bold: true };
            headerCell.backgroundColor = { red: 0.9, green: 0.9, blue: 0.9 };
        }

        // Add tracking events sheet
        const eventsSheet = await doc.addSheet({
            title: 'Tracking Events',
            headerValues: [
                'Event Name',
                'Description',
                'Type',
                'Properties',
                'Implementation Files',
                'Implementation Lines',
                'Functions',
                'Destinations',
                'Status'
            ]
        });

        // Prepare events data
        const eventsData = validatedData.trackingEvents.map((event: TrackingEvent) => {
            const properties = event.properties ?
                Object.entries(event.properties)
                    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                    .join('\n') : '';

            const implementationFiles = event.implementation?.map(impl => impl.path).join('\n') || '';
            const implementationLines = event.implementation?.map(impl => impl.line.toString()).join('\n') || '';
            const functions = event.implementation?.map(impl => impl.function || '').join('\n') || '';
            const destinations = event.implementation?.map(impl => impl.destination || '').join('\n') || '';

            return [
                event.name,
                event.description || '',
                event.isNew ? 'Manual' : 'Detected',
                properties,
                implementationFiles,
                implementationLines,
                functions,
                destinations,
                event.isNew ? 'New' : 'Existing'
            ];
        });

        await eventsSheet.addRows(eventsData);

        // Format events sheet headers
        await eventsSheet.loadCells('A1:I1');
        for (let col = 0; col < 9; col++) {
            const headerCell = eventsSheet.getCell(0, col);
            headerCell.textFormat = { bold: true };
            headerCell.backgroundColor = { red: 0.2, green: 0.4, blue: 0.8 };
            headerCell.textFormat.foregroundColor = { red: 1, green: 1, blue: 1 };
        }

        // Auto-resize columns
        await eventsSheet.resize({ columnCount: 9, rowCount: 100 });

        // Add analytics providers sheet
        const providersSheet = await doc.addSheet({
            title: 'Analytics Providers',
            headerValues: [
                'Provider Name',
                'Type',
                'Events Using Provider',
                'Description'
            ]
        });

        const providersData = validatedData.analyticsProviders.map(provider => {
            const eventsUsingProvider = validatedData.trackingEvents.filter(event =>
                event.implementation?.some(impl =>
                    impl.destination?.toLowerCase().includes(provider.toLowerCase())
                )
            ).length;

            return [
                provider,
                'Analytics Platform',
                eventsUsingProvider.toString(),
                `Analytics tracking provider configured in the repository`
            ];
        });

        await providersSheet.addRows(providersData);

        // Format providers sheet headers
        await providersSheet.loadCells('A1:D1');
        for (let col = 0; col < 4; col++) {
            const headerCell = providersSheet.getCell(0, col);
            headerCell.textFormat = { bold: true };
            headerCell.backgroundColor = { red: 0.2, green: 0.6, blue: 0.4 };
            headerCell.textFormat.foregroundColor = { red: 1, green: 1, blue: 1 };
        }

        // Add implementation summary sheet
        const implementationSheet = await doc.addSheet({
            title: 'Implementation Summary',
            headerValues: [
                'File Path',
                'Line Number',
                'Function',
                'Event Name',
                'Destination',
                'Type'
            ]
        });

        const implementationData: string[][] = [];
        validatedData.trackingEvents.forEach(event => {
            if (event.implementation) {
                event.implementation.forEach(impl => {
                    implementationData.push([
                        impl.path,
                        impl.line.toString(),
                        impl.function || '',
                        event.name,
                        impl.destination || '',
                        event.isNew ? 'Manual' : 'Detected'
                    ]);
                });
            }
        });

        if (implementationData.length > 0) {
            await implementationSheet.addRows(implementationData);
        }

        // Format implementation sheet headers
        await implementationSheet.loadCells('A1:F1');
        for (let col = 0; col < 6; col++) {
            const headerCell = implementationSheet.getCell(0, col);
            headerCell.textFormat = { bold: true };
            headerCell.backgroundColor = { red: 0.6, green: 0.2, blue: 0.6 };
            headerCell.textFormat.foregroundColor = { red: 1, green: 1, blue: 1 };
        }

        // Make the spreadsheet publicly viewable (optional)
        try {
            await doc.share('anyone', {
                role: 'reader',
            });
        } catch (error) {
            console.warn('Could not make spreadsheet public:', error);
        }

        // Save all changes
        // await doc.saveUpdatedCells();

        return Response.json({
            success: true,
            spreadsheetId: doc.spreadsheetId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${doc.spreadsheetId}`,
            title: spreadsheetTitle,
            sheets: [
                'Project Overview',
                'Tracking Events',
                'Analytics Providers',
                'Implementation Summary'
            ],
            summary: {
                totalEvents: validatedData.trackingEvents.length,
                newEvents: validatedData.trackingEvents.filter(e => e.isNew).length,
                detectedEvents: validatedData.trackingEvents.filter(e => !e.isNew).length,
                analyticsProviders: validatedData.analyticsProviders.length,
                implementationLocations: implementationData.length
            }
        });

    } catch (error) {
        console.error('Google Sheets export error:', error);

        if (error instanceof z.ZodError) {
            return Response.json(
                {
                    error: 'Invalid request data',
                    details: error.errors,
                    code: 'VALIDATION_ERROR'
                },
                { status: 400 }
            );
        }

        console.error({ error })

        return Response.json(
            {
                error: 'Failed to export to Google Sheets',
                message: error instanceof Error ? error.message : 'Unknown error',
                code: 'EXPORT_FAILED'
            },
            { status: 500 }
        );
    }
}

// GET method to check service status
export async function GET() {
    const hasCredentials = !!(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    );

    return Response.json({
        service: 'Google Sheets Export',
        status: hasCredentials ? 'configured' : 'missing_credentials',
        message: hasCredentials
            ? 'Google Sheets export service is ready'
            : 'Please configure Google Service Account credentials',
        requiredEnvVars: [
            'GOOGLE_SERVICE_ACCOUNT_EMAIL',
            'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'
        ]
    });
}
