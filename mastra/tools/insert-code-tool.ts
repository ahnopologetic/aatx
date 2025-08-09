import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';

export const insertCodeTool = createTool({
  id: 'insert-code-tool',
  description:
    'Insert code into a file at an anchor pattern or append/create if not found. Returns the final path and a preview of the diff hunk.',
  inputSchema: z.object({
    filePath: z.string().describe('Absolute path to target file'),
    code: z.string().describe('Code to insert'),
    anchorPattern: z.string().optional().describe('String or regex (as string) to locate insertion point. If omitted, code is appended.'),
    insertPosition: z.enum(['after', 'before', 'replace', 'append']).optional().default('after'),
    createIfMissing: z.boolean().optional().default(true),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string(),
    inserted: z.boolean(),
    message: z.string().optional(),
    preview: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { filePath, code, anchorPattern, insertPosition, createIfMissing } = context;
    const absPath = resolve(filePath);

    try {
      let content = '';
      try {
        content = await readFile(absPath, 'utf8');
      } catch (err) {
        if (!createIfMissing) throw err;
        // Ensure directory exists
        await mkdir(dirname(absPath), { recursive: true });
        content = '';
      }

      let updated = content;
      let inserted = false;
      if (anchorPattern && content) {
        const isRegex = anchorPattern.startsWith('/') && anchorPattern.endsWith('/');
        let idx = -1;
        let matchLen = 0;
        if (isRegex) {
          const body = anchorPattern.slice(1, -1);
          const re = new RegExp(body);
          const m = content.match(re);
          if (m && m.index !== undefined) {
            idx = m.index;
            matchLen = m[0].length;
          }
        } else {
          idx = content.indexOf(anchorPattern);
          matchLen = anchorPattern.length;
        }

        if (idx >= 0) {
          if (insertPosition === 'before') {
            updated = content.slice(0, idx) + code + '\n' + content.slice(idx);
          } else if (insertPosition === 'replace') {
            updated = content.slice(0, idx) + code + '\n' + content.slice(idx + matchLen);
          } else {
            // after (default)
            updated = content.slice(0, idx + matchLen) + '\n' + code + '\n' + content.slice(idx + matchLen);
          }
          inserted = true;
        }
      }

      if (!inserted) {
        // Append
        updated = (content ? content + '\n' : '') + code + '\n';
        inserted = true;
      }

      if (updated !== content) {
        await writeFile(absPath, updated, 'utf8');
      }

      // Build a tiny preview (last ~20 lines)
      const previewLines = updated.split('\n');
      const preview = previewLines.slice(Math.max(0, previewLines.length - 20)).join('\n');

      return {
        success: true,
        filePath: absPath,
        inserted,
        preview,
        message: 'Code inserted successfully',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        filePath: absPath,
        inserted: false,
        message: `Failed to insert code: ${msg}`,
      };
    }
  },
});

export type InsertCodeTool = typeof insertCodeTool;


