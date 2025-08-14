export type EventProperty = {
  description?: string;
  type?: string;
};

export type Implementation = {
  path: string;
  line?: number;
  function?: string;
  destination?: string;
  description?: string;
};

export type EventsMap = Record<
  string,
  {
    description?: string;
    implementations: Implementation[];
    properties: Record<string, EventProperty>;
  }
>;

export type RepoDetails = {
  repository?: string | null;
  commit?: string | null;
  timestamp: string; // ISO 8601
};

export type CustomFunctionParameter = {
  name: string;
  isEventName?: boolean;
  isProperties?: boolean;
};

export type CustomFunctionSignature = {
  functionName: string;
  parameters: CustomFunctionParameter[];
};

export declare function analyzeDirectory(
  dirPath: string,
  customFunctions?: string[] | CustomFunctionSignature[] | null,
  ignore?: string[]
): Promise<EventsMap>;

export declare function getRepoDetails(
  targetDir: string,
  customSourceDetails?: {
    repositoryUrl?: string;
    commitHash?: string;
    commitTimestamp?: string; // ISO 8601
  }
): Promise<RepoDetails>;

export declare function generateYamlSchema(
  events: EventsMap,
  repository: RepoDetails,
  outputPath: string,
  stdout?: boolean
): void;

export declare function generateJsonSchema(
  events: EventsMap,
  repository: RepoDetails,
  outputPath: string,
  stdout?: boolean
): void;

export declare function generateDescriptions(
  events: EventsMap,
  targetDir: string,
  llm: unknown
): Promise<EventsMap>;

export declare function run(
  targetDir: string,
  outputPath: string,
  customFunctions: string[] | undefined,
  customSourceDetails: {
    repositoryUrl?: string;
    commitHash?: string;
    commitTimestamp?: string;
  } | undefined,
  generateDescription: boolean,
  provider: 'openai' | 'gemini',
  model: string,
  stdout?: boolean,
  format?: 'yaml' | 'json'
): Promise<void>;


