
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { gitCloneWorkflow } from './workflows/git-clone-workflow';
import { weatherAgent } from './agents/weather-agent';
import { aatxSearchAgent } from './agents/aatx-agent';
import { PostgresStore } from '@mastra/pg';

// Export tools
export { readFileTool } from './tools/read-file-tool';
export { listDirectoryTool } from './tools/list-directory-tool';
export { grepTool } from './tools/grep-tool';
export { searchFilesTool } from './tools/search-files-tool';
export { searchAnalyticsCodeTool } from './tools/search-analytics-code-tool';
export { gitCloneTool } from './tools/git-clone-tool';

const storage = process.env.DATABASE_URL ? new PostgresStore({
  connectionString: process.env.DATABASE_URL,
}) : new LibSQLStore({
  url: 'file:../mastra.db',
})

export const mastra = new Mastra({
  workflows: { weatherWorkflow, gitCloneWorkflow },
  agents: { weatherAgent, aatxAgent: aatxSearchAgent },
  storage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  // aiSdkCompat: 'v4',
});
