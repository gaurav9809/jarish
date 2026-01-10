
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { PROFESSIONAL_INSTRUCTION } from "../constants";

// --- App Mapping & Tools ---

export const APP_MAPPING: Record<string, string> = {
  "youtube": "https://www.youtube.com",
  "google": "https://www.google.com",
  "spotify": "https://open.spotify.com",
  "gmail": "https://mail.google.com",
  "github": "https://github.com",
  "whatsapp": "https://web.whatsapp.com",
  "netflix": "https://www.netflix.com",
  "twitter": "https://x.com",
  "x": "https://x.com",
  "instagram": "https://www.instagram.com",
  "linkedin": "https://www.linkedin.com",
  "facebook": "https://www.facebook.com"
};

export const openAppFunction: FunctionDeclaration = {
  name: 'openApp',
  description: 'Opens an application or website.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description: 'The name of the app to open.',
      },
    },
    required: ['appName'],
  },
};

export const sendSMSFunction: FunctionDeclaration = {
  name: 'sendSMS',
  description: 'Sends an SMS message.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      recipient: { type: Type.STRING },
      message: { type: Type.STRING },
    },
    required: ['recipient', 'message'],
  },
};

export const getTools = () => [{ functionDeclarations: [openAppFunction, sendSMSFunction] }];

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate = 24000, numChannels = 1): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  return { data: arrayBufferToBase64(int16.buffer), mimeType: 'audio/pcm;rate=16000' };
}

export const createChatSession = (customInstruction?: string): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-flash-preview as the default high-efficiency engine
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { 
      systemInstruction: customInstruction || PROFESSIONAL_INSTRUCTION, 
      tools: getTools(),
      temperature: 0.6 
    },
  });
};

export const getLiveClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY }).live;
