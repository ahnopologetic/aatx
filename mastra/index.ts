
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';
import { aatxSearchAgent } from './agents/aatx-agent';
import { gitCloneWorkflow } from './workflows/git-clone-workflow';

// Export tools
export { gitCloneTool } from './tools/git-clone-tool';
export { grepTool } from './tools/grep-tool';
export { listDirectoryTool } from './tools/list-directory-tool';
export { readFileTool } from './tools/read-file-tool';
export { searchAnalyticsCodeTool } from './tools/search-analytics-code-tool';
export { searchFilesTool } from './tools/search-files-tool';

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL!,
});

export const mastra = new Mastra({
  agents: { aatxAgent: aatxSearchAgent },
  workflows: { gitCloneWorkflow },
  storage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  // aiSdkCompat: 'v4',
});
