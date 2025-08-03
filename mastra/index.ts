
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { gitCloneWorkflow } from './workflows/git-clone-workflow';
import { weatherAgent } from './agents/weather-agent';
import { aatxSearchAgent } from './agents/aatx-agent';

// Export tools
export { readFileTool } from './tools/read-file-tool';
export { listDirectoryTool } from './tools/list-directory-tool';
export { grepTool } from './tools/grep-tool';
export { searchFilesTool } from './tools/search-files-tool';
export { searchAnalyticsCodeTool } from './tools/search-analytics-code-tool';
export { gitCloneTool } from './tools/git-clone-tool';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, gitCloneWorkflow },
  agents: { weatherAgent, aatxAgent: aatxSearchAgent },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
