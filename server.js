
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const DEFAULT_MODEL = 'llama3.2'; 

// Health check to verify the proxy is up
app.get('/health', (req, res) => {
  res.json({ status: 'Proxy is running', ollama_url: OLLAMA_URL });
});

app.post('/api/chat', async (req, res) => {
  const { messages, systemInstruction } = req.body;

  try {
    const formattedMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.content
      }))
    ];

    console.log(`Sending request to Ollama (${DEFAULT_MODEL})...`);
    
    const response = await axios.post(OLLAMA_URL, {
      model: DEFAULT_MODEL,
      messages: formattedMessages,
      stream: false,
      options: {
        temperature: 0.7,
      }
    }, { timeout: 30000 }); // 30s timeout

    res.json({
      text: response.data.message.content,
      success: true
    });

  } catch (error) {
    let errorMsg = 'Ollama connection error';
    if (error.code === 'ECONNREFUSED') {
      errorMsg = 'Ollama is not running on port 11434. Please start Ollama Desktop.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMsg = 'Ollama took too long to respond. The model might be too heavy for your PC.';
    }
    
    console.error('Backend Error:', errorMsg, error.message);
    res.status(500).json({ 
      success: false, 
      message: errorMsg 
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`
=====================================================
SIYA LOCAL BACKEND ACTIVE
URL: http://localhost:${PORT}
1. Make sure Ollama is running (llama3.2 downloaded)
2. Keep this terminal window open
=====================================================
  `);
});
