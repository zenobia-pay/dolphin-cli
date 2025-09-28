# Dolphin CLI - Test Examples

This directory contains example outputs from different CLI command combinations so you can preview what gets generated.

## Test Examples

### 1. `basic-init/` - Just `dolphin-cli init`
The foundation project with auth, database, and deployment setup.
- ✅ Better-auth with email/password
- ✅ Drizzle ORM + SQLite (D1)
- ✅ SolidJS + Tailwind
- ✅ Hono server
- ✅ Cloudflare Workers deployment

### 2. `init-plus-pricing/` - `init` + `pricing`
Foundation + complete billing system.
- ✅ Everything from basic-init
- ✅ Stripe integration
- ✅ Subscription management
- ✅ Billing dashboard

### 3. `init-plus-ai/` - `init` + `ai-assistant`
Foundation + AI chat assistant.
- ✅ Everything from basic-init
- ✅ OpenAI integration
- ✅ Chat interface
- ✅ Message history

### 4. `init-plus-pages/` - `init` + multiple `create-page`
Foundation + various page types.
- ✅ Everything from basic-init
- ✅ Static pages (about, pricing, contact)
- ✅ Dashboard pages (analytics, inventory)

### 5. `full-example/` - All commands combined
The complete example with everything.
- ✅ Foundation (init)
- ✅ Billing system
- ✅ AI assistant
- ✅ Multiple page types

## How to Test

1. **Build the CLI**:
   ```bash
   cd .. && npm run build
   ```

2. **Explore examples**:
   ```bash
   cd test/examples/basic-init
   npm install
   npm run dev
   ```

3. **Generate fresh examples**:
   ```bash
   # Each example has a generate.sh script
   cd basic-init && ./generate.sh
   ```

4. **Compare outputs**:
   Look at the generated files to see how each command affects the project structure.

## Development Workflow

1. Make changes to CLI commands
2. Run `npm run build` 
3. Regenerate test examples with `./generate-all.sh`
4. Test the generated projects
5. Iterate

This lets you quickly see the impact of CLI changes without setting up separate projects.