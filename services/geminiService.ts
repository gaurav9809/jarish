
import { PROFESSIONAL_INSTRUCTION } from "../constants";
import { Message } from "../types";

// --- Configuration ---
const LOCAL_PROXY_URL = "http://localhost:3001/api/chat";

// --- Types ---
interface ChatSession {
  sendMessage: (params: { message: string }) => Promise<{ text: string }>;
}

// --- Audio Utilities (Kept for Visualizer) ---
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

// --- DeepSeek R1 Chat Session ---

export const createChatSession = (customInstruction?: string): ChatSession => {
  let history: Message[] = [];
  const systemInstruction = customInstruction || PROFESSIONAL_INSTRUCTION;

  return {
    sendMessage: async ({ message }: { message: string }) => {
      try {
        // Construct User Message
        const userMsg: Message = { 
            id: Date.now().toString(), 
            role: 'user', 
            content: message, 
            timestamp: Date.now() 
        };
        
        history.push(userMsg);
        
        // Prepare payload for OpenRouter (via local proxy)
        const messagesPayload = [
            { role: "system", content: systemInstruction },
            ...history.map(m => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            }))
        ];

        // Keep context window reasonable (DeepSeek has large context, but let's be efficient)
        // We send full history for better reasoning context
        
        const response = await fetch(LOCAL_PROXY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesPayload })
        });

        if (!response.ok) {
            throw new Error(`Proxy Error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.text || "Unknown Error");
        }

        const replyText = data.text;

        // Add assistant reply to history
        history.push({
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: replyText,
            timestamp: Date.now()
        });

        return { text: replyText };

      } catch (error: any) {
        console.error("DeepSeek Link Error:", error);
        history.pop(); // Remove failed message
        throw error;
      }
    }
  };
};

// Mock for compatibility
export const getLiveClient = () => {
    return {
        connect: () => { throw new Error("Using DeepSeek R1 via OpenRouter."); }
    }
};
