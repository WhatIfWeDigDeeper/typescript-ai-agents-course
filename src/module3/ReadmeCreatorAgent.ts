/**
 * Module 3: README Creator Agent
 *
 * A practical CLI tool that uses the GAME framework to analyze source files
 * in a directory and generate a README.md.
 *
 * Usage:
 *   npm run module3:readme -- [options]
 *
 * Options:
 *   --ext,     -e  File extension to analyze (default: "ts")
 *   --dir,     -d  Target directory          (default: current working dir)
 *   --output,  -o  Output file path          (default: "<dir>/README.md")
 *   --stdout       Print README to stdout instead of writing a file
 *   --verbose, -v  Enable verbose agent logging
 *
 * Examples:
 *   npm run module3:readme -- --ext ts --dir src/shared
 *   npm run module3:readme -- --ext py --dir /path/to/project --stdout
 */

import * as path from 'path';
import { parseArgs } from 'node:util';
import { loadEnv } from '../shared/env';
import { LLM } from '../shared';
import { AgentBuilder } from '../shared/Agent';
import { FunctionCallingLanguage, createGoal } from '../shared/AgentLanguage';
import { ToolRegistry } from '../shared/ToolRegistry';
import { Environment } from '../shared/Environment';
import { registerReadmeTools } from './readmeTools';

// ─────────────────────────────────────────────────────────────────────────────
// Language name lookup
// ─────────────────────────────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  ts: 'TypeScript',
  js: 'JavaScript',
  py: 'Python',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  rb: 'Ruby',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
};

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadmeCreatorConfig {
  targetDir: string;
  fileExtension: string;
  outputPath: string;
  writeToStdout: boolean;
  verbose: boolean;
}

export function createReadmeCreatorAgent(config: ReadmeCreatorConfig) {
  registerReadmeTools(config);

  const langName = LANGUAGE_NAMES[config.fileExtension] ?? config.fileExtension.toUpperCase();

  const goals = [
    createGoal('discover', 'Find all source files with the configured extension', 10),
    createGoal('analyze', 'Read and understand the purpose of each ' + langName + ' file', 8),
    createGoal('generate', 'Write a comprehensive README.md using writeReadme, then call terminate', 5),
  ];

  const registry = new ToolRegistry({ tags: ['readme_tools', 'system'] });

  const builder = new AgentBuilder()
    .withGoals(goals)
    .withLanguage(new FunctionCallingLanguage())
    .withRegistry(registry)
    .withLLM(new LLM())
    .withEnvironment(new Environment({ workingDirectory: config.targetDir }));

  if (config.verbose) {
    builder.verbose();
  }

  return builder.build();
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  const { values } = parseArgs({
    options: {
      ext:     { type: 'string',  short: 'e', default: 'ts' },
      dir:     { type: 'string',  short: 'd', default: process.cwd() },
      output:  { type: 'string',  short: 'o' },
      stdout:  { type: 'boolean',             default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
    },
  });

  const targetDir = path.resolve(values.dir as string);
  const fileExtension = values.ext as string;
  const writeToStdout = values.stdout as boolean;
  const outputPath = values.output
    ? path.resolve(values.output as string)
    : path.join(targetDir, 'README.md');

  const config: ReadmeCreatorConfig = {
    targetDir,
    fileExtension,
    outputPath,
    writeToStdout,
    verbose: values.verbose as boolean,
  };

  console.log('\n' + '='.repeat(60));
  console.log('README Creator Agent');
  console.log('='.repeat(60));
  console.log('  Extension : .' + fileExtension);
  console.log('  Directory : ' + targetDir);
  console.log('  Output    : ' + (writeToStdout ? 'stdout' : outputPath));
  console.log('='.repeat(60) + '\n');

  const agent = createReadmeCreatorAgent(config);

  const prompt =
    'Analyze all .' + fileExtension + ' files in the directory and generate a README.md ' +
    'that documents the project. Use writeReadme to save it, then call terminate.';

  await agent.run(prompt);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
