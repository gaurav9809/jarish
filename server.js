
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
// ⚠️ REPLACE 'YOUR_OPENROUTER_KEY' BELOW IF NOT SETTING ENV VARIABLE
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_KEY_HERE";
const MODEL_NAME = "deepseek/deepseek-r1"; // The Reasoning Model
const SITE_URL = "http://localhost:3000";
const SITE_NAME = "SIYA AI";

app.get('/health', (req, res) => {
  res.json({ status: 'SIYA OpenRouter Link Online', model: MODEL_NAME });
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "YOUR_OPENROUTER_KEY_HERE") {
    return res.status(500).json({ 
      success: false, 
      text: "⚠️ API KEY MISSING. Please configure OPENROUTER_API_KEY in server.js" 
    });
  }

  try {
    console.log(`[SIYA] Transmitting to OpenRouter (${MODEL_NAME})...`);

    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: MODEL_NAME,
      messages: messages,
      // DeepSeek R1 specific parameters usually handled automatically, 
      // but we ensure we don't limit thinking too much.
      temperature: 0.6,
    }, {
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      }
    });

    // Extract content
    const reply = response.data.choices[0].message.content;
    console.log(`[SIYA] Received ${reply.length} chars.`);

    res.json({
      text: reply,
      success: true
    });

  } catch (error) {
    console.error("OpenRouter Error:", error.response?.data || error.message);
    const errorText = error.response?.data?.error?.message || error.message;
    res.status(500).json({ 
      success: false, 
      text: `[NEURAL LINK FAILURE] ${errorText}`, 
      details: error.message 
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`
=====================================================
   SIYA DEEPSEEK-R1 PROTOCOL INITIATED
=====================================================
   STATUS:  ONLINE
   PORT:    ${PORT}
   MODEL:   ${MODEL_NAME}
   GATEWAY: OpenRouter
   
   ⚠️ Ensure OPENROUTER_API_KEY is set in server.js
=====================================================
  `);
});
