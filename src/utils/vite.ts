import fs from 'fs-extra';
import path from 'path';

export async function updateViteConfig(pageName: string) {
  const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
  
  if (!await fs.pathExists(viteConfigPath)) {
    console.warn('vite.config.ts not found. Please manually add the page to your Vite configuration.');
    return;
  }
  
  let content = await fs.readFile(viteConfigPath, 'utf-8');
  
  // Find the input section in rollupOptions
  const inputMatch = content.match(/input:\s*{([^}]*)}/s);
  
  if (inputMatch) {
    const inputContent = inputMatch[1];
    const newEntry = `        ${pageName}: resolve(__dirname, "src/client/${pageName}/index.html"),`;
    
    // Check if entry already exists
    if (!inputContent.includes(`${pageName}:`)) {
      // Add the new entry
      const updatedInput = inputContent.trimEnd() + '\n' + newEntry;
      content = content.replace(
        /input:\s*{[^}]*}/s,
        `input: {${updatedInput}\n      }`
      );
      
      await fs.writeFile(viteConfigPath, content);
    }
  } else {
    console.warn('Could not find rollupOptions.input in vite.config.ts. Please manually add the page.');
  }
}