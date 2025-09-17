import fs from 'fs-extra';
import path from 'path';

export async function addToSchema(type: 'main' | 'sharded', content: string) {
  const schemaFile = type === 'main' 
    ? 'src/server/db/schema.ts'
    : 'src/server/db/sharded-schema.ts';
    
  const fullPath = path.join(process.cwd(), schemaFile);
  
  // Read existing schema
  let existingContent = '';
  if (await fs.pathExists(fullPath)) {
    existingContent = await fs.readFile(fullPath, 'utf-8');
  } else {
    // Create base schema if it doesn't exist
    existingContent = `import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

`;
  }
  
  // Add new content
  const updatedContent = existingContent + '\n' + content;
  
  // Write back
  await fs.outputFile(fullPath, updatedContent);
}