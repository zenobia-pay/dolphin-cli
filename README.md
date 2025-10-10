# 🐬 Dolphin CLI

CLI tool for composable codebase edits - add pricing, AI assistants, and create pages with ease.

## Installation

```bash
npx dolphin-cli@latest
# or install globally
npm install -g dolphin-cli
```

## Usage

```bash
dolphin-cli <command> [options]
```

## Commands

### 🏷️ `pricing` - Setup Billing & Subscriptions

Add complete billing infrastructure to your app:
- Database tables for subscriptions, invoices, and usage tracking
- Webhook endpoints for payment providers
- `check()` and `track()` abstractions for feature gating

```bash
dolphin-cli pricing [options]

Options:
  -y, --yes                 Skip confirmation prompts
  --provider <provider>     Payment provider (stripe, lemonsqueezy) [default: stripe]
```

**Example:**
```bash
# Setup Stripe billing
dolphin-cli pricing --provider stripe

# In your code
import { check, track } from './server/pricing';

// Check if user can use a feature
if (await check(userId, 'api_calls', 10)) {
  // Track the usage
  await track(userId, 'api_calls', 10);
  // Perform the API calls
}
```

### 🤖 `ai-assistant` - Add AI Chat Capabilities

Setup AI assistant infrastructure within user shards:
- Conversation and message tables
- API endpoints for chat
- Streaming support (SSE)
- Client utilities for easy integration

```bash
dolphin-cli ai-assistant [options]

Options:
  -y, --yes                 Skip confirmation prompts
  --provider <provider>     AI provider (openai, anthropic, ollama) [default: openai]
  --model <model>          Model to use [default: gpt-4-turbo-preview]
```

**Example:**
```bash
# Setup OpenAI assistant
dolphin-cli ai-assistant --provider openai --model gpt-4

# In your component
import { useAIConversation } from './utils/ai-assistant';

const { messages, loading, sendMessage } = useAIConversation();
await sendMessage(conversationId, "Hello, how can you help?");
```

### 📄 `create-page` - Generate New Pages

Create static, dashboard, or feed pages with proper structure:

```bash
dolphin-cli create-page <name> [options]

Arguments:
  name                     Name of the page (e.g., "about", "pricing", "feed")

Options:
  -t, --type <type>       Page type (static, dashboard, feed) [default: static]
  -y, --yes               Skip confirmation prompts
```

#### Static Pages
Simple HTML pages with SolidJS and shadcn/ui included:
```bash
dolphin-cli create-page about --type static
```

Creates:
- `src/client/about/index.html` - Self-contained HTML page
- Updates `vite.config.ts` automatically

#### Dashboard Pages
Full SolidJS pages with context, data loading, and state management:
```bash
dolphin-cli create-page dashboard --type dashboard
```

Creates:
- `src/client/dashboard/index.html` - Entry HTML
- `src/client/dashboard/index.tsx` - Entry point
- `src/client/dashboard/Dashboard.tsx` - Main component
- `src/client/dashboard/DashboardContext.tsx` - State management
- `src/client/dashboard/DashboardApiClient.ts` - API client
- `src/client/dashboard/DashboardAutosaveService.ts` - Autosave functionality
- `src/client/dashboard/DashboardUndoRedoService.ts` - Undo/redo support
- Updates `vite.config.ts` automatically
- Provides `/api/dashboard/load` and `/api/dashboard/save` endpoint templates

#### Feed Pages
Twitter-like infinite scroll feed pages with real-time updates:
```bash
dolphin-cli create-page feed --type feed
```

Creates:
- `src/client/feed/index.html` - Entry HTML
- `src/client/feed/index.tsx` - Entry point
- `src/client/feed/Feed.tsx` - Main feed component with infinite scroll
- `src/client/feed/FeedContext.tsx` - Feed state management
- `src/client/feed/FeedApiClient.ts` - API client with pagination
- `src/client/feed/FeedAutosaveService.ts` - Autosave functionality
- `src/client/feed/FeedUndoRedoService.ts` - Undo/redo support
- Updates `vite.config.ts` automatically
- Provides `/api/feed/load` and `/api/feed/save` endpoints with continuation token support

## Project Structure Expected

Dolphin CLI expects your project to follow this structure:

```
project/
├── src/
│   ├── client/           # Frontend pages
│   │   ├── dashboard/    # Dynamic page example
│   │   └── styles/       # Global styles
│   └── server/
│       ├── db/
│       │   ├── schema.ts        # Main database schema
│       │   └── sharded-schema.ts # Per-user shard schema
│       ├── api/          # API endpoints
│       ├── webhooks/     # Webhook handlers
│       └── pricing/      # Pricing utilities
├── vite.config.ts
└── .env.example
```

## Environment Variables

After running commands, update your `.env` file with the required variables:

### Pricing
```env
# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=
```

### AI Assistant
```env
# OpenAI
OPENAI_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Ollama
OLLAMA_HOST=http://localhost:11434
```

## Workflow Example

1. **Initialize pricing for your SaaS:**
```bash
dolphin-cli pricing --provider stripe
```

2. **Add AI chat capabilities:**
```bash
dolphin-cli ai-assistant --provider openai
```

3. **Create a pricing page:**
```bash
dolphin-cli create-page pricing --type static
```

4. **Create a user dashboard:**
```bash
dolphin-cli create-page dashboard --type dashboard
```

5. **Create a social feed:**
```bash
dolphin-cli create-page feed --type feed
```

## Development

To contribute to Dolphin CLI:

```bash
git clone https://github.com/your-username/dolphin-cli
cd dolphin-cli
npm install
npm run dev
```

## Publishing

```bash
npm run build
npm publish
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

Built with 🐬 by the Dolphin CLI team