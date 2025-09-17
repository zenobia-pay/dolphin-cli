import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { addToSchema } from '../utils/schema.js';
import { addWebhookEndpoint } from '../utils/endpoints.js';
import { createPricingAbstractions } from '../utils/abstractions.js';

export const pricingCommand = new Command('pricing')
  .description('Setup billing tables, webhook endpoints, and pricing abstractions')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--provider <provider>', 'Payment provider (stripe, lemonsqueezy)', 'stripe')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🐬 Setting up Pricing & Billing\n'));

    // Confirm with user unless -y flag is passed
    if (!options.yes) {
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'This will add billing tables, webhook endpoints, and pricing utilities. Continue?',
        initial: true
      });

      if (!response.value) {
        console.log(chalk.yellow('Setup cancelled'));
        return;
      }
    }

    const spinner = ora();
    const provider = options.provider.toLowerCase();

    try {
      // Step 1: Add billing tables to schema
      spinner.start('Adding billing tables to schema...');
      
      const schemaTables = `
// Billing & Subscription tables
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").notNull(), // active, canceled, past_due, etc
  ${provider}CustomerId: text("${provider}_customer_id"),
  ${provider}SubscriptionId: text("${provider}_subscription_id"),
  ${provider}PriceId: text("${provider}_price_id"),
  currentPeriodStart: integer("current_period_start"),
  currentPeriodEnd: integer("current_period_end"),
  cancelAt: integer("cancel_at"),
  canceledAt: integer("canceled_at"),
  trialStart: integer("trial_start"),
  trialEnd: integer("trial_end"),
  createdAt: integer("created_at").default(sql\`(unixepoch())\`).notNull(),
  updatedAt: integer("updated_at").default(sql\`(unixepoch())\`).notNull(),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subscriptionId: text("subscription_id"),
  ${provider}InvoiceId: text("${provider}_invoice_id"),
  amountPaid: integer("amount_paid"),
  amountDue: integer("amount_due"),
  currency: text("currency"),
  status: text("status"),
  paidAt: integer("paid_at"),
  createdAt: integer("created_at").default(sql\`(unixepoch())\`).notNull(),
});

export const usageRecords = sqliteTable("usage_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subscriptionId: text("subscription_id"),
  metric: text("metric").notNull(), // api_calls, storage_gb, etc
  quantity: integer("quantity").notNull(),
  timestamp: integer("timestamp").default(sql\`(unixepoch())\`).notNull(),
});
`;

      await addToSchema('sharded', schemaTables);
      spinner.succeed('Added billing tables to schema');

      // Step 2: Create webhook endpoint
      spinner.start('Creating webhook endpoint...');
      
      const webhookCode = `
import { Hono } from 'hono';
import { ${provider === 'stripe' ? 'Stripe' : 'LemonSqueezy'} from '${provider === 'stripe' ? 'stripe' : '@lemonsqueezy/lemonsqueezy.js'}';
import { db } from '../db';
import { subscriptions, invoices } from '../db/sharded-schema';

const webhookRouter = new Hono();

webhookRouter.post('/api/webhooks/${provider}', async (c) => {
  const signature = c.req.header('${provider === 'stripe' ? 'stripe-signature' : 'X-Signature'}');
  const body = await c.req.text();

  try {
    // Verify webhook signature
    const event = ${provider === 'stripe' ? 
      'stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)' :
      'verifyWebhook(body, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET)'
    };

    // Handle different event types
    switch (event.type) {
      case '${provider === 'stripe' ? 'customer.subscription.created' : 'subscription_created'}':
        // Handle subscription creation
        await handleSubscriptionCreated(event);
        break;
        
      case '${provider === 'stripe' ? 'customer.subscription.updated' : 'subscription_updated'}':
        // Handle subscription update
        await handleSubscriptionUpdated(event);
        break;
        
      case '${provider === 'stripe' ? 'customer.subscription.deleted' : 'subscription_cancelled'}':
        // Handle subscription cancellation
        await handleSubscriptionCanceled(event);
        break;
        
      case '${provider === 'stripe' ? 'invoice.payment_succeeded' : 'order_created'}':
        // Handle successful payment
        await handlePaymentSucceeded(event);
        break;
        
      default:
        console.log('Unhandled webhook event:', event.type);
    }

    return c.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return c.json({ error: 'Webhook handler failed' }, 400);
  }
});

async function handleSubscriptionCreated(event: any) {
  // Implementation here
}

async function handleSubscriptionUpdated(event: any) {
  // Implementation here
}

async function handleSubscriptionCanceled(event: any) {
  // Implementation here
}

async function handlePaymentSucceeded(event: any) {
  // Implementation here
}

export { webhookRouter };
`;

      await addWebhookEndpoint(provider, webhookCode);
      spinner.succeed('Created webhook endpoint');

      // Step 3: Create pricing abstractions
      spinner.start('Creating pricing abstractions...');
      
      const abstractionsCode = `
import { db } from '../db';
import { subscriptions, usageRecords } from '../db/sharded-schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

// Pricing tiers configuration
export const PRICING_TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    limits: {
      api_calls: 1000,
      storage_gb: 5,
      team_members: 1
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    ${provider}PriceId: process.env.${provider.toUpperCase()}_PRO_PRICE_ID,
    limits: {
      api_calls: 10000,
      storage_gb: 100,
      team_members: 5
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    ${provider}PriceId: process.env.${provider.toUpperCase()}_ENTERPRISE_PRICE_ID,
    limits: {
      api_calls: -1, // unlimited
      storage_gb: -1, // unlimited
      team_members: -1 // unlimited
    }
  }
};

// Check if user has access to a feature
export async function check(userId: string, feature: string, quantity = 1): Promise<boolean> {
  // Get user's current subscription
  const subscription = await db
    .select()
    .from(subscriptions)
    .where(and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, 'active')
    ))
    .limit(1);

  if (!subscription || subscription.length === 0) {
    // Check free tier limits
    return checkFreeTierLimit(userId, feature, quantity);
  }

  const sub = subscription[0];
  const tier = Object.values(PRICING_TIERS).find(
    t => t.${provider}PriceId === sub.${provider}PriceId
  );

  if (!tier) return false;

  // Check if unlimited
  if (tier.limits[feature] === -1) return true;

  // Check usage against limits
  const currentUsage = await getCurrentUsage(userId, feature);
  return (currentUsage + quantity) <= tier.limits[feature];
}

// Track usage of a feature
export async function track(userId: string, metric: string, quantity = 1): Promise<void> {
  // Check if allowed first
  const allowed = await check(userId, metric, quantity);
  if (!allowed) {
    throw new Error(\`Usage limit exceeded for \${metric}\`);
  }

  // Record the usage
  await db.insert(usageRecords).values({
    id: crypto.randomUUID(),
    userId,
    metric,
    quantity,
    subscriptionId: await getCurrentSubscriptionId(userId),
  });
}

// Get current usage for a metric in the current billing period
async function getCurrentUsage(userId: string, metric: string): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

  const result = await db
    .select({
      total: sql<number>\`sum(\${usageRecords.quantity})\`
    })
    .from(usageRecords)
    .where(and(
      eq(usageRecords.userId, userId),
      eq(usageRecords.metric, metric),
      gte(usageRecords.timestamp, thirtyDaysAgo)
    ));

  return result[0]?.total ?? 0;
}

async function checkFreeTierLimit(userId: string, feature: string, quantity: number): Promise<boolean> {
  const limit = PRICING_TIERS.free.limits[feature];
  if (limit === -1) return true;

  const currentUsage = await getCurrentUsage(userId, feature);
  return (currentUsage + quantity) <= limit;
}

async function getCurrentSubscriptionId(userId: string): Promise<string | null> {
  const subscription = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, 'active')
    ))
    .limit(1);

  return subscription[0]?.id ?? null;
}

// Upgrade/downgrade subscription
export async function changeSubscription(userId: string, newTier: string) {
  // Implementation to handle ${provider} API calls
  // This would interact with ${provider} API to change subscription
}

export { PRICING_TIERS as tiers };
`;

      await createPricingAbstractions(abstractionsCode);
      spinner.succeed('Created pricing abstractions');

      // Step 4: Add environment variables template
      spinner.start('Adding environment variables...');
      
      const envVars = `
# ${provider.toUpperCase()} Configuration
${provider.toUpperCase()}_SECRET_KEY=
${provider.toUpperCase()}_PUBLISHABLE_KEY=
${provider.toUpperCase()}_WEBHOOK_SECRET=
${provider.toUpperCase()}_PRO_PRICE_ID=
${provider.toUpperCase()}_ENTERPRISE_PRICE_ID=
`;

      await fs.appendFile('.env.example', envVars);
      spinner.succeed('Added environment variables to .env.example');

      console.log(chalk.green.bold('\n✅ Pricing setup complete!\n'));
      console.log(chalk.cyan('Next steps:'));
      console.log(chalk.gray('1. Run migrations to create the new tables'));
      console.log(chalk.gray(`2. Set up your ${provider} webhook endpoint`));
      console.log(chalk.gray('3. Configure environment variables in .env'));
      console.log(chalk.gray('4. Test with: check(userId, "api_calls") and track(userId, "api_calls")'));

    } catch (error) {
      spinner.fail('Setup failed');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });