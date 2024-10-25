const express = require('express');
const ai = require('unlimited-ai');
const app = express();

const DEFAULT_SYSTEM_MESSAGE = "You are a helpful AI assistant."; // Default system message
const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// In-memory storage for conversations and timeouts
const conversations = {};
const timeouts = {};

// Helper function to clear user conversation after inactivity
const clearConversationAfterTimeout = (id) => {
  if (timeouts[id]) {
    clearTimeout(timeouts[id]); // Clear any previous timeout
  }

  // Set a new timeout to clear the conversation after 15 minutes
  timeouts[id] = setTimeout(() => {
    delete conversations[id]; // Delete conversation data
    console.log(`Conversation with id ${id} cleared due to inactivity.`);
  }, TIMEOUT_DURATION);
};

// Helper function to check if the prompt is a command to delete/reset the conversation
const isResetCommand = (prompt) => {
  const lowerPrompt = prompt.trim().toLowerCase();
  return lowerPrompt === 'clear' || lowerPrompt === 'reset' || lowerPrompt === 'delete';
};

// API endpoint to generate AI response
app.get('/ai', async (req, res) => {
  try {
    const { prompt, system, id } = req.query;

    // Check if prompt and id are provided
    if (!prompt || !id) {
      return res.status(400).json({
        status: 400,
        data: {
          message: 'Please provide both prompt and id parameters.',
          developer: 'ZishinDev'
        }
      });
    }

    // Handle 'clear', 'reset', or 'delete' commands
    if (isResetCommand(prompt)) {
      delete conversations[id]; // Delete the conversation for the given user
      return res.status(200).json({
        status: 200,
        data: {
          id,
          message: 'Conversation has been reset.',
          developer: 'ZishinDev'
        }
      });
    }

    // Initialize the conversation for the user if it doesn't exist
    if (!conversations[id]) {
      conversations[id] = {
        messages: [],
        systemMessage: system || DEFAULT_SYSTEM_MESSAGE // Use provided system message or default
      };

      // Add the system message as the first message
      conversations[id].messages.push({ role: 'system', content: conversations[id].systemMessage });
    }

    // If a system message is provided, update the user's systemMessage
    if (system) {
      conversations[id].systemMessage = system;
      // Replace or add the system message
      conversations[id].messages = conversations[id].messages.map((message) =>
        message.role === 'system' ? { role: 'system', content: system } : message
      );
    }

    // Add the user's prompt to the conversation
    conversations[id].messages.push({ role: 'user', content: prompt });

    // Define the AI model to use
    const model = 'gpt-4-turbo-2024-04-09';

    // Generate AI response using the 'unlimited-ai' library
    const aiResponse = await ai.generate(model, conversations[id].messages);

    // Add the AI's response to the conversation
    conversations[id].messages.push({ role: 'assistant', content: aiResponse });

    // Respond with the AI's message, wrapped in a 'data' object
    res.status(200).json({
      status: 200,
      data: {
        id,
        message: aiResponse,
        developer: 'ZishinDev'
      }
    });

    // Reset the inactivity timer for the user
    clearConversationAfterTimeout(id);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      data: {
        message: 'An error occurred while generating the AI response.',
        developer: 'ZishinDev'
      }
    });
  }
});

// API endpoint to get the full conversation for a given user ID
app.get('/conversation/:id', (req, res) => {
  const { id } = req.params;

  if (!conversations[id]) {
    return res.status(404).json({
      status: 404,
      data: {
        message: 'No conversation found for this ID.',
        developer: 'ZishinDev'
      }
    });
  }

  res.status(200).json({
    status: 200,
    data: {
      id,
      conversation: conversations[id].messages,
      developer: 'ZishinDev'
    }
  });
});

// Start server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});

