
import { Message } from "../types";

// Llama 3.2 3B Instruct - Cloud-based inference via Hugging Face
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
      
      /**
       * Note: 'HF_TOKEN' should be added as an Environment Variable in Vercel.
       * This ensures security so your token is not leaked in the source code.
       */
      const token = (window as any).process?.env?.HF_TOKEN || "";

      try {
        const response = await fetch(HF_API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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

        // Handle common API issues
        if (response.status === 401) {
          throw new Error("Authentication Failed. Sir, please verify your HF_TOKEN in Vercel settings.");
        }

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           
           // If the model is currently loading on HF servers
           if (errorData.error?.includes("loading")) {
             return { text: "Sir, Neural Core (Llama) warm up ho raha hai. Kuch seconds mein retry karein. ✨" };
           }
           
           throw new Error(errorData.error || `Neural Link Error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content;

        history.push(userMsg);
        history.push({ role: 'assistant', content: responseText });

        // Keep local context light
        if (history.length > 10) history.splice(0, 2);

        return { text: responseText };

      } catch (error: any) {
        console.error("Neural Error:", error);
        
        return { 
          text: `⚠️ **System Uplink Error**: ${error.message}\n\n*Aapne jo token diya hai use Vercel Dashboard -> Settings -> Environment Variables mein 'HF_TOKEN' ke naam se add karein.*` 
        };
      }
    }
  };
};

export const APP_MAPPING: Record<string, string> = {
  "youtube": "https://www.youtube.com",
  "google": "https://www.google.com",
  "spotify": "https://open.spotify.com"
};
