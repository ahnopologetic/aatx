
import { Mastra } from '@mastra/core/mastra';
import { VercelDeployer } from "@mastra/deployer-vercel";
import { LibSQLStore } from '@mastra/libsql';
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

const storage = process.env.DATABASE_URL ? new PostgresStore({
  connectionString: process.env.DATABASE_URL,
}) : new LibSQLStore({
  url: 'file:../mastra.db',
})

export const mastra = new Mastra({
  agents: { aatxAgent: aatxSearchAgent },
  workflows: { gitCloneWorkflow },
  storage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  // aiSdkCompat: 'v4',
  deployer: new VercelDeployer()
});
