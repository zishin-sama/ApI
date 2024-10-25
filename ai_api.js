require('dotenv').config();
const express = require('express');
const ai = require('unlimited-ai');
const cors = require('cors');

const app = express();

// Environment variables
const PORT = process.env.PORT || 1001;
const API_KEY = process.env.API_KEY;
const defaultSystem = process.env.DEFAULT_SYSTEM || "You are Zishin, a friendly helpful assistant. Created by Zishin Ishikaze.";
const timeoutDuration = parseInt(process.env.TIMEOUT_DURATION) || 15 * 60 * 1000;
const MAX_REQUESTS_WITHOUT_KEY = parseInt(process.env.MAX_REQUESTS_WITHOUT_KEY) || 1000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging function
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
};

const conversations = {};
const timeouts = {};
const requestCounts = {};

const clearConversationAfterTimeout = (id) => {
  if (timeouts[id]) {
    clearTimeout(timeouts[id]);
  }
  
  timeouts[id] = setTimeout(() => {
    delete conversations[id];
    log(`Conversation history with id ${id} cleared due to inactivity.`);
  }, timeoutDuration);
};

const isResetCommand = (prompt) => {
  const lowerPrompt = prompt.trim().toLowerCase();
  return lowerPrompt === 'clear' || lowerPrompt === 'reset' || lowerPrompt === 'delete';
};

const sendJsonResponse = (res, status, data) => {
  res.status(status).json({
    status,
    data: {
      ...data,
      author: 'ZishinDev'
    }
  });
};

// Request limiter middleware for /ai endpoint
const aiRequestLimiter = (req, res, next) => {
  const { key, id } = req.query;

  if (key === API_KEY) {
    // Unlimited requests with valid API key
    return next();
  }

  if (!requestCounts[id]) {
    requestCounts[id] = 0;
  }

  requestCounts[id]++;

  if (requestCounts[id] > MAX_REQUESTS_WITHOUT_KEY) {
    return sendJsonResponse(res, 429, { error: 'Request limit exceeded. Please provide a valid API key for unlimited requests.' });
  }

  next();
};

app.get('/ai', aiRequestLimiter, async (req, res) => {
  try {
    const { prompt, system, id } = req.query;

    if (!prompt || !id) {
      return sendJsonResponse(res, 400, { error: 'Please provide both prompt and id parameters.' });
    }

    if (isResetCommand(prompt)) {
      delete conversations[id];
      delete requestCounts[id];
      return sendJsonResponse(res, 200, { response: 'Conversation history has been cleared.' });
    }

    if (!conversations[id]) {
      conversations[id] = {
        messages: [],
        systemMessage: system || defaultSystem
      };

      conversations[id].messages.push({ role: 'system', content: conversations[id].systemMessage });
    }

    if (system) {
      conversations[id].systemMessage = system;
      conversations[id].messages = conversations[id].messages.map((message) =>
        message.role === 'system' ? { role: 'system', content: system } : message
      );
    }

    conversations[id].messages.push({ role: 'user', content: prompt });

    const model = 'gpt-4-turbo-2024-04-09';

    const aiResponse = await ai.generate(model, conversations[id].messages);

    conversations[id].messages.push({ role: 'assistant', content: aiResponse });

    sendJsonResponse(res, 200, { response: aiResponse });

    clearConversationAfterTimeout(id);
  } catch (error) {
    log(`Error in /ai route: ${error.message}`, 'error');
    sendJsonResponse(res, 500, { error: 'An error occurred while generating the AI response.' });
  }
});

app.get('/history/:id', (req, res) => {
  const { id } = req.params;

  if (!conversations[id]) {
    return sendJsonResponse(res, 404, { response: 'No conversation history found for this ID.' });
  }

  sendJsonResponse(res, 200, { conversation: conversations[id].messages });
});

app.listen(PORT, () => {
  log(`Server is running on port ${PORT}`);
});
