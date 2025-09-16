import { NewAgentNetwork } from '@mastra/core/network/vNext';

import { vertex } from '@ai-sdk/google-vertex';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { aatxSearchAgent } from '../agents/aatx-agent';
import { aatxDiscovererAgent } from '../agents/aatx-discoverer-agent';
import { RuntimeContext } from '@mastra/core/runtime-context';


const storage = new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
});

export const exploreNetwork = new NewAgentNetwork({
    id: 'exploreNetwork',
    name: 'Explore Network',
    model: vertex('gemini-2.5-flash'),
    instructions: `
    You are a codebase explorer system that routes tasks to the appropriate agents.

    Your available agents are:
    - aatxSearchAgent: AATX Search Agent, this agent is responsible for searching the codebase for analytics and tracking code.
    - aatxDiscovererAgent: AATX Discoverer Agent, this agent is responsible for discovering the codebase and generating a map of screens and their navigation links.

    For each user query:
    1. Start by routing the task to the aatxDiscovererAgent to discover the codebase and generate a map of screens and their navigation links.
    2. Then route the task to the aatxSearchAgent to search the codebase for analytics and tracking code.
    3. Finally, return the results to the user.

    Always maintain a chain of evidence and proper attribution between agents.
    `,
    agents: {
        aatxSearchAgent,
        aatxDiscovererAgent,
    },
    memory: new Memory({
        storage,
    }),
})

