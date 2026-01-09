export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  sources?: string[]; // For search grounding
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';