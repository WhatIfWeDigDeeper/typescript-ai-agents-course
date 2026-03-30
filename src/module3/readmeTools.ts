/**
 * Tool definitions for the README creator agent.
 *
 * Registers four tools into the global registry:
 *   - listFiles   — lists source files matching the configured extension
 *   - readFile    — reads a file relative to the target directory
 *   - writeReadme — writes the README draft to disk (non-terminal, allows iteration)
 *   - terminate   — ends the agent loop with a final summary message
 */

import * as path from 'path';
import { FileTools } from '../shared/FileTools';
import { defineTool, clearGlobalRegistry } from '../shared/defineTool';
import { z } from 'zod';

export interface ReadmeToolsConfig {
  targetDir: string;
  fileExtension: string;
  outputPath: string;
  writeToStdout: boolean;
}

export function registerReadmeTools(config: ReadmeToolsConfig): void {
  const { targetDir, fileExtension, outputPath, writeToStdout } = config;

  clearGlobalRegistry();

  defineTool({
    name: 'listFiles',
    description: `Lists all .${fileExtension} source files in the target directory`,
    schema: z.object({}),
    tags: ['readme_tools'],
    execute: () => {
      const files = FileTools.listFiles(targetDir).filter(f =>
        f.endsWith(`.${fileExtension}`)
      );
      console.log(`📁 Found ${files.length} .${fileExtension} files`);
      return files;
    },
  });

  defineTool({
    name: 'readFile',
    description: 'Reads the contents of a file in the target directory',
    schema: z.object({
      fileName: z.string().describe('Name or relative path of the file to read'),
    }),
    tags: ['readme_tools'],
    execute: ({ fileName }) => {
      const filePath = path.resolve(targetDir, fileName);
      const content = FileTools.readFile(filePath);
      console.log(`📄 Read ${content.length} characters from ${fileName}`);
      return content;
    },
  });

  defineTool({
    name: 'writeReadme',
    description: 'Writes the README content to disk. Use this to save a draft or the final version.',
    schema: z.object({
      content: z.string().describe('Full Markdown content for the README'),
    }),
    tags: ['readme_tools'],
    execute: ({ content }) => {
      if (writeToStdout) {
        process.stdout.write(content + '\n');
      } else {
        FileTools.writeFile(outputPath, content);
        console.log(`✍️  Wrote README to ${outputPath}`);
      }
      return `README written (${content.length} characters)`;
    },
  });

  defineTool({
    name: 'terminate',
    description: 'Ends the session once the README has been written. Call this after writeReadme.',
    schema: z.object({
      message: z.string().describe('Short summary of what was documented'),
    }),
    tags: ['system'],
    terminal: true,
    execute: ({ message }) => {
      console.log(`✅ Done: ${message}`);
      return message;
    },
  });
}
