import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { addToSchema } from '../utils/schema.js';
import { addApiEndpoint } from '../utils/endpoints.js';

export const aiAssistantCommand = new Command('ai-assistant')
  .description('Setup AI assistant endpoints and infrastructure within shards')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--provider <provider>', 'AI provider (openai, anthropic, ollama)', 'openai')
  .option('--model <model>', 'Model to use', 'gpt-4-turbo-preview')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🤖 Setting up AI Assistant\n'));

    if (!options.yes) {
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'This will add AI assistant tables, endpoints, and chat functionality. Continue?',
        initial: true
      });

      if (!response.value) {
        console.log(chalk.yellow('Setup cancelled'));
        return;
      }
    }

    const spinner = ora();

    try {
      // Step 1: Add AI tables to sharded schema
      spinner.start('Adding AI assistant tables to sharded schema...');
      
      const schemaTables = `
// AI Assistant tables (per-user shard)
export const aiConversations = sqliteTable("ai_conversations", {
  id: text("id").primaryKey(),
  title: text("title"),
  systemPrompt: text("system_prompt"),
  model: text("model").notNull(),
  temperature: real("temperature").default(0.7),
  maxTokens: integer("max_tokens").default(2000),
  createdAt: integer("created_at").default(sql\`(unixepoch())\`).notNull(),
  updatedAt: integer("updated_at").default(sql\`(unixepoch())\`).notNull(),
});

export const aiMessages = sqliteTable("ai_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => aiConversations.id),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  createdAt: integer("created_at").default(sql\`(unixepoch())\`).notNull(),
});

export const aiEmbeddings = sqliteTable("ai_embeddings", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  embedding: blob("embedding").notNull(), // Store as binary for efficiency
  metadata: text("metadata"), // JSON string
  createdAt: integer("created_at").default(sql\`(unixepoch())\`).notNull(),
});
`;

      await addToSchema('sharded', schemaTables);
      spinner.succeed('Added AI assistant tables to sharded schema');

      // Step 2: Create AI assistant API endpoints
      spinner.start('Creating AI assistant endpoints...');
      
      const endpointCode = `
import { Hono } from 'hono';
import { ${options.provider === 'openai' ? 'OpenAI' : options.provider === 'anthropic' ? 'Anthropic' : 'Ollama'} from '${options.provider === 'openai' ? 'openai' : options.provider === 'anthropic' ? '@anthropic-ai/sdk' : 'ollama'}';
import { db } from '../db';
import { aiConversations, aiMessages } from '../db/sharded-schema';
import { eq } from 'drizzle-orm';

const aiRouter = new Hono();
const client = new ${options.provider === 'openai' ? 'OpenAI' : options.provider === 'anthropic' ? 'Anthropic' : 'Ollama'}({
  ${options.provider === 'openai' ? 'apiKey: process.env.OPENAI_API_KEY' : 
    options.provider === 'anthropic' ? 'apiKey: process.env.ANTHROPIC_API_KEY' :
    'host: process.env.OLLAMA_HOST || "http://localhost:11434"'}
});

// Create new conversation
aiRouter.post('/api/ai/conversations', async (c) => {
  const { title, systemPrompt } = await c.req.json();
  const userId = c.get('userId'); // Assuming auth middleware sets this
  
  const conversationId = crypto.randomUUID();
  
  // Get user's shard
  const userDb = await getUserDb(userId);
  
  await userDb.insert(aiConversations).values({
    id: conversationId,
    title: title || 'New Conversation',
    systemPrompt: systemPrompt || 'You are a helpful assistant.',
    model: '${options.model}',
  });

  return c.json({ conversationId });
});

// Get conversations
aiRouter.get('/api/ai/conversations', async (c) => {
  const userId = c.get('userId');
  const userDb = await getUserDb(userId);
  
  const conversations = await userDb
    .select()
    .from(aiConversations)
    .orderBy(aiConversations.updatedAt);

  return c.json({ conversations });
});

// Send message to conversation
aiRouter.post('/api/ai/conversations/:id/messages', async (c) => {
  const conversationId = c.req.param('id');
  const { message } = await c.req.json();
  const userId = c.get('userId');
  
  const userDb = await getUserDb(userId);
  
  // Get conversation
  const [conversation] = await userDb
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, conversationId))
    .limit(1);
    
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Save user message
  await userDb.insert(aiMessages).values({
    id: crypto.randomUUID(),
    conversationId,
    role: 'user',
    content: message,
  });

  // Get conversation history
  const messages = await userDb
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.createdAt);

  // Call AI API
  const completion = await ${options.provider === 'openai' ? 
    `client.chat.completions.create({
      model: conversation.model,
      messages: [
        { role: 'system', content: conversation.systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: conversation.temperature,
      max_tokens: conversation.maxTokens,
    })` :
    options.provider === 'anthropic' ?
    `client.messages.create({
      model: conversation.model,
      system: conversation.systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: conversation.maxTokens,
    })` :
    `client.chat({
      model: conversation.model,
      messages: [
        { role: 'system', content: conversation.systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
    })`
  };

  const assistantMessage = ${options.provider === 'openai' ? 
    'completion.choices[0].message.content' :
    options.provider === 'anthropic' ?
    'completion.content[0].text' :
    'completion.message.content'
  };

  // Save assistant message
  await userDb.insert(aiMessages).values({
    id: crypto.randomUUID(),
    conversationId,
    role: 'assistant',
    content: assistantMessage,
  });

  // Update conversation timestamp
  await userDb
    .update(aiConversations)
    .set({ updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(aiConversations.id, conversationId));

  return c.json({ 
    message: assistantMessage,
    conversationId 
  });
});

// Stream messages (SSE)
aiRouter.post('/api/ai/conversations/:id/stream', async (c) => {
  const conversationId = c.req.param('id');
  const { message } = await c.req.json();
  const userId = c.get('userId');
  
  // Set up SSE
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  
  const userDb = await getUserDb(userId);
  
  // Stream implementation here
  // ...
  
  return c.streamText(async (stream) => {
    // Stream the response
    await stream.write(\`data: {"type": "start"}\\n\\n\`);
    // ... streaming logic
    await stream.write(\`data: {"type": "done"}\\n\\n\`);
  });
});

// Helper function to get user's shard database
async function getUserDb(userId: string) {
  // Implementation depends on your sharding strategy
  // This is a placeholder
  return db;
}

export { aiRouter };
`;

      await addApiEndpoint('ai', endpointCode);
      spinner.succeed('Created AI assistant endpoints');

      // Step 3: Create client-side utilities
      spinner.start('Creating client utilities...');
      
      const clientUtils = `
// AI Assistant client utilities
import { createSignal, createResource } from 'solid-js';

export function useAIConversation() {
  const [messages, setMessages] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  
  async function sendMessage(conversationId: string, message: string) {
    setLoading(true);
    
    try {
      const response = await fetch(\`/api/ai/conversations/\${conversationId}/messages\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: 'assistant', content: data.message }
      ]);
      
      return data;
    } finally {
      setLoading(false);
    }
  }
  
  async function streamMessage(conversationId: string, message: string) {
    setLoading(true);
    
    const response = await fetch(\`/api/ai/conversations/\${conversationId}/stream\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let assistantMessage = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Parse SSE data
      const lines = chunk.split('\\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content') {
            assistantMessage += data.text;
            // Update UI with streaming text
          }
        }
      }
    }
    
    setMessages(prev => [...prev,
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage }
    ]);
    setLoading(false);
  }
  
  return {
    messages,
    loading,
    sendMessage,
    streamMessage
  };
}
`;

      await fs.outputFile('src/client/utils/ai-assistant.ts', clientUtils);
      spinner.succeed('Created client utilities');

      // Step 4: Add environment variables
      spinner.start('Adding environment variables...');
      
      const envVars = `
# AI Configuration
${options.provider.toUpperCase()}_API_KEY=
AI_MODEL=${options.model}
${options.provider === 'ollama' ? 'OLLAMA_HOST=http://localhost:11434' : ''}
`;

      await fs.appendFile('.env.example', envVars);
      spinner.succeed('Added environment variables to .env.example');

      console.log(chalk.green.bold('\n✅ AI Assistant setup complete!\n'));
      console.log(chalk.cyan('Next steps:'));
      console.log(chalk.gray('1. Run migrations to create the AI tables'));
      console.log(chalk.gray(`2. Set your ${options.provider.toUpperCase()}_API_KEY in .env`));
      console.log(chalk.gray('3. Import and mount the aiRouter in your app'));
      console.log(chalk.gray('4. Use the useAIConversation hook in your components'));

    } catch (error) {
      spinner.fail('Setup failed');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });