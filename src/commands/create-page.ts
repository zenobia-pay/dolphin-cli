import { Command } from "commander";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import path from "path";
import { updateViteConfig } from "../utils/vite.js";

/**
 * Convert kebab-case name to PascalCase for component names
 * Examples: "my-page" -> "MyPage", "about" -> "About", "user-profile-settings" -> "UserProfileSettings"
 */
function toPascalCase(name: string): string {
  if (!name || typeof name !== "string") {
    throw new Error("Invalid name: must be a non-empty string");
  }

  // Split by hyphens and handle empty parts (e.g., "my--page" or "-page")
  const parts = name.split("-").filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new Error("Invalid name: contains only hyphens");
  }

  // Capitalize each part and join
  const pascalCase = parts
    .map((part) => {
      if (!/^[a-z0-9]+$/.test(part)) {
        throw new Error(
          `Invalid name part "${part}": must contain only lowercase letters and numbers`
        );
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");

  return pascalCase;
}

/**
 * Convert kebab-case name to camelCase for variable names
 * Examples: "my-page" -> "myPage", "about" -> "about", "user-profile-settings" -> "userProfileSettings"
 */
function toCamelCase(name: string): string {
  if (!name || typeof name !== "string") {
    throw new Error("Invalid name: must be a non-empty string");
  }

  // Split by hyphens and handle empty parts
  const parts = name.split("-").filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new Error("Invalid name: contains only hyphens");
  }

  // First part lowercase, rest capitalized
  const camelCase = parts
    .map((part, index) => {
      if (!/^[a-z0-9]+$/.test(part)) {
        throw new Error(
          `Invalid name part "${part}": must contain only lowercase letters and numbers`
        );
      }
      if (index === 0) {
        return part; // Keep first part lowercase
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");

  return camelCase;
}

/**
 * Convert kebab-case to SCREAMING_SNAKE_CASE for constants
 * Examples: "my-page" -> "MY_PAGE", "about" -> "ABOUT"
 */
function toScreamingSnakeCase(name: string): string {
  return name.toUpperCase().replace(/-/g, "_");
}

export const createPageCommand = new Command("create-page")
  .description("Create a new static, dashboard, or feed page")
  .argument("<name>", 'Name of the page (e.g., "about", "pricing", "feed")')
  .option("-t, --type <type>", "Page type (static, dashboard, feed)", "static")
  .option(
    "-s, --schemas <path>",
    "Path to request-response-schemas file",
    "shared/types/request-response-schemas.ts"
  )
  .option("-r, --routes <path>", "Path to routes index.ts file", "src/index.ts")
  .option(
    "-u, --user-shard <path>",
    "Path to UserShard.ts file",
    "src/durable-objects/user-shard/UserShard.ts"
  )
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (name, options) => {
    console.log(
      chalk.blue.bold(`\n📄 Creating ${options.type} page: ${name}\n`)
    );

    // Comprehensive validation for page name

    // Check for empty or whitespace-only name
    if (!name || name.trim().length === 0) {
      console.error(chalk.red("Page name cannot be empty"));
      process.exit(1);
    }

    // Check for whitespace
    if (/\s/.test(name)) {
      console.error(chalk.red("Page name cannot contain spaces or whitespace"));
      process.exit(1);
    }

    // Check for invalid characters (allow only lowercase letters, numbers, and hyphens)
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      console.error(
        chalk.red(
          "Page name must start with a letter and contain only lowercase letters, numbers, and hyphens"
        )
      );
      process.exit(1);
    }

    // Check for consecutive hyphens
    if (name.includes("--")) {
      console.error(chalk.red("Page name cannot contain consecutive hyphens"));
      process.exit(1);
    }

    // Check for leading/trailing hyphens
    if (name.startsWith("-") || name.endsWith("-")) {
      console.error(chalk.red("Page name cannot start or end with a hyphen"));
      process.exit(1);
    }

    // Check for reserved JavaScript/TypeScript keywords
    const reservedKeywords = [
      "abstract",
      "arguments",
      "await",
      "boolean",
      "break",
      "byte",
      "case",
      "catch",
      "char",
      "class",
      "const",
      "continue",
      "debugger",
      "default",
      "delete",
      "do",
      "double",
      "else",
      "enum",
      "eval",
      "export",
      "extends",
      "false",
      "final",
      "finally",
      "float",
      "for",
      "function",
      "goto",
      "if",
      "implements",
      "import",
      "in",
      "instanceof",
      "int",
      "interface",
      "let",
      "long",
      "native",
      "new",
      "null",
      "package",
      "private",
      "protected",
      "public",
      "return",
      "short",
      "static",
      "super",
      "switch",
      "synchronized",
      "this",
      "throw",
      "throws",
      "transient",
      "true",
      "try",
      "typeof",
      "var",
      "void",
      "volatile",
      "while",
      "with",
      "yield",
    ];

    if (reservedKeywords.includes(name)) {
      console.error(
        chalk.red(
          `Page name "${name}" is a reserved JavaScript/TypeScript keyword`
        )
      );
      process.exit(1);
    }

    // Check for common reserved names that might cause conflicts
    const reservedNames = ["index", "default", "constructor", "prototype"];
    if (reservedNames.includes(name)) {
      console.error(
        chalk.red(
          `Page name "${name}" is a reserved name and might cause conflicts`
        )
      );
      process.exit(1);
    }

    // Validate that the name can be converted to PascalCase
    try {
      toPascalCase(name);
      toCamelCase(name);
    } catch (error) {
      console.error(
        chalk.red(
          `Invalid page name: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
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
        type: "confirm",
        name: "value",
        message: `Create a ${options.type} page at ${pagePath}?`,
        initial: true,
      });

      if (!response.value) {
        console.log(chalk.yellow("Page creation cancelled"));
        return;
      }
    }

    const spinner = ora();

    try {
      if (options.type === "static") {
        await createStaticPageFlow(name, spinner);
      } else if (options.type === "feed") {
        await createFeedPageFlow(
          name,
          spinner,
          options.schemas,
          options.routes,
          options.userShard
        );
      } else {
        await createDashboardPageFlow(
          name,
          spinner,
          options.schemas,
          options.routes,
          options.userShard
        );
      }

      console.log(
        chalk.green.bold(
          `\n✅ ${
            options.type.charAt(0).toUpperCase() + options.type.slice(1)
          } page "${name}" created successfully!\n`
        )
      );
      console.log(chalk.cyan("Next steps:"));
      console.log(chalk.gray(`1. Navigate to http://localhost:3000/${name}`));
      console.log(chalk.gray("2. Customize the page content"));
      if (options.type === "dashboard") {
        console.log(chalk.gray("3. Update the load endpoint in your server"));
        console.log(chalk.gray("4. Add change event handlers if needed"));
        console.log(chalk.gray("5. Customize the views and context as needed"));
      }
    } catch (error) {
      spinner.fail("Page creation failed");
      console.error(chalk.red("Error:"), error);
      process.exit(1);
    }
  });

async function createStaticPageFlow(name: string, spinner: any) {
  // Step 1: Create static HTML page based on template/src/client/index.html
  spinner.start("Creating static HTML page...");

  const capitalizedName = toPascalCase(name);

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
  spinner.succeed("Created static HTML page");

  // Step 2: Update vite.config.ts
  spinner.start("Updating vite.config.ts...");
  await updateViteConfig(name);
  spinner.succeed("Updated vite.config.ts");
}

async function createDashboardPageFlow(
  name: string,
  spinner: any,
  schemasPath: string,
  routesPath: string,
  userShardPath: string
) {
  const capitalizedName = toPascalCase(name);
  const camelName = toCamelCase(name);
  const snakeName = toScreamingSnakeCase(name);

  // Step 1: Create index.html (simple like dashboard)
  spinner.start("Creating dashboard page structure...");

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
  For,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Icon } from "solid-heroicons";
import { buildingStorefront } from "solid-heroicons/solid";
import { arrowRightOnRectangle } from "solid-heroicons/outline";
import { ${camelName}ApiClient } from "./${capitalizedName}ApiClient";

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

// TODO: Rename this component and replace with your actual content
function ViewOne() {
  const { store } = use${capitalizedName}();

  return (
    <div class="space-y-6">
      {/* TODO: Replace this placeholder content */}
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Lorem Ipsum</h2>
        <p class="text-muted-foreground">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>

      {/* TODO: Replace these placeholder cards */}
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Placeholder Title
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">123</div>
            <p class="text-xs text-muted-foreground">
              Lorem ipsum dolor sit
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Placeholder Title
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">456</div>
            <p class="text-xs text-muted-foreground">
              Consectetur adipiscing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Placeholder Title
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">789</div>
            <p class="text-xs text-muted-foreground">
              Sed do eiusmod tempor
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Placeholder Title
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">101</div>
            <p class="text-xs text-muted-foreground">
              Incididunt ut labore
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TODO: Replace this placeholder content card */}
      <Card>
        <CardHeader>
          <CardTitle>Placeholder Content</CardTitle>
          <CardDescription>
            Replace this with your actual content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
            nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// TODO: Rename this component and replace with your actual content
function ViewTwo() {
  const { store } = use${capitalizedName}();

  return (
    <div class="space-y-6">
      {/* TODO: Replace this placeholder content */}
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Lorem Ipsum</h2>
        <p class="text-muted-foreground">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Placeholder Content</CardTitle>
          <CardDescription>
            Replace this with your actual content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ${capitalizedName}Content() {
  const ${camelName} = use${capitalizedName}();
  const { store, actions } = ${camelName};

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
    { id: "view-one", label: "View One" },
    { id: "view-two", label: "View Two" },
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
              <Switch fallback={<ViewOne />}>
                <Match when={store.currentView === "view-one"}>
                  <ViewOne />
                </Match>
                <Match when={store.currentView === "view-two"}>
                  <ViewTwo />
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
  const [${camelName}Data] = createResource(async () => {
    try {
      const data = await ${camelName}ApiClient.load${capitalizedName}();
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
      when={session() && !session().isPending && !${camelName}Data.loading}
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
          initialData={${camelName}Data()!}
          user={session()!.data!.user!}
        >
          <${capitalizedName}Content />
        </${capitalizedName}Provider>
      </Show>
    </Show>
  );
}`;

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}.tsx`,
    mainComponent
  );

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}.tsx`,
    mainComponent
  );

  spinner.succeed("Created main component");

  // Continue with other files...
  spinner.start("Creating context and views...");

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
  JSX,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import { ${capitalizedName}AutosaveService } from "./${capitalizedName}AutosaveService";
import { ${capitalizedName}UndoRedoService } from "./${capitalizedName}UndoRedoService";
import type { ${capitalizedName}Event } from "@shared/types/${camelName}Events";
import type { User } from "better-auth";
// Import database types like this:
// import type { User as UserSchema } from "@shared/types/primitives";
import { process${capitalizedName}EventQueue, process${capitalizedName}EventResultQueue } from "./${camelName}EventProcessor";
import { ${camelName}ApiClient } from "./${capitalizedName}ApiClient";
import { Load${capitalizedName}Response } from "@shared/types/request-response-schemas";

export interface ${capitalizedName}Store {
  // User data
  user: User;

  // UI state
  currentView: "view-one" | "view-two";
  isLoading: boolean;
  error: string | null;

  loadedData: Load${capitalizedName}Response;
}

export interface ${capitalizedName}Actions {
  setCurrentView: (view: ${capitalizedName}Store["currentView"]) => void;
  // Add your specific actions here
}

interface ${capitalizedName}ContextType {
  store: ${capitalizedName}Store;
  actions: ${capitalizedName}Actions;
  autosave: ${capitalizedName}AutosaveService;
  undoRedo: ${capitalizedName}UndoRedoService;
  emitEvent: (event: ${capitalizedName}Event) => void;
}

const ${capitalizedName}Context = createContext<${capitalizedName}ContextType>();

export function ${capitalizedName}Provider(props: {
  children: JSX.Element;
  initialData: Load${capitalizedName}Response;
  user: User;
}) {
  const [store, setStore] = createStore<${capitalizedName}Store>({
    user: props.user,
    currentView: "view-one",
    isLoading: false,
    error: null,

    loadedData: props.initialData,
  });

  // Initialize services
  const autosave = new ${capitalizedName}AutosaveService();
  const undoRedo = new ${capitalizedName}UndoRedoService();

  // Initialize autosave with store and result processor
  autosave.initialize(store, setStore, (results) => {
    process${capitalizedName}EventResultQueue(results, store, setStore);
  });

  const actions: ${capitalizedName}Actions = {
    setCurrentView: (view) => setStore("currentView", view),
  };

  const emitEvent = (event: ${capitalizedName}Event) => {
    // Queue for autosave (sends to server)
    autosave.queueEvent(event);

    // Process locally for optimistic UI updates
    process${capitalizedName}EventQueue([event], store, setStore);
  };

  // Cleanup on unmount
  onCleanup(() => {
    autosave.destroy();
    undoRedo.clear();
  });

  return (
    <${capitalizedName}Context.Provider
      value={{ store, actions, autosave, undoRedo, emitEvent }}
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

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}Context.tsx`,
    contextFile
  );

  // Step 5: Create event processor
  const eventProcessor = `import type { SetStoreFunction } from "solid-js/store";
import type { ${capitalizedName}Store } from "./${capitalizedName}Context";
import type { ${capitalizedName}Event, ${capitalizedName}EventResult } from "@shared/types/${camelName}Events";

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
    case "SAMPLE_${toScreamingSnakeCase(name)}_EVENT": {
      // TODO: Add optimistic UI update logic here
      // Example: setStore("data", "someField", event.newValue);
      break;
    }
    default:
      console.warn("Unknown ${name} event type:", event);
  }
}

export function process${capitalizedName}EventResultQueue(
  results: ${capitalizedName}EventResult[],
  store: ${capitalizedName}Store,
  setStore: SetStoreFunction<${capitalizedName}Store>
) {
  for (const result of results) {
    process${capitalizedName}EventResult(result, store, setStore);
  }
}

export function process${capitalizedName}EventResult(
  result: ${capitalizedName}EventResult,
  store: ${capitalizedName}Store,
  setStore: SetStoreFunction<${capitalizedName}Store>
) {
  switch (result.type) {
    case "SAMPLE_${toScreamingSnakeCase(name)}_EVENT": {
      // TODO: Process server response here
      // Example: Update UI with server-generated IDs or confirmations
      // setStore("data", "items", (items) => items.map(item =>
      //   item.tempId === result.tempId ? { ...item, id: result.id } : item
      // ));
      break;
    }
    default:
      console.warn("Unknown ${name} event result type:", result);
  }
}`;

  await fs.outputFile(
    `src/client/${name}/${camelName}EventProcessor.ts`,
    eventProcessor
  );


  spinner.succeed("Created context, event processor, and views");

  // Step 7: Update vite.config.ts
  spinner.start("Updating vite.config.ts...");
  await updateViteConfig(name);
  spinner.succeed("Updated vite.config.ts");

  // Step 8: Create ApiClient file and append types to schemas
  spinner.start("Creating API client and updating types...");

  // Calculate relative import path from the API client location to the schemas file
  const apiClientPath = `src/client/${name}/${capitalizedName}ApiClient.ts`;
  const relativeImportPath = path
    .relative(path.dirname(apiClientPath), schemasPath.replace(/\.ts$/, ""))
    .replace(/\\/g, "/");

  const apiClientFile = `import type {
  Load${capitalizedName}Response,
  Load${capitalizedName}Request,
  Save${capitalizedName}Request,
  Save${capitalizedName}Response
} from "${
    relativeImportPath.startsWith(".")
      ? relativeImportPath
      : "./" + relativeImportPath
  }";

class ${capitalizedName}ApiClient {
  private baseUrl = "/api/${name}";

  async load${capitalizedName}(): Promise<Load${capitalizedName}Response> {
    const response = await fetch(\`\${this.baseUrl}/load\`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to load ${name}");
    return response.json();
  }

  async save${capitalizedName}(
    request: Save${capitalizedName}Request
  ): Promise<Save${capitalizedName}Response> {
    const response = await fetch(\`\${this.baseUrl}/save\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to save ${name} changes");
    return response.json();
  }
}

export const ${camelName}ApiClient = new ${capitalizedName}ApiClient();`;

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}ApiClient.ts`,
    apiClientFile
  );

  // Append types to schemas file
  const typesToAppend = `
// ${capitalizedName} API Types
import type { ${capitalizedName}Event, ${capitalizedName}EventResult } from "./${camelName}Events";

export const Load${capitalizedName}RequestSchema = z.object({});

export const Load${capitalizedName}ResponseSchema = z.object({
  data: z.any(), // Update this with your specific data schema
  // Add your response properties here
});

export const Save${capitalizedName}RequestSchema = z.object({
  events: z.array(z.custom<${capitalizedName}Event>()),
});

export const Save${capitalizedName}ResponseSchema = z.object({
  success: z.boolean(),
  processedCount: z.number(),
  totalChanges: z.number(),
  results: z.array(z.custom<${capitalizedName}EventResult>()),
});

export type Load${capitalizedName}Request = z.infer<typeof Load${capitalizedName}RequestSchema>;
export type Load${capitalizedName}Response = z.infer<typeof Load${capitalizedName}ResponseSchema>;
export type Save${capitalizedName}Request = z.infer<typeof Save${capitalizedName}RequestSchema>;
export type Save${capitalizedName}Response = z.infer<typeof Save${capitalizedName}ResponseSchema>;`;

  if (await fs.pathExists(schemasPath)) {
    const existingContent = await fs.readFile(schemasPath, "utf8");
    const updatedContent = existingContent + typesToAppend;
    await fs.writeFile(schemasPath, updatedContent);
    spinner.text = "Created API client and updated schemas";
  } else {
    // Create the schemas file if it doesn't exist
    const schemasContent = `import { z } from "zod";

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  statusCode: z.number(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
${typesToAppend}`;

    await fs.outputFile(schemasPath, schemasContent);
    spinner.text = "Created API client and schemas file";
  }

  spinner.succeed("Created API client and updated types");

  // Step 9: Create AutosaveService
  spinner.start("Creating AutosaveService...");

  const autosaveService = `import type { ${capitalizedName}Event, ${capitalizedName}EventResult } from '@shared/types/${camelName}Events';
import type { SetStoreFunction } from 'solid-js/store';
import type { ${capitalizedName}Store } from './${capitalizedName}Context';
import { ${camelName}ApiClient } from './${capitalizedName}ApiClient';

export class ${capitalizedName}AutosaveService {
  private eventQueue: ${capitalizedName}Event[] = [];
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private store: ${capitalizedName}Store | null = null;
  private setStore: SetStoreFunction<${capitalizedName}Store> | null = null;
  private processResults: ((results: ${capitalizedName}EventResult[]) => void) | null = null;

  // This is the debounce time of saves on this page. If this page has lots of simultaneous changes, you can increase this.
  // If the page doesn't ofter have lots of simultaneous changes, you can decrease this.
  private readonly DEBOUNCE_MS = 10;

  initialize(
    store: ${capitalizedName}Store,
    setStore: SetStoreFunction<${capitalizedName}Store>,
    processResults: (results: ${capitalizedName}EventResult[]) => void
  ) {
    this.store = store;
    this.setStore = setStore;
    this.processResults = processResults;
  }

  queueEvent(event: ${capitalizedName}Event) {
    this.eventQueue.push(event);
    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      void this.flush();
    }, this.DEBOUNCE_MS);
  }

  async flush() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await ${camelName}ApiClient.save${capitalizedName}({ events });

      // Process server results
      if (response.results && this.processResults) {
        this.processResults(response.results);
      }
    } catch (error) {
      console.error('Failed to save events:', error);
      // Re-add events to queue on failure
      this.eventQueue.unshift(...events);
    }
  }

  destroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    void this.flush();
  }
}`;

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}AutosaveService.ts`,
    autosaveService
  );
  spinner.succeed("Created AutosaveService");

  // Step 10: Create UndoRedoService
  spinner.start("Creating UndoRedoService...");

  const undoRedoService = `interface Action {
  undo: () => void;
  redo: () => void;
  description?: string;
}

export class ${capitalizedName}UndoRedoService {
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];
  private maxStackSize = 100;

  pushAction(action: Action) {
    this.undoStack.push(action);
    this.redoStack = [];

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) return;

    action.undo();
    this.redoStack.push(action);
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return;

    action.redo();
    this.undoStack.push(action);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoDescription(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.description;
  }

  getRedoDescription(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.description;
  }
}`;

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}UndoRedoService.ts`,
    undoRedoService
  );
  spinner.succeed("Created UndoRedoService");

  // Step 11: Add routes to index.ts
  await addRoutesToIndex(name, routesPath, spinner);

  // Step 12: Add UserShard functions
  await addUserShardFunctions(name, userShardPath, spinner);

  // Step 13: Create events file
  await createEventsFile(name, spinner);

  // Step 14: Update vite.config.ts
  spinner.start("Updating vite.config.ts...");
  await updateViteConfig(name);
  spinner.succeed("Updated vite.config.ts");

  // Step 12: Create load endpoint info
  spinner.start("Creating API integration info...");

  console.log(chalk.yellow("\n📋 Add these to your server:"));
  console.log(
    chalk.gray("1. Add to your load endpoint (src/server/api/load.ts):")
  );
  console.log(
    chalk.cyan(`
app.get("/api/${name}/load", authMiddleware, async (c) => {
  const userId = c.get("userId");
  
  // Load ${name}-specific data
  const data = {
    // Add your data here
  };
  
  return c.json(data);
});`)
  );

  console.log(chalk.gray("2. Add save endpoint (src/server/api/save.ts):"));
  console.log(
    chalk.cyan(`
app.post("/api/${name}/save", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const { changes } = await c.req.json();
  
  // Process changes
  for (const change of changes) {
    switch (change.type) {
      // Handle different change types
    }
  }
  
  return c.json({ success: true });
});`)
  );

  console.log(chalk.gray("3. Add event types to @shared/types/events.ts:"));
  console.log(
    chalk.cyan(`
export type ${capitalizedName}Event = {
  type: "SAMPLE_EVENT";
  // Add your event properties
};

export type Change = ${capitalizedName}Event | OtherEvent;`)
  );

  spinner.succeed("API integration info created");
}

async function addRoutesToIndex(
  name: string,
  routesPath: string,
  spinner: any
) {
  spinner.start("Adding routes to index.ts...");

  const capitalizedName = toPascalCase(name);

  if (!(await fs.pathExists(routesPath))) {
    spinner.warn(
      `Routes file not found at ${routesPath}, skipping route generation`
    );
    return;
  }

  const routesContent = await fs.readFile(routesPath, "utf8");

  // Check if we need to add imports
  let updatedContent = routesContent;

  // Add ContentfulStatusCode import if not present
  if (!routesContent.includes('ContentfulStatusCode')) {
    const contentfulImportMatch = updatedContent.match(
      /import\s+{([^}]+)}\s+from\s+["']hono\/utils\/http-status["'];?/
    );
    if (!contentfulImportMatch) {
      // Add the import after the first import statement
      const firstImportEnd = updatedContent.indexOf('\n', updatedContent.indexOf('import'));
      if (firstImportEnd !== -1) {
        updatedContent =
          updatedContent.slice(0, firstImportEnd + 1) +
          `import { ContentfulStatusCode } from "hono/utils/http-status";\n` +
          updatedContent.slice(firstImportEnd + 1);
      }
    } else {
      // ContentfulStatusCode might already be imported, check if it's in the list
      const existingImports = contentfulImportMatch[1].trim();
      if (!existingImports.includes('ContentfulStatusCode')) {
        const newImports = `${existingImports.replace(/,\s*$/, "")}, ContentfulStatusCode`;
        updatedContent = updatedContent.replace(
          contentfulImportMatch[0],
          `import { ${newImports} } from "hono/utils/http-status";`
        );
      }
    }
  }

  // Add schema imports if not present
  if (!routesContent.includes(`Load${capitalizedName}ResponseSchema`)) {
    const importMatch = routesContent.match(
      /import {([^}]+)} from ["']@shared\/types\/request-response-schemas["'];/
    );
    if (importMatch) {
      const existingImports = importMatch[1].trim();
      // Remove any trailing commas and clean up
      const cleanedImports = existingImports.replace(/,\s*$/, "");
      const newImports = `${cleanedImports},
  Load${capitalizedName}ResponseSchema,
  Save${capitalizedName}RequestSchema,
  Save${capitalizedName}ResponseSchema`;
      updatedContent = updatedContent.replace(
        importMatch[0],
        `import {${newImports}
} from "@shared/types/request-response-schemas";`
      );
    } else {
      // Add new import if none exists
      const firstImportIndex = updatedContent.indexOf("import");
      if (firstImportIndex !== -1) {
        const importToAdd = `import {
  Load${capitalizedName}ResponseSchema,
  Save${capitalizedName}RequestSchema,
  Save${capitalizedName}ResponseSchema,
} from "@shared/types/request-response-schemas";
`;
        updatedContent =
          updatedContent.slice(0, firstImportIndex) +
          importToAdd +
          updatedContent.slice(firstImportIndex);
      }
    }
  }

  // Add routes before the last route or at the end
  const routesToAdd = `
// ${capitalizedName} endpoints
app.get("/api/${name}/load", async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return sendError(c, 401, "Unauthorized");
  }

  const shardId = c.env.USER_SHARD.idFromName(user.id);
  const userShard = c.env.USER_SHARD.get(shardId);

  const result = await userShard.load${capitalizedName}(user.id);

  if ("error" in result) {
    return sendError(c, 500, result.error);
  }

  return send(c, Load${capitalizedName}ResponseSchema, result, 200);
});

app.post(
  "/api/${name}/save",
  zValidator("json", Save${capitalizedName}RequestSchema),
  async (c) => {
    try {
      const user = await getAuthenticatedUser(c);
      if (!user) {
        return sendError(c, 401, "Unauthorized");
      }

      const { events } = c.req.valid("json");

      const shardId = c.env.USER_SHARD.idFromName(user.id);
      const userShard = c.env.USER_SHARD.get(shardId);

      const result = await userShard.save${capitalizedName}(user.id, events);
      if ("error" in result) {
        return sendError(c, result.statusCode as ContentfulStatusCode, result.error);
      }

      return send(c, Save${capitalizedName}ResponseSchema, result, 200);
    } catch (error) {
      console.error("Error saving ${name}:", error);
      return sendError(c, 500, "Internal server error");
    }
  }
);
`;

  // Find the 404 catchall route and add routes before it
  const catchallIndex = updatedContent.indexOf('app.get("*"');
  if (catchallIndex !== -1) {
    updatedContent =
      updatedContent.slice(0, catchallIndex) +
      routesToAdd +
      "\n" +
      updatedContent.slice(catchallIndex);
  } else {
    // If no catchall found, find export default and add before it
    const exportDefaultIndex = updatedContent.lastIndexOf("export default");
    if (exportDefaultIndex !== -1) {
      updatedContent =
        updatedContent.slice(0, exportDefaultIndex) +
        routesToAdd +
        "\n" +
        updatedContent.slice(exportDefaultIndex);
    } else {
      // If no export default, add at the end
      updatedContent += routesToAdd;
    }
  }

  await fs.writeFile(routesPath, updatedContent);
  spinner.succeed("Added routes to index.ts");
}

async function addUserShardFunctions(
  name: string,
  userShardPath: string,
  spinner: any
) {
  spinner.start("Adding UserShard functions...");

  const capitalizedName = toPascalCase(name);
  const camelName = toCamelCase(name);

  if (!(await fs.pathExists(userShardPath))) {
    spinner.warn(
      `UserShard file not found at ${userShardPath}, skipping UserShard generation`
    );
    return;
  }

  const userShardContent = await fs.readFile(userShardPath, "utf8");

  // Add type imports if not present
  let updatedContent = userShardContent;

  // Add imports from request-response-schemas
  if (!updatedContent.includes(`Load${capitalizedName}Response`)) {
    // Find the import block for request-response-schemas and add our types
    const importMatch = updatedContent.match(
      /import (?:type )?{([^}]+)} from ["']@shared\/types\/request-response-schemas["'];/
    );
    if (importMatch) {
      const existingImports = importMatch[1].trim();
      // Parse existing imports to avoid duplicates
      const existingImportsList = existingImports.split(',').map(i => i.trim());
      const importsToAdd = [`Load${capitalizedName}Response`, `Save${capitalizedName}Response`];

      // Only add ErrorResponse if not already present
      if (!existingImportsList.includes('ErrorResponse')) {
        importsToAdd.unshift('ErrorResponse');
      }

      // Filter out any that already exist
      const newImportsList = importsToAdd.filter(imp => !existingImportsList.includes(imp));

      if (newImportsList.length > 0) {
        const cleanedImports = existingImports.replace(/,\s*$/, "");
        const newImports = `${cleanedImports}, ${newImportsList.join(', ')}`;
        updatedContent = updatedContent.replace(
          importMatch[0],
          `import { ${newImports} } from "@shared/types/request-response-schemas";`
        );
      }
    } else {
      // Add new import if none exists
      const firstImportIndex = updatedContent.indexOf("import");
      if (firstImportIndex !== -1) {
        const importToAdd = `import { ErrorResponse, Load${capitalizedName}Response, Save${capitalizedName}Response } from "@shared/types/request-response-schemas";\n`;
        updatedContent =
          updatedContent.slice(0, firstImportIndex) +
          importToAdd +
          updatedContent.slice(firstImportIndex);
      }
    }
  }

  // Add imports from events file
  if (!updatedContent.includes(`${capitalizedName}Event`)) {
    const eventsImportMatch = updatedContent.match(
      /import (?:type )?{([^}]+)} from ["']@shared\/types\/${camelName}Events["'];/
    );
    if (eventsImportMatch) {
      const existingImports = eventsImportMatch[1].trim();
      const cleanedImports = existingImports.replace(/,\s*$/, "");
      const newImports = `${cleanedImports}, ${capitalizedName}Event, ${capitalizedName}Change, ${capitalizedName}EventResult, handle${capitalizedName}Change`;
      updatedContent = updatedContent.replace(
        eventsImportMatch[0],
        `import { ${newImports} } from "@shared/types/${camelName}Events";`
      );
    } else {
      // Add new import after the request-response-schemas import
      const schemasImportIndex = updatedContent.indexOf("@shared/types/request-response-schemas");
      if (schemasImportIndex !== -1) {
        const lineEndIndex = updatedContent.indexOf("\n", schemasImportIndex);
        const importToAdd = `\nimport { ${capitalizedName}Event, ${capitalizedName}Change, ${capitalizedName}EventResult, handle${capitalizedName}Change } from "@shared/types/${camelName}Events";`;
        updatedContent =
          updatedContent.slice(0, lineEndIndex) +
          importToAdd +
          updatedContent.slice(lineEndIndex);
      }
    }
  }

  // Add the load and save functions before the closing brace of the class
  const functionsToAdd = `
  async load${capitalizedName}(userId: string): Promise<Load${capitalizedName}Response | ErrorResponse> {
    try {
      // TODO: Implement load logic for ${name}
      // Example: Query your schema tables and return data
      const data = {
        // Add your data loading logic here
      };

      return {
        data,
        // Add other response fields as needed
      } as Load${capitalizedName}Response;
    } catch (error) {
      console.error("Error loading ${name}:", error);
      return {
        error: "Failed to load ${name}",
        success: false,
        statusCode: 500,
      };
    }
  }

  async save${capitalizedName}(
    userId: string,
    events: ${capitalizedName}Event[]
  ): Promise<Save${capitalizedName}Response | ErrorResponse> {
    try {
      const results: ${capitalizedName}EventResult[] = [];
      let processedCount = 0;

      for (const event of events) {
        try {
          // Server adds persistence metadata
          const change: ${capitalizedName}Change = {
            ...event,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            description: \`\${event.type} event\`,
          };

          const result = await handle${capitalizedName}Change(
            this.env.DB,
            this.shardDb,
            change
          );

          if (result.success && result.result) {
            results.push(result.result);
            processedCount++;
          }
        } catch (error) {
          console.error("Error processing ${name} event:", error, event);
        }
      }

      return {
        success: true,
        processedCount,
        totalChanges: events.length,
        results,
      } as Save${capitalizedName}Response;
    } catch (error) {
      console.error("Error saving ${name}:", error);
      return {
        error: "Failed to save ${name} changes",
        success: false,
        statusCode: 500,
      };
    }
  }
`;

  // Find the last method in the class and add our functions before the closing brace
  const lastBraceIndex = updatedContent.lastIndexOf("}");
  if (lastBraceIndex !== -1) {
    updatedContent =
      updatedContent.slice(0, lastBraceIndex) +
      functionsToAdd +
      "\n" +
      updatedContent.slice(lastBraceIndex);
  }

  await fs.writeFile(userShardPath, updatedContent);
  spinner.succeed("Added UserShard functions");
}

async function createEventsFile(name: string, spinner: any) {
  spinner.start("Creating events file...");

  const capitalizedName = toPascalCase(name);
  const camelName = toCamelCase(name);
  const snakeName = toScreamingSnakeCase(name);

  const eventsContent = `import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type * as userShardSchema from "~/db/userShard.schema";
import type * as schema from "~/db/schema";

// ===== EVENT TYPES (what client sends) =====
export type Sample${capitalizedName}Event = {
  type: "SAMPLE_${snakeName}_EVENT";
  sampleData: string;
  previousValue?: string;
  newValue: string;
};

export type ${capitalizedName}Event = Sample${capitalizedName}Event;

// ===== RESPONSE TYPES (what server returns after processing) =====
export type Sample${capitalizedName}EventResult = Sample${capitalizedName}Event; // No extra server fields for this example

export type ${capitalizedName}EventResult = Sample${capitalizedName}EventResult;

// ===== TYPE MAPPING =====
export type ${capitalizedName}EventMap = {
  "SAMPLE_${snakeName}_EVENT": {
    event: Sample${capitalizedName}Event;
    result: Sample${capitalizedName}EventResult;
  };
};

export type ${capitalizedName}EventType = keyof ${capitalizedName}EventMap;

export type ResultForEvent<T extends ${capitalizedName}Event> =
  ${capitalizedName}EventMap[T["type"]]["result"];

/**
 * Persistence metadata added by the server
 */
export interface PersistenceMetadata {
  id: string;
  timestamp: number;
  description: string;
}

/**
 * Change type for server-side persistence
 * Includes all event data plus persistence metadata
 */
export type ${capitalizedName}Change = ${capitalizedName}Event & PersistenceMetadata;

/**
 * Types for change handlers
 */
export type ${capitalizedName}ChangeType = ${capitalizedName}Change["type"];

export type ${capitalizedName}ChangeHandler<T extends ${capitalizedName}Event> = (
  db: D1Database,
  userShardDb: DrizzleSqliteDODatabase<typeof userShardSchema>,
  change: T & PersistenceMetadata
) => Promise<{ success: boolean; result?: ResultForEvent<T> }>;

export type AssertNever = (x: never) => never;

// ===== HANDLER IMPLEMENTATION =====
export async function handle${capitalizedName}Change(
  db: D1Database,
  userShardDb: DrizzleSqliteDODatabase<typeof userShardSchema>,
  change: ${capitalizedName}Change
): Promise<{ success: boolean; result?: ${capitalizedName}EventResult }> {
  switch (change.type) {
    case "SAMPLE_${snakeName}_EVENT": {
      // TODO: Implement handler logic
      // Example: await userShardDb.insert(someTable).values({ ... });

      return {
        success: true,
        result: {
          type: "SAMPLE_${snakeName}_EVENT",
          sampleData: change.sampleData,
          previousValue: change.previousValue,
          newValue: change.newValue,
          // Add any server-generated fields here
        }
      };
    }
    default:
      throw new Error(\`Unknown ${camelName} change type: \${(change as ${capitalizedName}Change).type}\`);
  }
}
`;

  await fs.outputFile(`shared/types/${camelName}Events.ts`, eventsContent);
  spinner.succeed("Created events file");
}

async function createFeedPageFlow(
  name: string,
  spinner: any,
  schemasPath: string,
  routesPath: string,
  userShardPath: string
) {
  const capitalizedName = toPascalCase(name);
  const camelName = toCamelCase(name);
  const snakeName = toScreamingSnakeCase(name);

  // Step 1: Create index.html (simple like dashboard)
  spinner.start("Creating feed page structure...");

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

  // Step 3: Create main Feed component
  const mainComponent = `import { For, Show, createResource, onCleanup, onMount } from "solid-js";
import { createAuthClient } from "better-auth/solid";
import { ${capitalizedName}Provider, use${capitalizedName} } from "./${capitalizedName}Context";
import { Flex } from "~/components/ui/flex";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Icon } from "solid-heroicons";
import {
  arrowRightOnRectangle,
  home,
  ellipsisHorizontal,
} from "solid-heroicons/outline";
import { ${camelName}ApiClient } from "./${capitalizedName}ApiClient";

const authClient = createAuthClient({
  baseURL: window.location.origin,
});

function ${capitalizedName}Skeleton() {
  return (
    <div class="min-h-screen font-manrope bg-background flex">
      {/* Sidebar Skeleton */}
      <Flex
        flexDirection="col"
        class="hidden md:flex md:w-80 lg:w-96 h-screen px-4"
      >
        <div class="py-4 space-y-2">
          <Skeleton class="h-12 w-32" />
          <Skeleton class="h-12 w-32" />
        </div>
        <div class="flex-1" />
        <div class="mb-4">
          <Skeleton class="h-14 w-full rounded-full" />
        </div>
      </Flex>

      {/* Main Content Skeleton */}
      <div class="flex-1 min-w-0 max-w-2xl">
        <header class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div class="px-4 h-14 flex items-center">
            <Skeleton class="h-6 w-24" />
          </div>
        </header>

        {/* Feed skeleton */}
        <div>
          <For each={[1, 2, 3, 4, 5]}>
            {() => (
              <div class="p-4">
                <Flex alignItems="start" class="gap-3">
                  <Skeleton class="w-10 h-10 rounded-full flex-shrink-0" />
                  <div class="flex-1 space-y-2">
                    <Skeleton class="h-4 w-32" />
                    <Skeleton class="h-4 w-full" />
                    <Skeleton class="h-4 w-full" />
                    <Skeleton class="h-4 w-2/3" />
                  </div>
                </Flex>
                <div class="mt-4 ml-[52px] border-t border-border/40 w-[calc(100%-52px)]" />
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

function FeedItem(props: {
  item: any; // Update this with your specific item type
}) {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return \`\${days}d\`;
    if (hours > 0) return \`\${hours}h\`;
    if (minutes > 0) return \`\${minutes}m\`;
    return \`\${seconds}s\`;
  };

  return (
    <div>
      <div class="py-4 px-4 hover:bg-accent/30 transition-colors">
        <Flex alignItems="start" class="gap-3">
          <Avatar class="w-10 h-10 flex-shrink-0">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div class="flex-1 min-w-0">
            <Flex alignItems="center" class="gap-2 mb-1">
              <span class="font-semibold text-sm">User Name</span>
              <span class="text-muted-foreground text-sm">
                · {formatTimestamp(Date.now())}
              </span>
            </Flex>
            {/* Replace with your content here */}
            <p class="text-sm whitespace-pre-wrap break-words">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>
        </Flex>
      </div>
      <div class="px-4">
        <div class="ml-[52px] border-t border-border/40" />
      </div>
    </div>
  );
}

function ${capitalizedName}Content() {
  const feed = use${capitalizedName}();
  const { store, actions } = feed;
  let sentinelRef: HTMLDivElement | undefined;

  const logout = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Intersection observer for infinite scroll
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.isIntersecting &&
          !store.isLoadingMore &&
          store.continuationToken
        ) {
          actions.loadMore${capitalizedName}();
        }
      },
      { rootMargin: "100px" }
    );

    if (sentinelRef) {
      observer.observe(sentinelRef);
    }

    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="min-h-screen font-manrope bg-background flex">
      {/* Left Sidebar */}
      <Flex
        flexDirection="col"
        class="hidden md:flex md:w-80 lg:w-96 sticky top-0 h-screen"
      >
        {/* Navigation - Sample content, replace with your own navigation items */}
        <Flex flexDirection="col" class="py-4 gap-1 px-4">
          <Button
            variant="ghost"
            onClick={() => actions.navigateToView("feed")}
            class="w-full justify-start gap-4 px-4 py-3 h-auto rounded-full text-lg min-w-0"
            classList={{
              "font-bold bg-accent": store.currentView === "feed",
            }}
          >
            <Icon path={home} class="w-7 h-7 flex-shrink-0" />
            <span class="truncate">Feed</span>
          </Button>
        </Flex>

        {/* Spacer */}
        <div class="flex-1" />

        {/* Bottom section with profile - Sample content, customize as needed */}
        <Flex flexDirection="col" class="mb-4 gap-1 px-4">
          <div class="w-full flex items-center justify-start gap-4 px-4 py-3 rounded-full min-w-0">
            <Avatar class="w-10 h-10 flex-shrink-0">
              <AvatarFallback class="text-xs">
                {store.user.name?.[0]?.toUpperCase() ||
                  store.user.email?.[0]?.toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div class="flex flex-col items-start gap-0 min-w-0 flex-1 overflow-hidden text-left">
              <p class="text-sm font-medium truncate max-w-full">
                {store.user.name || store.user.email}
              </p>
              <p class="text-xs text-muted-foreground truncate max-w-full">
                {store.user.email}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                as={Button}
                variant="ghost"
                size="icon"
                class="flex-shrink-0 h-10 w-10 rounded-full"
              >
                <Icon path={ellipsisHorizontal} class="w-5 h-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={logout}>
                  <Icon path={arrowRightOnRectangle} class="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Flex>
      </Flex>

      {/* Main Content */}
      <div class="flex-1 min-w-0 max-w-2xl">
        {/* Header */}
        <header class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div class="px-4 h-14 flex items-center">
            <h1 class="text-xl font-bold">Feed</h1>
          </div>
        </header>

        {/* Main feed content - Sample content, replace with your own content */}
        <div>
          <Show
            when={store.feedItems.length > 0}
            fallback={
              <div class="p-8 text-center text-muted-foreground">
                No feed items yet
              </div>
            }
          >
            <For each={store.feedItems}>
              {(item) => <FeedItem item={item} />}
            </For>
          </Show>

          {/* Loading more indicator */}
          <Show when={store.isLoadingMore}>
            <div class="p-4 text-center">
              <Skeleton class="h-20 w-full" />
            </div>
          </Show>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} class="h-4" />

          {/* End of feed */}
          <Show when={!store.continuationToken && store.feedItems.length > 0}>
            <div class="p-8 text-center text-muted-foreground text-sm">
              You've reached the end
            </div>
          </Show>

          {/* Error message */}
          <Show when={store.error}>
            <div class="p-4 text-center text-destructive text-sm">
              {store.error}
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}

export default function ${capitalizedName}() {
  // Load dashboard data using createResource
  const [${camelName}Data] = createResource(async () => {
    try {
      const data = await ${camelName}ApiClient.load${capitalizedName}();
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
      when={session() && !session().isPending && !${camelName}Data.loading}
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
        <${capitalizedName}Provider initialData={${camelName}Data()!} user={session().data!.user}>
          <${capitalizedName}Content />
        </${capitalizedName}Provider>
      </Show>
    </Show>
  );
}`;

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}.tsx`,
    mainComponent
  );

  spinner.succeed("Created main component");

  // Continue with other files...
  spinner.start("Creating context and services...");

  // Step 4: Create Context
  const contextFile = `import {
  createContext,
  useContext,
  type ParentComponent,
  createMemo,
  onCleanup,
  createSignal,
  createEffect,
  on,
  JSX,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import { ${capitalizedName}AutosaveService } from "./${capitalizedName}AutosaveService";
import { ${capitalizedName}UndoRedoService } from "./${capitalizedName}UndoRedoService";
import type { ${capitalizedName}Event } from "@shared/types/${camelName}Events";
import type { User } from "better-auth";
// Import database types like this:
// import type { User as UserSchema } from "@shared/types/primitives";
import {
  process${capitalizedName}EventQueue,
  process${capitalizedName}EventResultQueue,
} from "./${camelName}EventProcessor";
import { ${camelName}ApiClient } from "./${capitalizedName}ApiClient";
import {
  Load${capitalizedName}Response,
} from "@shared/types/request-response-schemas";

export type View = "feed" | "view-2";

export interface ${capitalizedName}Store {
  // User data
  user: User;

  // Feed data
  feedItems: unknown[]; // Update this with your specific data type
  continuationToken: string | undefined;

  // UI state
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  currentView: View;
}

export interface ${capitalizedName}Actions {
  loadMore${capitalizedName}: () => Promise<void>;
  navigateToView: (view: View) => void;
}

interface ${capitalizedName}ContextType {
  store: ${capitalizedName}Store;
  actions: ${capitalizedName}Actions;
  autosave: ${capitalizedName}AutosaveService;
  undoRedo: ${capitalizedName}UndoRedoService;
  emitEvent: (event: ${capitalizedName}Event) => void;
}

const ${capitalizedName}Context = createContext<${capitalizedName}ContextType>();

function getViewFromURL(): View {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  return view === "view-2" ? "view-2" : "feed";
}

function setURLView(view: View) {
  const params = new URLSearchParams(window.location.search);
  if (view === "feed") {
    params.delete("view");
  } else {
    params.set("view", view);
  }
  const newURL = params.toString()
    ? \`?\${params.toString()}\`
    : window.location.pathname;
  window.history.pushState({}, "", newURL);
}

export function ${capitalizedName}Provider(props: {
  children: JSX.Element;
  initialData: Load${capitalizedName}Response;
  user: User;
}) {
  const [store, setStore] = createStore<${capitalizedName}Store>({
    user: props.user,
    feedItems: props.initialData.feedData,
    continuationToken: props.initialData.continuationToken,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    currentView: getViewFromURL(),
  });

  // Initialize services
  const autosave = new ${capitalizedName}AutosaveService();
  const undoRedo = new ${capitalizedName}UndoRedoService();

  // Initialize autosave with store and result processor
  autosave.initialize(store, setStore, (results) => {
    process${capitalizedName}EventResultQueue(results, store, setStore);
  });

  // Listen for browser back/forward navigation
  const handlePopState = () => {
    setStore("currentView", getViewFromURL());
  };
  window.addEventListener("popstate", handlePopState);
  onCleanup(() => window.removeEventListener("popstate", handlePopState));

  const actions: ${capitalizedName}Actions = {
    loadMore${capitalizedName}: async () => {
      if (!store.continuationToken || store.isLoadingMore) {
        return;
      }

      setStore("isLoadingMore", true);
      setStore("error", null);

      try {
        const response = await ${camelName}ApiClient.load${capitalizedName}(store.continuationToken);
        setStore("feedItems", [...store.feedItems, ...response.feedData]);
        setStore("continuationToken", response.continuationToken);
      } catch (error) {
        console.error("Failed to load more feed items:", error);
        setStore("error", "Failed to load more feed items");
      } finally {
        setStore("isLoadingMore", false);
      }
    },
    navigateToView: (view: View) => {
      setStore("currentView", view);
      setURLView(view);
    },
  };

  const emitEvent = (event: ${capitalizedName}Event) => {
    // Queue for autosave (sends to server)
    autosave.queueEvent(event);

    // Process locally for optimistic UI updates
    process${capitalizedName}EventQueue([event], store, setStore);
  };

  // Cleanup on unmount
  onCleanup(() => {
    autosave.destroy();
    undoRedo.clear();
  });

  return (
    <${capitalizedName}Context.Provider
      value={{ store, actions, autosave, undoRedo, emitEvent }}
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

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}Context.tsx`,
    contextFile
  );

  // Step 5: Create event processor
  const eventProcessor = `import type { SetStoreFunction } from "solid-js/store";
import type { ${capitalizedName}Store } from "./${capitalizedName}Context";
import type { ${capitalizedName}Event, ${capitalizedName}EventResult } from "@shared/types/${camelName}Events";

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
    case "SAMPLE_${toScreamingSnakeCase(name)}_EVENT": {
      // TODO: Add optimistic UI update logic here
      // Example: setStore("data", "someField", event.newValue);
      break;
    }
    default:
      console.warn("Unknown ${name} event type:", event);
  }
}

export function process${capitalizedName}EventResultQueue(
  results: ${capitalizedName}EventResult[],
  store: ${capitalizedName}Store,
  setStore: SetStoreFunction<${capitalizedName}Store>
) {
  for (const result of results) {
    process${capitalizedName}EventResult(result, store, setStore);
  }
}

export function process${capitalizedName}EventResult(
  result: ${capitalizedName}EventResult,
  store: ${capitalizedName}Store,
  setStore: SetStoreFunction<${capitalizedName}Store>
) {
  switch (result.type) {
    case "SAMPLE_${toScreamingSnakeCase(name)}_EVENT": {
      // TODO: Process server response here
      // Example: Update UI with server-generated IDs or confirmations
      // setStore("data", "items", (items) => items.map(item =>
      //   item.tempId === result.tempId ? { ...item, id: result.id } : item
      // ));
      break;
    }
    default:
      console.warn("Unknown ${name} event result type:", result);
  }
}`;

  await fs.outputFile(
    `src/client/${name}/${camelName}EventProcessor.ts`,
    eventProcessor
  );

  spinner.succeed("Created context and event processor");

  // Step 6: Update vite.config.ts
  spinner.start("Updating vite.config.ts...");
  await updateViteConfig(name);
  spinner.succeed("Updated vite.config.ts");

  // Step 7: Create ApiClient file and append types to schemas
  spinner.start("Creating API client and updating types...");

  // Calculate relative import path from the API client location to the schemas file
  const apiClientPath = `src/client/${name}/${capitalizedName}ApiClient.ts`;
  const relativeImportPath = path
    .relative(path.dirname(apiClientPath), schemasPath.replace(/\.ts$/, ""))
    .replace(/\\/g, "/");

  const apiClientFile = `import type {
  Load${capitalizedName}Response,
  Load${capitalizedName}Request,
  Save${capitalizedName}Request,
  Save${capitalizedName}Response
} from "${
    relativeImportPath.startsWith(".")
      ? relativeImportPath
      : "./" + relativeImportPath
  }";

class ${capitalizedName}ApiClient {
  private baseUrl = "/api/${name}";

  async load${capitalizedName}(continuationToken?: string): Promise<Load${capitalizedName}Response> {
    const url = continuationToken
      ? \`\${this.baseUrl}/load?continuationToken=\${encodeURIComponent(continuationToken)}\`
      : \`\${this.baseUrl}/load\`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to load ${name}");
    return response.json();
  }

  async save${capitalizedName}(
    request: Save${capitalizedName}Request
  ): Promise<Save${capitalizedName}Response> {
    const response = await fetch(\`\${this.baseUrl}/save\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to save ${name} changes");
    return response.json();
  }
}

export const ${camelName}ApiClient = new ${capitalizedName}ApiClient();`;

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}ApiClient.ts`,
    apiClientFile
  );

  // Append types to schemas file
  const typesToAppend = `
// ${capitalizedName} API Types
import type { ${capitalizedName}Event, ${capitalizedName}EventResult } from "./${camelName}Events";

export const Load${capitalizedName}RequestSchema = z.object({
  continuationToken: z.string().optional(),
});

export const Load${capitalizedName}ResponseSchema = z.object({
  feedData: z.array(z.object({})), // Update this with your specific data schema
  continuationToken: z.string().optional(),
});

export const Save${capitalizedName}RequestSchema = z.object({
  events: z.array(z.custom<${capitalizedName}Event>()),
});

export const Save${capitalizedName}ResponseSchema = z.object({
  success: z.boolean(),
  processedCount: z.number(),
  totalChanges: z.number(),
  results: z.array(z.custom<${capitalizedName}EventResult>()),
});

export type Load${capitalizedName}Request = z.infer<typeof Load${capitalizedName}RequestSchema>;
export type Load${capitalizedName}Response = z.infer<typeof Load${capitalizedName}ResponseSchema>;
export type Save${capitalizedName}Request = z.infer<typeof Save${capitalizedName}RequestSchema>;
export type Save${capitalizedName}Response = z.infer<typeof Save${capitalizedName}ResponseSchema>;`;

  if (await fs.pathExists(schemasPath)) {
    const existingContent = await fs.readFile(schemasPath, "utf8");
    const updatedContent = existingContent + typesToAppend;
    await fs.writeFile(schemasPath, updatedContent);
    spinner.text = "Created API client and updated schemas";
  } else {
    // Create the schemas file if it doesn't exist
    const schemasContent = `import { z } from "zod";

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  statusCode: z.number(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
${typesToAppend}`;

    await fs.outputFile(schemasPath, schemasContent);
    spinner.text = "Created API client and schemas file";
  }

  spinner.succeed("Created API client and updated types");

  // Step 8: Create AutosaveService
  spinner.start("Creating AutosaveService...");

  const autosaveService = `import type { ${capitalizedName}Event, ${capitalizedName}EventResult } from '@shared/types/${camelName}Events';
import type { SetStoreFunction } from 'solid-js/store';
import type { ${capitalizedName}Store } from './${capitalizedName}Context';
import { ${camelName}ApiClient } from './${capitalizedName}ApiClient';

export class ${capitalizedName}AutosaveService {
  private eventQueue: ${capitalizedName}Event[] = [];
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private store: ${capitalizedName}Store | null = null;
  private setStore: SetStoreFunction<${capitalizedName}Store> | null = null;
  private processResults: ((results: ${capitalizedName}EventResult[]) => void) | null = null;

  // This is the debounce time of saves on this page. If this page has lots of simultaneous changes, you can increase this.
  // If the page doesn't ofter have lots of simultaneous changes, you can decrease this.
  private readonly DEBOUNCE_MS = 10;

  initialize(
    store: ${capitalizedName}Store,
    setStore: SetStoreFunction<${capitalizedName}Store>,
    processResults: (results: ${capitalizedName}EventResult[]) => void
  ) {
    this.store = store;
    this.setStore = setStore;
    this.processResults = processResults;
  }

  queueEvent(event: ${capitalizedName}Event) {
    this.eventQueue.push(event);
    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      void this.flush();
    }, this.DEBOUNCE_MS);
  }

  async flush() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await ${camelName}ApiClient.save${capitalizedName}({ events });

      // Process server results
      if (response.results && this.processResults) {
        this.processResults(response.results);
      }
    } catch (error) {
      console.error('Failed to save events:', error);
      // Re-add events to queue on failure
      this.eventQueue.unshift(...events);
    }
  }

  destroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    void this.flush();
  }
}`;

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}AutosaveService.ts`,
    autosaveService
  );
  spinner.succeed("Created AutosaveService");

  // Step 9: Create UndoRedoService
  spinner.start("Creating UndoRedoService...");

  const undoRedoService = `interface Action {
  undo: () => void;
  redo: () => void;
  description?: string;
}

export class ${capitalizedName}UndoRedoService {
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];
  private maxStackSize = 100;

  pushAction(action: Action) {
    this.undoStack.push(action);
    this.redoStack = [];

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) return;

    action.undo();
    this.redoStack.push(action);
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return;

    action.redo();
    this.undoStack.push(action);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoDescription(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.description;
  }

  getRedoDescription(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.description;
  }
}`;

  await fs.outputFile(
    `src/client/${name}/${capitalizedName}UndoRedoService.ts`,
    undoRedoService
  );
  spinner.succeed("Created UndoRedoService");

  // Step 10: Add routes to index.ts
  await addFeedRoutesToIndex(name, routesPath, spinner);

  // Step 11: Add UserShard functions
  await addFeedUserShardFunctions(name, userShardPath, spinner);

  // Step 12: Create events file
  await createFeedEventsFile(name, spinner);
}

// Shared helper functions for creating services and routes

async function addFeedRoutesToIndex(
  name: string,
  routesPath: string,
  spinner: any
) {
  spinner.start("Adding routes to index.ts...");

  const capitalizedName = toPascalCase(name);

  if (!(await fs.pathExists(routesPath))) {
    spinner.warn(
      `Routes file not found at ${routesPath}, skipping route generation`
    );
    return;
  }

  const routesContent = await fs.readFile(routesPath, "utf8");

  // Check if we need to add imports
  let updatedContent = routesContent;

  // Add ContentfulStatusCode import if not present
  if (!routesContent.includes('ContentfulStatusCode')) {
    const contentfulImportMatch = updatedContent.match(
      /import\s+{([^}]+)}\s+from\s+["']hono\/utils\/http-status["'];?/
    );
    if (!contentfulImportMatch) {
      // Add the import after the first import statement
      const firstImportEnd = updatedContent.indexOf('\n', updatedContent.indexOf('import'));
      if (firstImportEnd !== -1) {
        updatedContent =
          updatedContent.slice(0, firstImportEnd + 1) +
          `import { ContentfulStatusCode } from "hono/utils/http-status";\n` +
          updatedContent.slice(firstImportEnd + 1);
      }
    } else {
      // ContentfulStatusCode might already be imported, check if it's in the list
      const existingImports = contentfulImportMatch[1].trim();
      if (!existingImports.includes('ContentfulStatusCode')) {
        const newImports = `${existingImports.replace(/,\s*$/, "")}, ContentfulStatusCode`;
        updatedContent = updatedContent.replace(
          contentfulImportMatch[0],
          `import { ${newImports} } from "hono/utils/http-status";`
        );
      }
    }
  }

  // Add schema imports if not present
  if (!routesContent.includes(`Load${capitalizedName}ResponseSchema`)) {
    const importMatch = routesContent.match(
      /import {([^}]+)} from ["']@shared\/types\/request-response-schemas["'];/
    );
    if (importMatch) {
      const existingImports = importMatch[1].trim();
      // Remove any trailing commas and clean up
      const cleanedImports = existingImports.replace(/,\s*$/, "");
      const newImports = `${cleanedImports},
  Load${capitalizedName}ResponseSchema,
  Save${capitalizedName}RequestSchema,
  Save${capitalizedName}ResponseSchema`;
      updatedContent = updatedContent.replace(
        importMatch[0],
        `import {${newImports}
} from "@shared/types/request-response-schemas";`
      );
    } else {
      // Add new import if none exists
      const firstImportIndex = updatedContent.indexOf("import");
      if (firstImportIndex !== -1) {
        const importToAdd = `import {
  Load${capitalizedName}ResponseSchema,
  Save${capitalizedName}RequestSchema,
  Save${capitalizedName}ResponseSchema,
} from "@shared/types/request-response-schemas";
`;
        updatedContent =
          updatedContent.slice(0, firstImportIndex) +
          importToAdd +
          updatedContent.slice(firstImportIndex);
      }
    }
  }

  // Add routes before the last route or at the end
  const routesToAdd = `
// ${capitalizedName} endpoints
app.get("/api/${name}/load", async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return sendError(c, 401, "Unauthorized");
  }

  const shardId = c.env.USER_SHARD.idFromName(user.id);
  const userShard = c.env.USER_SHARD.get(shardId);

  const result = await userShard.load${capitalizedName}(
    user.id,
    c.req.query("continuationToken")
  );

  if ("error" in result) {
    return sendError(c, 500, result.error);
  }

  return send(c, Load${capitalizedName}ResponseSchema, result, 200);
});

app.post(
  "/api/${name}/save",
  zValidator("json", Save${capitalizedName}RequestSchema),
  async (c) => {
    try {
      const user = await getAuthenticatedUser(c);
      if (!user) {
        return sendError(c, 401, "Unauthorized");
      }

      const { events } = c.req.valid("json");

      const shardId = c.env.USER_SHARD.idFromName(user.id);
      const userShard = c.env.USER_SHARD.get(shardId);

      const result = await userShard.save${capitalizedName}(user.id, events);
      if ("error" in result) {
        return sendError(
          c,
          result.statusCode as ContentfulStatusCode,
          result.error
        );
      }

      return send(c, Save${capitalizedName}ResponseSchema, result, 200);
    } catch (error) {
      console.error("Error saving ${name}:", error);
      return sendError(c, 500, "Internal server error");
    }
  }
);
`;

  // Find the 404 catchall route and add routes before it
  const catchallIndex = updatedContent.indexOf('app.get("*"');
  if (catchallIndex !== -1) {
    updatedContent =
      updatedContent.slice(0, catchallIndex) +
      routesToAdd +
      "\n" +
      updatedContent.slice(catchallIndex);
  } else {
    // If no catchall found, find export default and add before it
    const exportDefaultIndex = updatedContent.lastIndexOf("export default");
    if (exportDefaultIndex !== -1) {
      updatedContent =
        updatedContent.slice(0, exportDefaultIndex) +
        routesToAdd +
        "\n" +
        updatedContent.slice(exportDefaultIndex);
    } else {
      // If no export default, add at the end
      updatedContent += routesToAdd;
    }
  }

  await fs.writeFile(routesPath, updatedContent);
  spinner.succeed("Added routes to index.ts");
}

async function addFeedUserShardFunctions(
  name: string,
  userShardPath: string,
  spinner: any
) {
  spinner.start("Adding UserShard functions...");

  const capitalizedName = toPascalCase(name);
  const camelName = toCamelCase(name);

  if (!(await fs.pathExists(userShardPath))) {
    spinner.warn(
      `UserShard file not found at ${userShardPath}, skipping UserShard generation`
    );
    return;
  }

  const userShardContent = await fs.readFile(userShardPath, "utf8");

  // Add type imports if not present
  let updatedContent = userShardContent;

  // Add imports from request-response-schemas
  if (!updatedContent.includes(`Load${capitalizedName}Response`)) {
    // Find the import block for request-response-schemas and add our types
    const importMatch = updatedContent.match(
      /import (?:type )?{([^}]+)} from ["']@shared\/types\/request-response-schemas["'];/
    );
    if (importMatch) {
      const existingImports = importMatch[1].trim();
      // Parse existing imports to avoid duplicates
      const existingImportsList = existingImports.split(',').map(i => i.trim());
      const importsToAdd = [`Load${capitalizedName}Response`, `Save${capitalizedName}Response`];

      // Only add ErrorResponse if not already present
      if (!existingImportsList.includes('ErrorResponse')) {
        importsToAdd.unshift('ErrorResponse');
      }

      // Filter out any that already exist
      const newImportsList = importsToAdd.filter(imp => !existingImportsList.includes(imp));

      if (newImportsList.length > 0) {
        const cleanedImports = existingImports.replace(/,\s*$/, "");
        const newImports = `${cleanedImports}, ${newImportsList.join(', ')}`;
        updatedContent = updatedContent.replace(
          importMatch[0],
          `import { ${newImports} } from "@shared/types/request-response-schemas";`
        );
      }
    } else {
      // Add new import if none exists
      const firstImportIndex = updatedContent.indexOf("import");
      if (firstImportIndex !== -1) {
        const importToAdd = `import { ErrorResponse, Load${capitalizedName}Response, Save${capitalizedName}Response } from "@shared/types/request-response-schemas";\n`;
        updatedContent =
          updatedContent.slice(0, firstImportIndex) +
          importToAdd +
          updatedContent.slice(firstImportIndex);
      }
    }
  }

  // Add imports from events file
  if (!updatedContent.includes(`${capitalizedName}Event`)) {
    const eventsImportRegex = new RegExp(
      `import (?:type )?{([^}]+)} from ["']@shared\\/types\\/${camelName}Events["'];`
    );
    const eventsImportMatch = updatedContent.match(eventsImportRegex);
    if (eventsImportMatch) {
      const existingImports = eventsImportMatch[1].trim();
      const cleanedImports = existingImports.replace(/,\s*$/, "");
      const newImports = `${cleanedImports}, ${capitalizedName}Event, ${capitalizedName}Change, ${capitalizedName}EventResult, handle${capitalizedName}Change`;
      updatedContent = updatedContent.replace(
        eventsImportMatch[0],
        `import { ${newImports} } from "@shared/types/${camelName}Events";`
      );
    } else {
      // Add new import after the request-response-schemas import
      const schemasImportIndex = updatedContent.indexOf("@shared/types/request-response-schemas");
      if (schemasImportIndex !== -1) {
        const lineEndIndex = updatedContent.indexOf("\n", schemasImportIndex);
        const importToAdd = `\nimport { ${capitalizedName}Event, ${capitalizedName}Change, ${capitalizedName}EventResult, handle${capitalizedName}Change } from "@shared/types/${camelName}Events";`;
        updatedContent =
          updatedContent.slice(0, lineEndIndex) +
          importToAdd +
          updatedContent.slice(lineEndIndex);
      }
    }
  }

  // Add the load and save functions before the closing brace of the class
  const functionsToAdd = `
  async load${capitalizedName}(
    userId: string,
    continuationToken?: string
  ): Promise<Load${capitalizedName}Response | ErrorResponse> {
    try {
      // TODO: Implement your feed algorithm here
      return {
        feedData: [],
        continuationToken: undefined,
      };
    } catch (error) {
      console.error("Error loading ${name}:", error);
      return {
        error: "Failed to load ${name}",
        success: false,
        statusCode: 500,
      };
    }
  }

  async save${capitalizedName}(
    userId: string,
    events: ${capitalizedName}Event[]
  ): Promise<Save${capitalizedName}Response | ErrorResponse> {
    try {
      const results: ${capitalizedName}EventResult[] = [];
      let processedCount = 0;

      for (const event of events) {
        try {
          // Server adds persistence metadata
          const change: ${capitalizedName}Change = {
            ...event,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            description: \`\${event.type} event\`,
          };

          const result = await handle${capitalizedName}Change(
            this.env.DB,
            this.shardDb,
            change
          );

          if (result.success && result.result) {
            results.push(result.result);
            processedCount++;
          }
        } catch (error) {
          console.error("Error processing feed event:", error, event);
        }
      }

      return {
        success: true,
        processedCount,
        totalChanges: events.length,
        results,
      } as Save${capitalizedName}Response;
    } catch (error) {
      console.error("Error saving feed:", error);
      return {
        error: "Failed to save feed changes",
        success: false,
        statusCode: 500,
      };
    }
  }
`;

  // Find the last method in the class and add our functions before the closing brace
  const lastBraceIndex = updatedContent.lastIndexOf("}");
  if (lastBraceIndex !== -1) {
    updatedContent =
      updatedContent.slice(0, lastBraceIndex) +
      functionsToAdd +
      "\n" +
      updatedContent.slice(lastBraceIndex);
  }

  await fs.writeFile(userShardPath, updatedContent);
  spinner.succeed("Added UserShard functions");
}

async function createFeedEventsFile(name: string, spinner: any) {
  spinner.start("Creating events file...");

  const capitalizedName = toPascalCase(name);
  const camelName = toCamelCase(name);
  const snakeName = toScreamingSnakeCase(name);

  const eventsContent = `import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type * as userShardSchema from "~/db/userShard.schema";
import type * as schema from "~/db/schema";

// ===== EVENT TYPES (what client sends) =====
export type Sample${capitalizedName}Event = {
  type: "SAMPLE_${snakeName}_EVENT";
  sampleData: string;
  previousValue?: string;
  newValue: string;
};

export type ${capitalizedName}Event = Sample${capitalizedName}Event;

// ===== RESPONSE TYPES (what server returns after processing) =====
export type Sample${capitalizedName}EventResult = Sample${capitalizedName}Event; // No extra server fields for this example

export type ${capitalizedName}EventResult = Sample${capitalizedName}EventResult;

// ===== TYPE MAPPING =====
export type ${capitalizedName}EventMap = {
  "SAMPLE_${snakeName}_EVENT": {
    event: Sample${capitalizedName}Event;
    result: Sample${capitalizedName}EventResult;
  };
};

export type ${capitalizedName}EventType = keyof ${capitalizedName}EventMap;

export type ResultForEvent<T extends ${capitalizedName}Event> =
  ${capitalizedName}EventMap[T["type"]]["result"];

/**
 * Persistence metadata added by the server
 */
export interface PersistenceMetadata {
  id: string;
  timestamp: number;
  description: string;
}

/**
 * Change type for server-side persistence
 * Includes all event data plus persistence metadata
 */
export type ${capitalizedName}Change = ${capitalizedName}Event & PersistenceMetadata;

/**
 * Types for change handlers
 */
export type ${capitalizedName}ChangeType = ${capitalizedName}Change["type"];

export type ${capitalizedName}ChangeHandler<T extends ${capitalizedName}Event> = (
  db: D1Database,
  userShardDb: DrizzleSqliteDODatabase<typeof userShardSchema>,
  change: T & PersistenceMetadata
) => Promise<{ success: boolean; result?: ResultForEvent<T> }>;

export type AssertNever = (x: never) => never;

// ===== HANDLER IMPLEMENTATION =====
export async function handle${capitalizedName}Change(
  db: D1Database,
  userShardDb: DrizzleSqliteDODatabase<typeof userShardSchema>,
  change: ${capitalizedName}Change
): Promise<{ success: boolean; result?: ${capitalizedName}EventResult }> {
  switch (change.type) {
    case "SAMPLE_${snakeName}_EVENT": {
      // TODO: Implement handler logic
      // Example: await userShardDb.insert(someTable).values({ ... });

      return {
        success: true,
        result: {
          type: "SAMPLE_${snakeName}_EVENT",
          sampleData: change.sampleData,
          previousValue: change.previousValue,
          newValue: change.newValue,
          // Add any server-generated fields here
        }
      };
    }
    default:
      throw new Error(\`Unknown ${camelName} change type: \${(change as ${capitalizedName}Change).type}\`);
  }
}
`;

  await fs.outputFile(`shared/types/${camelName}Events.ts`, eventsContent);
  spinner.succeed("Created events file");
}
