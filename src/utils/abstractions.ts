import fs from 'fs-extra';
import path from 'path';

export async function createPricingAbstractions(content: string) {
  const abstractionsFile = 'src/server/pricing/index.ts';
  const fullPath = path.join(process.cwd(), abstractionsFile);
  
  // Write the abstractions file
  await fs.outputFile(fullPath, content);
  
  // Create index export
  const indexContent = `export { check, track, changeSubscription, tiers } from './index';`;
  await fs.outputFile('src/server/pricing/index.ts', indexContent);
}