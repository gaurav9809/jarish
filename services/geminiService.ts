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
  description: 'Opens a specified application or website in a new tab. Supported apps: YouTube, Google, Spotify, Gmail, GitHub, WhatsApp, Netflix, Twitter, Instagram, LinkedIn, Facebook.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description: 'The name of the application or website to open.',
      },
    },
    required: ['appName'],
  },
};

export const sendSMSFunction: FunctionDeclaration = {
  name: 'sendSMS',
  description: 'Sends an SMS message to a specific phone number. Use this when the user explicitly asks to send a text or SMS.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      recipient: {
        type: Type.STRING,
        description: 'The phone number or name of the recipient.',
      },
      message: {
        type: Type.STRING,
        description: 'The content of the SMS message.',
      },
    },
    required: ['recipient', 'message'],
  },
};

export const getTools = () => {
  // Strict rule: googleSearch cannot be used with other tools. 
  // We prioritize Function Declarations (App Control) for this assistant.
  return [
    { functionDeclarations: [openAppFunction, sendSMSFunction] }
  ];
};

// --- Live API Helpers ---

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Instantiate client dynamically
export const createChatSession = (customInstruction?: string): Chat => {
  const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';
  
  if (!apiKey) {
      console.warn("API Key is missing! Ensure process.env.API_KEY is set.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const modelId = 'gemini-3-flash-preview'; 
  const tools = getTools();
  
  const instruction = customInstruction || PROFESSIONAL_INSTRUCTION;

  return ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: instruction,
      tools: tools,
    },
  });
};

export const getLiveClient = () => {
  const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';
  const ai = new GoogleGenAI({ apiKey });
  return ai.live;
};