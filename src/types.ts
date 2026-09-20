export interface Agent {
  id: string;
  name: string;
  description: string;
  badge: string;
  avatarEmoji: string;
  placeholder: string;
  suggestedPrompts: string[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface SavedResult {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  prompt: string;
  result: string;
  savedAt: {
    seconds: number;
    nanoseconds: number;
  } | Date | any;
  userId: string;
  groundingLinks?: { title: string; uri: string }[];
}

export interface RunOptions {
  tone: string;
  audience: string;
  length: string;
}

export interface UploadedFile {
  name: string;
  size: number;
  mimeType: string;
  contentBase64: string; // Keep base64 safely
  extractedText?: string; // If parsed on backend
}

export type AIProvider = "gemini" | "glm" | "deepseek";

export type DeepSeekModel = "deepseek-chat" | "deepseek-reasoner";

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  costUSD: number;
  costEUR: number;
  provider?: AIProvider;
  model?: string;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  agentId?: string;
  phase?: string;
  provider?: AIProvider;
  model?: string;
  projectName?: string;
  errorMessage: string;
  technicalDetails?: string;
  statusCode?: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  prompt?: string;
  files: UploadedFile[];
  extractedText?: string;
  provider?: AIProvider;
  model?: string;
  phase1Result?: string;
  phase2Result?: string;
  phase2ApiLogs?: string;
  phase3Result?: string;
  phase2Links?: { title: string; uri: string }[];
  status: {
    phase1: "idle" | "running" | "completed" | "error";
    phase2: "idle" | "running" | "completed" | "error";
    phase3: "idle" | "running" | "completed" | "error";
  };
  errors?: {
    phase1?: string;
    phase2?: string;
    phase3?: string;
  };
  usage?: {
    phase1?: TokenUsage;
    phase2?: TokenUsage;
    phase3?: TokenUsage;
  };
  isDemo?: boolean;
}
