
import { Message } from "../types";

// Llama 3.2 3B Instruct - Lightweight and fast for deployed apps
const HF_MODEL = "meta-llama/Llama-3.2-3B-Instruct";
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`;

export interface ChatSession {
  sendMessage: (params: { message: string | any }) => Promise<{ text: string }>;
}

export const createLocalChatSession = (systemInstruction: string): ChatSession => {
  const history: any[] = [];

  return {
    sendMessage: async ({ message }) => {
      const content = typeof message === 'string' ? message : message.parts[0].text;
      const userMsg = { role: 'user', content: content };
      
      // Get token from window.process.env or global process
      const token = (window as any).process?.env?.HF_TOKEN || "";

      try {
        const response = await fetch(HF_API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            model: HF_MODEL,
            messages: [
              { role: 'system', content: systemInstruction },
              ...history,
              userMsg
            ],
            max_tokens: 500,
            temperature: 0.7
          })
        });

        if (response.status === 401) {
          throw new Error("Invalid or Missing HF_TOKEN. Vercel dashboard mein token add karein!");
        }

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           throw new Error(errorData.error || `HF API Error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content;

        history.push(userMsg);
        history.push({ role: 'assistant', content: responseText });

        if (history.length > 10) history.splice(0, 2);

        return { text: responseText };

      } catch (error: any) {
        console.error("Neural Error:", error);
        
        if (error.message.includes("currently loading")) {
            return { text: "System module load ho raha hai... 10 seconds mein phir se try karein! ✨" };
        }

        return { text: `⚠️ **Uplink Error**: ${error.message}\n\n*Note: Agar aap Vercel par hain, toh Environment Variables mein HF_TOKEN check karein.*` };
      }
    }
  };
};

export const APP_MAPPING: Record<string, string> = {
  "youtube": "https://www.youtube.com",
  "google": "https://www.google.com",
  "spotify": "https://open.spotify.com"
};
