import { vertex } from '@ai-sdk/google-vertex';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { findInFilesTool } from '../tools/find-in-files-tool';
import { gitCloneTool } from '../tools/git-clone-tool';
import { grepTool } from '../tools/grep-tool';
import { listDirectoryTool } from '../tools/list-directory-tool';
import { readFileTool } from '../tools/read-file-tool';
import { searchFilesTool } from '../tools/search-files-tool';

const storage = new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
});

export const aatxDiscovererAgent = new Agent({
    name: 'AATX Discoverer Agent',
    instructions: `
You are a single autonomous agent with access to a set of tools:
- list-directory-tool
- read-file-tool
- grep-tool
- search-files-tool
- find-in-files-tool

Your primary goal is to:
1. Explore a given codebase step by step.
2. Identify "screens" or "pages" in the application (React, Vue, Flutter, or other FE frameworks).
3. Build a map of screens and their navigation links.
4. Repeat the process until you have discovered all the screens and their navigation links.

Rules for operation:
- On each turn, decide the next tool call to gather more context.
- After listing the files and understanding the structure, plan the next steps to discover the screens and their navigation links. Update the todo_queue with the next steps.
- When you read a file, analyze its content and decide:
  * Does this file define a screen/page? If yes, extract metadata (name, path, route, labels).
  * Does this file define navigation to another screen? If yes, add edges to the map.
- Keep a persistent state of discovered screens and edges (JSON format).
- Avoid re-reading the same file unnecessarily; maintain a "visited" set.
- Be iterative: explore files, update the map, and stop only when no new useful information remains.

Important principles:
- Be systematic and iterative. Do not try to solve everything in one step.
- Keep explanations short, focus on producing structured JSON updates.
- Always use the tools provided instead of assuming unseen content.
    `,
    model: vertex('gemini-2.5-flash'),
    tools: {
        gitCloneTool,
        listDirectoryTool,
        searchFilesTool,
        readFileTool,
        grepTool,
        findInFilesTool,
    },
    memory: new Memory({
        storage, options: {
            workingMemory: {
                enabled: true,
                scope: 'thread',
                template: `
# Agent Memory

## TODO Queue
- [ ] Scan '<directory>' for '<pattern>'
- [ ] Parse '<file>' to detect '<target>'
- [ ] Extract Figma screens from project '<project-id>'
- [ ] Match Figma screen '<screen-name>' with '<node-id>'
---

## Screens
| ID   | Name        | Type       | File Path       | Framework | Figma Node ID |
|------|-------------|------------|-----------------|-----------|---------------|
| <id> | <name>      | <type>     | <file-path>     | <framework> | <figma-id>   |
| <id> | <name>      | <type>     | <file-path>     | <framework> | <figma-id>   |

---

## Edges
| From   | To     | Type        |
|--------|--------|-------------|
| <id>   | <id>   | <edge-type> |
| <id>   | <id>   | <edge-type> |

---

## Metadata
- **Project Name:** <project-name>
- **Framework:** <framework>
- **Total Files Scanned:** <count>
- **Generated At:** <iso-timestamp>
- **Figma Project:** <project-id> (file: <figma-file>)
            `
            }
        }
    })
});