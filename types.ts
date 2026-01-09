export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  sources?: string[]; // For search grounding
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
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserData;
}