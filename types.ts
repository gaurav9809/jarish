
export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  sources?: string[]; // For search grounding
  isCall?: boolean; // Flag for call log entries
  callDuration?: number; // Duration for call log
  reaction?: string; // New: Emoji reaction to the message
}

export interface CallLog {
  id: string;
  type: 'incoming' | 'outgoing';
  startTime: number;
  duration: number; // in seconds
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UserData {
  identity: string; // Email or Mobile acting as ID
  password?: string; // Simple hash/string for local demo
  fullName: string;
  history: {
    professional: Message[];
    personal: Message[];
  };
  callLogs: CallLog[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserData;
}
