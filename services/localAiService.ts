
import { Message } from "../types";

// DeepSeek R1 - Advanced Reasoning Model
const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL_ID = "deepseek-reasoner"; // R1

export interface ChatSession {
  sendMessage: (params: { message: string | any }) => Promise<{ text: string }>;
}

export const getApiKey = () => {
  // 1. Try Vercel/Node Env
  if (typeof process !== 'undefined' && process.env && process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_API_KEY;
  }
  // 2. Try Browser Window Env (if injected)
  if ((window as any).process?.env?.DEEPSEEK_API_KEY) {
    return (window as any).process.env.DEEPSEEK_API_KEY;
  }
  // 3. Try LocalStorage (Manual override for users)
  return localStorage.getItem('deepseek_api_key') || "";
};

export const createLocalChatSession = (systemInstruction: string): ChatSession => {
  const history: any[] = [];

  return {
    sendMessage: async ({ message }) => {
      const content = typeof message === 'string' ? message : message.parts[0].text;
      const userMsg = { role: 'user', content: content };
      const apiKey = getApiKey();

      if (!apiKey) {
          return { 
              text: "⚠️ **SYSTEM ALERT**: DeepSeek API Key is missing.\n\nPlease add `DEEPSEEK_API_KEY` to your Vercel Environment Variables." 
          };
      }

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: MODEL_ID,
            messages: [
              { role: 'system', content: systemInstruction },
              ...history,
              userMsg
            ],
            stream: false,
            temperature: 0.6
          })
        });

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           throw new Error(errorData.error?.message || `DeepSeek API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // DeepSeek R1 returns 'content' (final answer). 
        // It may also return 'reasoning_content', but for Siya we focus on the result.
        const responseText = data.choices[0].message.content;

        history.push(userMsg);
        history.push({ role: 'assistant', content: responseText });

        // Maintain context window to save tokens
        if (history.length > 10) history.splice(0, 2);

        return { text: responseText };

      } catch (error: any) {
        console.error("DeepSeek Uplink Error:", error);
        return { text: `⚠️ **Neural Uplink Failed**: ${error.message}` };
      }
    }
  };
};

export const APP_MAPPING: Record<string, string> = {
  "youtube": "https://www.youtube.com",
  "google": "https://www.google.com",
  "spotify": "https://open.spotify.com"
};
