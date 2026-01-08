export enum JarvisMode {
  GENERAL = 'GENERAL',
  STUDY = 'STUDY',
  CODE = 'CODE',
  SEARCH = 'SEARCH',
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  sources?: string[]; // For search grounding
}

export interface JarvisConfig {
  mode: JarvisMode;
  systemInstruction: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
