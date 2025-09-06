
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';

import { aatxSearchAgent } from './agents/aatx-agent';
import { aatxCoderAgent } from './agents/aatx-coder-agent';
import { aatxCodeValidatorAgent } from './agents/aatx-code-validator-agent';
import { gitCloneWorkflow } from './workflows/git-clone-workflow';
import { gitCommitAndCreatePrWorkflow } from './workflows/git-commit-and-create-pr-workflow';
import { analyticsScanWorkflow } from './workflows/analytics-scan-workflow';

// Export tools
export { findInFilesTool } from './tools/find-in-files-tool';
export { findInsertionPointsTool } from './tools/find-insertion-points-tool';
export { generateAnalyticsSnippetTool } from './tools/generate-analytics-snippet-tool';
export { gitCloneTool } from './tools/git-clone-tool';
export { grepTool } from './tools/grep-tool';
export { insertCodeTool } from './tools/insert-code-tool';
export { listDirectoryTool } from './tools/list-directory-tool';
export { readFileTool } from './tools/read-file-tool';
export { searchAnalyticsCodeTool } from './tools/search-analytics-code-tool';
export { searchFilesTool } from './tools/search-files-tool';

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL!,
});

// NOTE: local only
// const storage = new LibSQLStore({
//   url: "file:../../memory.db",
// });

export const mastra = new Mastra({
  agents: { aatxAgent: aatxSearchAgent, aatxCoder: aatxCoderAgent, aatxCodeValidator: aatxCodeValidatorAgent },
  workflows: { gitCloneWorkflow, gitCommitAndCreatePrWorkflow, analyticsScanWorkflow },
  storage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  // aiSdkCompat: 'v4',
});
