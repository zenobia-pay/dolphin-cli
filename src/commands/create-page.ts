import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { updateViteConfig } from '../utils/vite.js';

export const createPageCommand = new Command('create-page')
  .description('Create a new static or dashboard page')
  .argument('<name>', 'Name of the page (e.g., "about", "pricing")')
  .option('-t, --type <type>', 'Page type (static, dashboard)', 'static')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (name, options) => {
    console.log(chalk.blue.bold(`\n📄 Creating ${options.type} page: ${name}\n`));

    // Validate page name
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      console.error(chalk.red('Page name must start with a letter and contain only lowercase letters, numbers, and hyphens'));
      process.exit(1);
    }

    // Check if page already exists
    const pagePath = `src/client/${name}`;
      
    if (await fs.pathExists(pagePath)) {
      console.error(chalk.red(`Page "${name}" already exists at ${pagePath}`));
      process.exit(1);
    }

    if (!options.yes) {
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: `Create a ${options.type} page at ${pagePath}?`,
        initial: true
      });

      if (!response.value) {
        console.log(chalk.yellow('Page creation cancelled'));
        return;
      }
    }

    const spinner = ora();

    try {
      if (options.type === 'static') {
        await createStaticPageFlow(name, spinner);
      } else {
        await createDashboardPageFlow(name, spinner);
      }

      console.log(chalk.green.bold(`\n✅ ${options.type.charAt(0).toUpperCase() + options.type.slice(1)} page "${name}" created successfully!\n`));
      console.log(chalk.cyan('Next steps:'));
      console.log(chalk.gray(`1. Navigate to http://localhost:3000/${name}`));
      console.log(chalk.gray('2. Customize the page content'));
      if (options.type === 'dashboard') {
        console.log(chalk.gray('3. Update the load endpoint in your server'));
        console.log(chalk.gray('4. Add change event handlers if needed'));
        console.log(chalk.gray('5. Customize the views and context as needed'));
      }

    } catch (error) {
      spinner.fail('Page creation failed');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

async function createStaticPageFlow(name: string, spinner: any) {
  // Step 1: Create static HTML page based on template/src/client/index.html
  spinner.start('Creating static HTML page...');
  
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  
  const staticHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${capitalizedName} - Template</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/basecoat-css@0.3.2/dist/basecoat.cdn.min.css"
    />
    <script
      src="https://cdn.jsdelivr.net/npm/basecoat-css@0.3.2/dist/js/all.min.js"
      defer
    ></script>
    <style>
      /* Minimal custom styles */
      body {
        margin: 0;
        font-family: system-ui, -apple-system, sans-serif;
      }
      @media (max-width: 768px) {
        .nav-links {
          display: none !important;
        }
        .hero-title {
          font-size: 3rem !important;
        }
      }
    </style>
  </head>
  <body>
    <!-- Navigation -->
    <nav
      style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.5rem;
      "
    >
      <div style="display: flex; align-items: center; gap: 2rem">
        <a
          href="/"
          style="
            display: flex;
            align-items: center;
            gap: 0.5rem;
            text-decoration: none;
            color: black;
            font-weight: 600;
          "
        >
          <div
            style="
              width: 1.25rem;
              height: 1.25rem;
              background: black;
              border-radius: 0.25rem;
            "
          ></div>
          <span>Template</span>
        </a>
        <div class="nav-links" style="display: flex; gap: 1.5rem">
          <a
            href="#"
            style="
              text-decoration: none;
              color: #6b7280;
              font-size: 0.875rem;
              font-weight: 500;
            "
            >Docs</a
          >
          <a
            href="#"
            style="
              text-decoration: none;
              color: #6b7280;
              font-size: 0.875rem;
              font-weight: 500;
            "
            >Components</a
          >
        </div>
      </div>
      <a href="/dashboard/" class="btn btn-sm">Dashboard</a>
    </nav>

    <!-- Hero Section -->
    <section style="text-align: center; padding: 8rem 1.5rem 6rem">
      <h1
        class="hero-title"
        style="
          font-size: 5rem;
          font-weight: 800;
          margin: 0 0 1.5rem 0;
          letter-spacing: -0.025em;
        "
      >
        ${capitalizedName}
      </h1>
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-top: 3rem;
        "
      >
        <p style="font-size: 1.5rem; color: #6b7280; margin: 0">
          Welcome to ${capitalizedName}
        </p>
        <button
          class="btn btn-primary"
          onclick="window.location.href='/dashboard/'"
        >
          Get Started →
        </button>
      </div>
    </section>

    <!-- Content Section -->
    <section style="text-align: center; padding: 6rem 1.5rem 3rem">
      <h2
        style="
          font-size: 3rem;
          font-weight: 700;
          margin: 0 auto 1.5rem;
          letter-spacing: -0.025em;
          max-width: 900px;
        "
      >
        Built with Template
      </h2>
      <p
        style="
          font-size: 1.5rem;
          color: #6b7280;
          margin: 0 auto;
          max-width: 600px;
        "
      >
        This is a static page created with Dolphin Maker CLI. Customize it to fit your needs.
      </p>
    </section>

    <!-- Simple Feature Grid -->
    <section style="padding: 4rem 1.5rem; max-width: 1200px; margin: 0 auto">
      <div
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem"
      >
        <div class="card" style="padding: 2rem">
          <h3
            style="margin: 0 0 0.5rem 0; font-size: 1.125rem; font-weight: 600"
          >
            Fast & Modern
          </h3>
          <p
            style="
              margin: 0;
              color: #6b7280;
              font-size: 0.875rem;
              line-height: 1.5;
            "
          >
            Built with SolidJS and modern web technologies for optimal performance.
          </p>
        </div>

        <div class="card" style="padding: 2rem">
          <h3
            style="margin: 0 0 0.5rem 0; font-size: 1.125rem; font-weight: 600"
          >
            Easy to Customize
          </h3>
          <p
            style="
              margin: 0;
              color: #6b7280;
              font-size: 0.875rem;
              line-height: 1.5;
            "
          >
            Edit the HTML directly or convert to a dashboard-style page with full SolidJS.
          </p>
        </div>

        <div class="card" style="padding: 2rem">
          <h3
            style="margin: 0 0 0.5rem 0; font-size: 1.125rem; font-weight: 600"
          >
            Ready to Deploy
          </h3>
          <p
            style="
              margin: 0;
              color: #6b7280;
              font-size: 0.875rem;
              line-height: 1.5;
            "
          >
            Automatically configured with your build system and ready for production.
          </p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer style="padding: 2rem 1.5rem; border-top: 1px solid #e5e7eb">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        "
      >
        <div style="display: flex; align-items: center; gap: 0.5rem">
          <div
            style="
              width: 1.25rem;
              height: 1.25rem;
              background: black;
              border-radius: 0.25rem;
            "
          ></div>
          <span style="font-weight: 600">Template</span>
        </div>
        <p style="color: #6b7280; font-size: 0.875rem; margin: 0">
          © 2025 Template. All rights reserved.
        </p>
      </div>
    </footer>
  </body>
</html>`;

  await fs.outputFile(`src/client/${name}/index.html`, staticHtml);
  spinner.succeed('Created static HTML page');

  // Step 2: Update vite.config.ts
  spinner.start('Updating vite.config.ts...');
  await updateViteConfig(name);
  spinner.succeed('Updated vite.config.ts');
}

async function createDashboardPageFlow(name: string, spinner: any) {
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  
  // Step 1: Create index.html (simple like dashboard)
  spinner.start('Creating dashboard page structure...');
  
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${capitalizedName} - Template</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
</body>
</html>`;

  await fs.outputFile(`src/client/${name}/index.html`, indexHtml);

  // Step 2: Create index.tsx (simple entry point)
  const indexTsx = `import { render } from "solid-js/web";
import ${capitalizedName} from "./${capitalizedName}";
import "../styles/app.css";

render(() => <${capitalizedName} />, document.getElementById("root")!);`;

  await fs.outputFile(`src/client/${name}/index.tsx`, indexTsx);

  // Step 3: Create skeleton component
  const mainComponent = `import {
  Show,
  Switch,
  Match,
  createResource,
} from "solid-js";
import { createAuthClient } from "better-auth/solid";
import { ${capitalizedName}Provider, use${capitalizedName} } from "./${capitalizedName}Context";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "~/components/ui/sidebar";
import { Flex } from "~/components/ui/flex";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Icon } from "solid-heroicons";
import { buildingStorefront } from "solid-heroicons/solid";
import { arrowRightOnRectangle } from "solid-heroicons/outline";
import OverviewView from "./OverviewView";
import SettingsView from "./SettingsView";
import { apiClient } from "../clientApi/clientApi";

const authClient = createAuthClient({
  baseURL: window.location.origin,
});

function ${capitalizedName}Skeleton() {
  return (
    <div class="min-h-screen font-manrope">
      <SidebarProvider defaultOpen={true}>
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
          <SidebarHeader class="p-4">
            <Flex alignItems="center" justifyContent="start" class="gap-3">
              <Skeleton class="w-8 h-8 rounded" />
              <div>
                <Skeleton class="h-5 w-24 mb-1" />
                <Skeleton class="h-3 w-20" />
              </div>
            </Flex>
          </SidebarHeader>
          <SidebarContent class="flex-1 p-2">
            <SidebarMenu>
              <Skeleton class="h-8 w-full mx-2 mb-1" />
              <Skeleton class="h-8 w-full mx-2 mb-1" />
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter class="border-t p-4">
            <Skeleton class="h-12 w-full" />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger class="-ml-1" />
            <Separator orientation="vertical" class="mr-2 h-4" />
            <Skeleton class="h-4 w-32" />
          </header>
          <div class="p-6">
            <Skeleton class="h-64 w-full" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

function ${capitalizedName}Content() {
  const ${name.toLowerCase()} = use${capitalizedName}();
  const { store, actions } = ${name.toLowerCase()};
  
  const session = authClient.useSession();

  const logout = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const sidebarItems = [
    { id: "overview", label: "Overview" },
    { id: "settings", label: "Settings" },
  ] as const;

  return (
    <div class="min-h-screen font-manrope">
      <SidebarProvider defaultOpen={true}>
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
          <SidebarHeader class="p-4">
            <Show when={store.user}>
              <Flex alignItems="center" justifyContent="start" class="gap-3">
                <Icon path={buildingStorefront} class="w-8 h-8 text-primary" />
                <div>
                  <h2 class="text-lg font-semibold">${capitalizedName}</h2>
                  <p class="text-xs text-muted-foreground">Dashboard</p>
                </div>
              </Flex>
            </Show>
          </SidebarHeader>

          <SidebarContent class="flex-1 p-2">
            <SidebarMenu>
              <Show when={session() && !session().isPending}>
                <For each={sidebarItems}>
                  {(item) => (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={store.currentView === item.id}
                        onClick={() => actions.setCurrentView(item.id)}
                        class="w-full"
                      >
                        {item.label}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </For>
              </Show>
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter class="border-t p-4">
            <Show when={session() && !session().isPending}>
              <Flex alignItems="center" justifyContent="between" class="gap-3">
                <Flex
                  alignItems="center"
                  justifyContent="start"
                  class="gap-3 flex-1 min-w-0"
                >
                  <Avatar class="w-8 h-8 flex-shrink-0">
                    <AvatarFallback class="text-xs">
                      {session()?.data?.user?.name?.[0]?.toUpperCase() ||
                        session()?.data?.user?.email?.[0]?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div class="space-y-1 min-w-0 flex-1">
                    <p class="text-sm font-medium leading-none truncate">
                      {session()?.data?.user?.name || "User"}
                    </p>
                    <p class="text-xs text-muted-foreground truncate">
                      {session()?.data?.user?.email}
                    </p>
                  </div>
                </Flex>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <Icon path={arrowRightOnRectangle} class="h-4 w-4" />
                </Button>
              </Flex>
            </Show>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger class="-ml-1" />
            <Separator orientation="vertical" class="mr-2 h-4" />
            <Show when={session() && !session().isPending}>
              <Flex alignItems="center" justifyContent="start" class="gap-2">
                <span class="text-sm text-muted-foreground">${capitalizedName}</span>
                <span class="text-sm text-muted-foreground">/</span>
                <h1 class="text-sm font-semibold capitalize">
                  {store.currentView}
                </h1>
              </Flex>
            </Show>
          </header>

          <div class="p-6">
            <Show when={!store.isLoading}>
              <Switch fallback={<OverviewView />}>
                <Match when={store.currentView === "overview"}>
                  <OverviewView />
                </Match>
                <Match when={store.currentView === "settings"}>
                  <SettingsView />
                </Match>
              </Switch>
            </Show>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export default function ${capitalizedName}() {
  // Load dashboard data using createResource
  const [${name}Data] = createResource(async () => {
    try {
      const data = await apiClient.load${capitalizedName}();
      console.log("${capitalizedName} data:", data);
      return data;
    } catch (error) {
      console.error("Failed to load ${name}:", error);
      throw error;
    }
  });

  const session = authClient.useSession();

  return (
    <Show
      when={session() && !session().isPending && !${name}Data.loading}
      fallback={<${capitalizedName}Skeleton />}
    >
      <Show
        when={session().data?.user}
        fallback={
          <div>
            {(() => {
              window.location.href = \`/login/?redirect=\${window.location.pathname}\${window.location.search}\`;
              return "Redirecting...";
            })()}
          </div>
        }
      >
        <${capitalizedName}Provider
          initialData={${name}Data()!}
          user={session()!.data!.user!}
        >
          <${capitalizedName}Content />
        </${capitalizedName}Provider>
      </Show>
    </Show>
  );
}`;

  await fs.outputFile(`src/client/${name}/${capitalizedName}.tsx`, mainComponent);

  // Add missing import for For
  const mainComponentWithImport = mainComponent.replace(
    'import {\n  Show,\n  Switch,\n  Match,\n  createResource,\n} from "solid-js";',
    'import {\n  For,\n  Show,\n  Switch,\n  Match,\n  createResource,\n} from "solid-js";'
  );
  
  await fs.outputFile(`src/client/${name}/${capitalizedName}.tsx`, mainComponentWithImport);

  spinner.succeed('Created main component');

  // Continue with other files...
  spinner.start('Creating context and views...');
  
  // Step 4: Create Context (simplified version of DashboardContext)
  const contextFile = `import {
  createContext,
  useContext,
  type ParentComponent,
  createMemo,
  onCleanup,
  createSignal,
  createEffect,
  on,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import { AutosaveService } from "../services/AutosaveService";
import type { ${capitalizedName}Event } from "@shared/types/events";
import type { User } from "better-auth";
import { process${capitalizedName}EventQueue } from "./${name}EventProcessor";
import { apiClient } from "../clientApi/clientApi";

export interface ${capitalizedName}Store {
  // User data
  user: User;

  // Current view
  currentView: "${name.toLowerCase()}" | "overview" | "settings";

  // UI state
  isLoading: boolean;
  error: string | null;

  // Add your specific store properties here
  data: any;
}

export interface ${capitalizedName}Actions {
  setCurrentView: (view: ${capitalizedName}Store["currentView"]) => void;
  // Add your specific actions here
}

interface ${capitalizedName}ContextType {
  store: ${capitalizedName}Store;
  actions: ${capitalizedName}Actions;
  autosave: AutosaveService<${capitalizedName}Event>;
  emitEvent: (event: ${capitalizedName}Event) => void;
}

const ${capitalizedName}Context = createContext<${capitalizedName}ContextType>();

export function ${capitalizedName}Provider(props: {
  children: any;
  initialData: any;
  user: User;
}) {
  const [store, setStore] = createStore<${capitalizedName}Store>({
    user: props.user,
    currentView: "overview",
    isLoading: false,
    error: null,
    data: props.initialData,
  });

  // Initialize autosave service
  const autosave = new AutosaveService<${capitalizedName}Event>({
    endpoint: "/api/save",
    onError: (error) => setStore("error", error.message),
    onSave: (events) => {
      // Process events locally
      process${capitalizedName}EventQueue(events, store, setStore);
    },
  });

  const actions: ${capitalizedName}Actions = {
    setCurrentView: (view) => setStore("currentView", view),
  };

  const emitEvent = (event: ${capitalizedName}Event) => {
    autosave.addEvent(event);
  };

  // Cleanup on unmount
  onCleanup(() => {
    autosave.destroy();
  });

  return (
    <${capitalizedName}Context.Provider
      value={{ store, actions, autosave, emitEvent }}
    >
      {props.children}
    </${capitalizedName}Context.Provider>
  );
}

export function use${capitalizedName}() {
  const context = useContext(${capitalizedName}Context);
  if (!context) {
    throw new Error("use${capitalizedName} must be used within a ${capitalizedName}Provider");
  }
  return context;
}`;

  await fs.outputFile(`src/client/${name}/${capitalizedName}Context.tsx`, contextFile);

  // Step 5: Create event processor
  const eventProcessor = `import type { SetStoreFunction } from "solid-js/store";
import type { ${capitalizedName}Store } from "./${capitalizedName}Context";
import type { ${capitalizedName}Event } from "@shared/types/events";

export function process${capitalizedName}EventQueue(
  events: ${capitalizedName}Event[],
  store: ${capitalizedName}Store,
  setStore: SetStoreFunction<${capitalizedName}Store>
) {
  for (const event of events) {
    process${capitalizedName}Event(event, store, setStore);
  }
}

export function process${capitalizedName}Event(
  event: ${capitalizedName}Event,
  store: ${capitalizedName}Store,
  setStore: SetStoreFunction<${capitalizedName}Store>
) {
  switch (event.type) {
    // Add your event handlers here
    default:
      console.warn("Unknown ${name} event type:", event);
  }
}`;

  await fs.outputFile(`src/client/${name}/${name}EventProcessor.ts`, eventProcessor);

  // Step 6: Create basic views
  const overviewView = `import { Component } from "solid-js";
import { use${capitalizedName} } from "./${capitalizedName}Context";

const OverviewView: Component = () => {
  const { store } = use${capitalizedName}();

  return (
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold">${capitalizedName} Overview</h2>
        <p class="text-muted-foreground">
          Welcome to your ${name} dashboard.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-2">Sample Metric</h3>
          <p class="text-3xl font-bold">42</p>
          <p class="text-sm text-muted-foreground">Sample description</p>
        </div>
        
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-2">Another Metric</h3>
          <p class="text-3xl font-bold">128</p>
          <p class="text-sm text-muted-foreground">Another description</p>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Recent Activity</h3>
        <p class="text-muted-foreground">No recent activity to display.</p>
      </div>
    </div>
  );
};

export default OverviewView;`;

  await fs.outputFile(`src/client/${name}/OverviewView.tsx`, overviewView);

  const settingsView = `import { Component } from "solid-js";
import { use${capitalizedName} } from "./${capitalizedName}Context";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

const SettingsView: Component = () => {
  const { store, actions } = use${capitalizedName}();

  return (
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold">${capitalizedName} Settings</h2>
        <p class="text-muted-foreground">
          Configure your ${name} preferences.
        </p>
      </div>

      <div class="card p-6 space-y-4">
        <h3 class="text-lg font-semibold">General Settings</h3>
        
        <div class="space-y-2">
          <Label for="setting1">Sample Setting</Label>
          <Input
            id="setting1"
            placeholder="Enter value..."
          />
        </div>

        <div class="space-y-2">
          <Label for="setting2">Another Setting</Label>
          <Input
            id="setting2"
            placeholder="Enter another value..."
          />
        </div>

        <Button>Save Settings</Button>
      </div>
    </div>
  );
};

export default SettingsView;`;

  await fs.outputFile(`src/client/${name}/SettingsView.tsx`, settingsView);

  spinner.succeed('Created context, event processor, and views');

  // Step 7: Update vite.config.ts
  spinner.start('Updating vite.config.ts...');
  await updateViteConfig(name);
  spinner.succeed('Updated vite.config.ts');

  // Step 8: Create load endpoint info
  spinner.start('Creating API integration info...');
  
  console.log(chalk.yellow('\n📋 Add these to your server:'));
  console.log(chalk.gray('1. Add to your load endpoint (src/server/api/load.ts):'));
  console.log(chalk.cyan(`
app.get("/api/load/${name}", authMiddleware, async (c) => {
  const userId = c.get("userId");
  
  // Load ${name}-specific data
  const data = {
    // Add your data here
  };
  
  return c.json(data);
});`));

  console.log(chalk.gray('2. Add to clientApi (src/client/clientApi/clientApi.ts):'));
  console.log(chalk.cyan(`
async load${capitalizedName}() {
  const response = await fetch("/api/load/${name}", {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to load ${name}");
  return response.json();
},`));

  console.log(chalk.gray('3. Add event types to @shared/types/events.ts:'));
  console.log(chalk.cyan(`
export type ${capitalizedName}Event = {
  type: "SAMPLE_EVENT";
  // Add your event properties
};`));
  
  spinner.succeed('API integration info created');
}