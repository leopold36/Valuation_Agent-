export interface Project {
  id: number;
  name: string;
  description: string;
  investment_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Method {
  id: number;
  project_id: number;
  method_type: string;
  weight: number;
  calculated_value?: number;
  last_calculated?: string;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: number;
  method_id: number;
  metric_key: string;
  metric_value: string;
  metric_type?: string;
  created_at: string;
  updated_at: string;
}

export interface ValuationResult {
  finalValuation: number | null;
  methods: MethodResult[];
  errors: any[];
  success: boolean;
}

export interface MethodResult {
  methodId: number;
  methodType: string;
  weight: number;
  calculatedValue: number;
  result: any;
  executionTime: number;
}

export interface WeightSuggestion {
  weights: { [methodType: string]: number };
  rationale: string;
}

export interface HealthCheck {
  claude: boolean;
  database: boolean;
  overall: boolean;
}

export interface AgentMessage {
  type: 'text' | 'code' | 'result' | 'thinking' | 'tool_call' | 'executing' | 'user';
  content: string;
  metadata?: {
    tool?: string;
    language?: string;
    executionTime?: number;
    success?: boolean;
    timestamp?: number;
  };
  timestamp: Date;
}

export interface AgentResponse {
  messages: AgentMessage[];
  done: boolean;
  finalValuation?: any;
}

// Terminal message types for the unified interface
export type TerminalMessageType =
  | 'user'
  | 'assistant_text'
  | 'tool_call_start'
  | 'code_block'
  | 'executing'
  | 'result'
  | 'error'
  | 'thinking'
  | 'valuation_result'
  | 'method_valuation_result';

export interface TerminalMessage {
  id: string;
  type: TerminalMessageType;
  content: string;
  timestamp: Date;
  metadata?: {
    tool?: string;
    language?: string;
    executionTime?: number;
    success?: boolean;
    code?: string;
    valuationValue?: number;
    methodType?: string;
  };
}

// Database conversation storage types
export interface ConversationThread {
  id: number;
  project_id: number;
  title: string | null;
  started_at: string;
  last_message_at: string;
  status: 'active' | 'archived';
}

export interface ConversationMessage {
  id: number;
  thread_id: number;
  type: TerminalMessageType;
  content: string;
  metadata: any | null;
  created_at: string;
  sequence_number: number;
}

export interface TableInfo {
  name: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface ElectronAPI {
  projects: {
    getAll: () => Promise<Project[]>;
    create: (name: string, description?: string) => Promise<Project>;
    get: (id: number) => Promise<Project>;
    delete: (id: number) => Promise<boolean>;
  };
  db: {
    getTables: () => Promise<TableInfo[]>;
    getTableSchema: (tableName: string) => Promise<ColumnInfo[]>;
    getTableData: (tableName: string) => Promise<any[]>;
  };
  methods: {
    create: (projectId: number, methodType: string, weight: number) => Promise<Method>;
    getByProject: (projectId: number) => Promise<Method[]>;
    update: (id: number, data: Partial<Method>) => Promise<Method>;
    delete: (id: number) => Promise<boolean>;
  };
  metrics: {
    create: (methodId: number, key: string, value: string, type?: string) => Promise<Metric>;
    createBatch: (methodId: number, metricsData: Array<{key: string, value: string, type?: string}>) => Promise<Metric[]>;
    getByMethod: (methodId: number) => Promise<Metric[]>;
    update: (id: number, value: string) => Promise<Metric>;
    delete: (id: number) => Promise<boolean>;
  };
  valuation: {
    execute: (projectId: number) => Promise<ValuationResult>;
    suggestWeights: (projectId: number) => Promise<WeightSuggestion>;
    applyWeights: (projectId: number, weights: { [key: string]: number }) => Promise<{ success: boolean }>;
    explainResult: (methodId: number) => Promise<string>;
    healthCheck: () => Promise<HealthCheck>;
    onProgress: (projectId: number, callback: (message: string) => void) => () => void;
  };
  agent: {
    startValuation: (projectId: number) => Promise<{ success: boolean; response?: AgentResponse; error?: string }>;
    sendMessage: (projectId: number, message: string) => Promise<{ success: boolean; response?: AgentResponse; error?: string }>;
    clearConversation: (projectId: number) => Promise<{ success: boolean; error?: string }>;
  };
  threads: {
    getByProject: (projectId: number) => Promise<ConversationThread[]>;
    getMessages: (threadId: number) => Promise<ConversationMessage[]>;
    archiveThread: (threadId: number) => Promise<ConversationThread>;
    deleteThread: (threadId: number) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}