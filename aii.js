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
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).send(
        JSON.stringify({
          status: 400,
          data: {
            message: 'Please provide both prompt and id parameters.',
            developer: 'ZishinDev'
          }
        }, null, 2) // Indentation of 2 spaces
      );
    }

    // Handle 'clear', 'reset', or 'delete' commands
    if (isResetCommand(prompt)) {
      delete conversations[id]; // Delete the conversation for the given user
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(
        JSON.stringify({
          status: 200,
          data: {
            message: 'Conversation has been reset.',
            developer: 'ZishinDev'
          }
        }, null, 2) // Indentation of 2 spaces
      );
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
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(
      JSON.stringify({
        status: 200,
        data: {
          message: aiResponse,
          developer: 'ZishinDev'
        }
      }, null, 2) // Indentation of 2 spaces
    );

    // Reset the inactivity timer for the user
    clearConversationAfterTimeout(id);
  } catch (error) {
    console.error(error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send(
      JSON.stringify({
        status: 500,
        data: {
          message: 'An error occurred while generating the AI response.',
          developer: 'ZishinDev'
        }
      }, null, 2) // Indentation of 2 spaces
    );
  }
});


// Start server on port 3000
const PORT = 20000;
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
