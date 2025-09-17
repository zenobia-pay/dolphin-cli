# 🐬 Dolphin Maker

CLI tool for composable codebase edits - add pricing, AI assistants, and create pages with ease.

## Installation

```bash
npx dolphin-maker@latest
# or install globally
npm install -g dolphin-maker
```

## Usage

```bash
dolphin-maker <command> [options]
```

## Commands

### 🏷️ `pricing` - Setup Billing & Subscriptions

Add complete billing infrastructure to your app:
- Database tables for subscriptions, invoices, and usage tracking
- Webhook endpoints for payment providers
- `check()` and `track()` abstractions for feature gating

```bash
dolphin-maker pricing [options]

Options:
  -y, --yes                 Skip confirmation prompts
  --provider <provider>     Payment provider (stripe, lemonsqueezy) [default: stripe]
```

**Example:**
```bash
# Setup Stripe billing
dolphin-maker pricing --provider stripe

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
dolphin-maker ai-assistant [options]

Options:
  -y, --yes                 Skip confirmation prompts
  --provider <provider>     AI provider (openai, anthropic, ollama) [default: openai]
  --model <model>          Model to use [default: gpt-4-turbo-preview]
```

**Example:**
```bash
# Setup OpenAI assistant
dolphin-maker ai-assistant --provider openai --model gpt-4

# In your component
import { useAIConversation } from './utils/ai-assistant';

const { messages, loading, sendMessage } = useAIConversation();
await sendMessage(conversationId, "Hello, how can you help?");
```

### 📄 `create-page` - Generate New Pages

Create static or dynamic pages with proper structure:

```bash
dolphin-maker create-page <name> [options]

Arguments:
  name                     Name of the page (e.g., "about", "pricing")

Options:
  -t, --type <type>       Page type (static, dynamic) [default: dynamic]
  -y, --yes               Skip confirmation prompts
```

#### Static Pages
Simple HTML pages with SolidJS and shadcn/ui included:
```bash
dolphin-maker create-page about --type static
```

Creates:
- `src/client/about/index.html` - Self-contained HTML page
- Updates `vite.config.ts` automatically

#### Dynamic Pages
Full SolidJS pages with context, data loading, and state management:
```bash
dolphin-maker create-page dashboard --type dynamic
```

Creates:
- `src/client/dashboard/index.html` - Entry HTML
- `src/client/dashboard/index.tsx` - Entry point
- `src/client/dashboard/DashboardApp.tsx` - Main component
- `src/client/dashboard/DashboardContext.tsx` - State management
- `src/client/dashboard/index.css` - Styles
- Updates `vite.config.ts` automatically
- Provides `/api/load/dashboard` endpoint template

## Project Structure Expected

Dolphin Maker expects your project to follow this structure:

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
dolphin-maker pricing --provider stripe
```

2. **Add AI chat capabilities:**
```bash
dolphin-maker ai-assistant --provider openai
```

3. **Create a pricing page:**
```bash
dolphin-maker create-page pricing --type static
```

4. **Create a user dashboard:**
```bash
dolphin-maker create-page dashboard --type dynamic
```

## Development

To contribute to Dolphin Maker:

```bash
git clone https://github.com/your-username/dolphin-maker
cd dolphin-maker
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

Built with 🐬 by the Dolphin Maker team