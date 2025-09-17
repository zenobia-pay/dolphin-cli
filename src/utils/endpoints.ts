import fs from 'fs-extra';
import path from 'path';

export async function addApiEndpoint(name: string, content: string) {
  const endpointFile = `src/server/api/${name}.ts`;
  const fullPath = path.join(process.cwd(), endpointFile);
  
  // Write the endpoint file
  await fs.outputFile(fullPath, content);
  
  // Update main server file to include the router
  await updateMainServer(name);
}

export async function addWebhookEndpoint(provider: string, content: string) {
  const webhookFile = `src/server/webhooks/${provider}.ts`;
  const fullPath = path.join(process.cwd(), webhookFile);
  
  // Write the webhook file
  await fs.outputFile(fullPath, content);
  
  // Update main server file to include the webhook router
  await updateMainServer(`webhooks/${provider}`);
}

async function updateMainServer(routeName: string) {
  const serverFile = 'src/server/index.ts';
  const fullPath = path.join(process.cwd(), serverFile);
  
  if (!await fs.pathExists(fullPath)) {
    console.warn(`Warning: ${serverFile} not found. Please manually import and mount the router.`);
    return;
  }
  
  let content = await fs.readFile(fullPath, 'utf-8');
  
  // Add import
  const importStatement = `import { ${routeName.includes('webhook') ? 'webhookRouter' : routeName + 'Router'} } from './${routeName.includes('webhook') ? routeName : `api/${routeName}`}';`;
  
  if (!content.includes(importStatement)) {
    // Find last import and add after it
    const lastImportIndex = content.lastIndexOf('import ');
    const nextLineIndex = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, nextLineIndex + 1) + importStatement + '\n' + content.slice(nextLineIndex + 1);
  }
  
  // Add router mount
  const mountStatement = `app.route('/', ${routeName.includes('webhook') ? 'webhookRouter' : routeName + 'Router'});`;
  
  if (!content.includes(mountStatement)) {
    // Find where routers are mounted (usually before app.listen)
    const listenIndex = content.indexOf('app.listen');
    if (listenIndex !== -1) {
      content = content.slice(0, listenIndex) + mountStatement + '\n\n' + content.slice(listenIndex);
    }
  }
  
  await fs.writeFile(fullPath, content);
}