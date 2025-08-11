import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve, join } from 'path';
import { readdir, stat } from 'fs/promises';

const execAsync = promisify(exec);

type ProviderId = 'posthog' | 'mixpanel' | 'segment' | 'amplitude' | 'ga4' | 'unknown';

interface Candidate {
  filePath: string;
  anchorPattern: string;
  confidence: number; // 0..1
  rationale: string;
}

const providerPatterns: Array<{
  id: ProviderId;
  callPatterns: string[];
  fileNameHints: string[];
}> = [
  {
    id: 'posthog',
    callPatterns: ['posthog.capture(', 'posthog.identify(', 'usePostHog('],
    fileNameHints: ['posthog.ts', 'posthog.js', 'posthog-client.ts', 'posthog-client.js'],
  },
  {
    id: 'mixpanel',
    callPatterns: ['mixpanel.track(', 'mixpanel.identify(', 'Mixpanel.init('],
    fileNameHints: ['mixpanel.ts', 'mixpanel.js'],
  },
  {
    id: 'segment',
    callPatterns: ['analytics.track(', 'window.analytics.track(', 'analytics.identify('],
    fileNameHints: ['analytics.ts', 'analytics.js', 'segment.ts', 'segment.js'],
  },
  {
    id: 'amplitude',
    callPatterns: ['amplitude.track(', 'amplitude.getInstance('],
    fileNameHints: ['amplitude.ts', 'amplitude.js'],
  },
  {
    id: 'ga4',
    callPatterns: ["gtag('event',", 'gtag("event",', 'dataLayer.push({'],
    fileNameHints: ['gtag.ts', 'gtag.js', 'ga.ts', 'ga.js'],
  },
];

async function recursiveList(dir: string, depth = 0, maxDepth = 8): Promise<string[]> {
  if (depth > maxDepth) return [];
  const entries = await readdir(dir).catch(() => []);
  const results: string[] = [];
  for (const entry of entries) {
    if (['node_modules', '.git', 'build', 'dist', '.next'].includes(entry)) continue;
    const p = join(dir, entry);
    const st = await stat(p).catch(() => undefined);
    if (!st) continue;
    if (st.isDirectory()) {
      results.push(...(await recursiveList(p, depth + 1, maxDepth)));
    } else if (st.isFile()) {
      results.push(p);
    }
  }
  return results;
}

export const findInsertionPointsTool = createTool({
  id: 'find-insertion-points-tool',
  description:
    'Analyze a cloned repository to determine the most appropriate files and anchors to insert analytics events. Returns ranked candidates and detected provider.',
  inputSchema: z.object({
    rootPath: z.string().describe('Absolute path to the cloned repository root'),
    preferredProvider: z
      .enum(['posthog', 'mixpanel', 'segment', 'amplitude', 'ga4', 'unknown'])
      .optional()
      .describe('Hint for provider to prefer if multiple are detected'),
    maxResults: z.number().optional().default(5),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    provider: z.enum(['posthog', 'mixpanel', 'segment', 'amplitude', 'ga4', 'unknown']),
    candidates: z
      .array(
        z.object({
          filePath: z.string(),
          anchorPattern: z.string(),
          confidence: z.number(),
          rationale: z.string(),
        }),
      )
      .describe('Ranked insertion points'),
    rootPath: z.string(),
    message: z.string().optional(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { rootPath, preferredProvider, maxResults } = context;
    const absRoot = resolve(rootPath);

    try {
      // 1) Quick filename-based hints
      const files = await recursiveList(absRoot);
      const filenameCandidates: Candidate[] = [];
      for (const provider of providerPatterns) {
        const hints = files.filter((f) =>
          provider.fileNameHints.some((hint) => f.endsWith(hint)),
        );
        for (const filePath of hints) {
          filenameCandidates.push({
            filePath,
            anchorPattern: provider.callPatterns[0] || provider.fileNameHints[0] || 'track(',
            confidence: 0.7,
            rationale: `File name suggests ${provider.id} provider`,
          });
        }
      }

      // 2) Grep for call patterns to strengthen candidates
      const grepMatches: Array<{ provider: ProviderId; file: string; count: number; pattern: string }>[] = [];
      for (const provider of providerPatterns) {
        const resultsForProvider: Array<{ provider: ProviderId; file: string; count: number; pattern: string }> = [];
        for (const pattern of provider.callPatterns) {
          try {
            const { stdout } = await execAsync(
              `grep -r -n -H -i -F "${pattern}" "${absRoot}" | awk -F: '{print $1}' | sort | uniq -c`,
            );
            const lines = stdout
              .trim()
              .split('\n')
              .filter((l) => l.trim().length > 0);
            for (const l of lines) {
              const m = l.trim().match(/^(\d+)\s+(.*)$/);
              if (m) {
                resultsForProvider.push({
                  provider: provider.id,
                  count: parseInt(m[1], 10),
                  file: m[2],
                  pattern,
                });
              }
            }
          } catch {}
        }
        grepMatches.push(resultsForProvider);
      }

      const flattened = grepMatches.flat();
      const providerScores = new Map<ProviderId, number>();
      for (const m of flattened) {
        providerScores.set(m.provider, (providerScores.get(m.provider) || 0) + m.count);
      }

      let detected: ProviderId = 'unknown';
      let bestScore = 0;
      for (const [prov, score] of providerScores.entries()) {
        if (score > bestScore) {
          bestScore = score;
          detected = prov;
        }
      }

      if (preferredProvider && preferredProvider !== 'unknown') {
        // Slightly bias towards preferred provider
        if (providerScores.get(preferredProvider) || detected === 'unknown') {
          detected = preferredProvider;
        }
      }

      const candidates: Candidate[] = [];
      // Add grep-based candidates for detected provider
      if (detected !== 'unknown') {
        const prov = providerPatterns.find((p) => p.id === detected)!;
        const matches = flattened.filter((m) => m.provider === detected);
        // Rank by count desc
        matches.sort((a, b) => b.count - a.count);
        for (const m of matches) {
          candidates.push({
            filePath: m.file,
            anchorPattern: prov.callPatterns[0] || 'track(',
            confidence: Math.min(0.6 + Math.log10(m.count + 1) * 0.2, 0.9),
            rationale: `File contains ${detected} calls (pattern '${m.pattern}')`,
          });
        }
      }

      // Merge filename-based candidates, prefer those matching detected provider
      for (const c of filenameCandidates) {
        if (!candidates.find((x) => x.filePath === c.filePath)) {
          candidates.push(c);
        }
      }

      // Fallback: search common central files
      if (candidates.length === 0) {
        const common = files.filter((f) => /analytics|tracking|events|posthog|mixpanel|segment|amplitude|gtag/i.test(f));
        for (const f of common) {
          candidates.push({
            filePath: f,
            anchorPattern: 'track(',
            confidence: 0.4,
            rationale: 'Common analytics-related filename',
          });
        }
      }

      // Final fallback: suggest creating a helper in src/lib/analytics-events.ts
      if (candidates.length === 0) {
        candidates.push({
          filePath: join(absRoot, 'src', 'lib', 'analytics-events.ts'),
          anchorPattern: 'export function trackEvent(',
          confidence: 0.3,
          rationale: 'No existing analytics file found; suggest new helper location',
        });
      }

      // Deduplicate and cap results
      const seen = new Set<string>();
      const unique = candidates.filter((c) => {
        if (seen.has(c.filePath)) return false;
        seen.add(c.filePath);
        return true;
      });

      const limited = unique.slice(0, maxResults);

      logger?.info(
        `Detected provider=${detected}, returning ${limited.length}/${unique.length} candidate insertion points`,
      );

      return {
        success: true,
        provider: detected as 'posthog' | 'mixpanel' | 'segment' | 'amplitude' | 'ga4' | 'unknown',
        candidates: limited,
        rootPath: absRoot,
        message: `Detected provider=${detected}`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        provider: 'unknown' as 'posthog' | 'mixpanel' | 'segment' | 'amplitude' | 'ga4' | 'unknown',
        candidates: [],
        rootPath: absRoot,
        message: `Failed to analyze repository: ${msg}`,
      };
    }
  },
});

export type FindInsertionPointsTool = typeof findInsertionPointsTool;


