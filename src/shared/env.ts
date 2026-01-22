/**
 * Environment configuration loader.
 *
 * This module handles loading environment variables from .env files.
 * Call loadEnv() at the start of any executable script.
 *
 * @example
 * ```typescript
 * import { loadEnv } from '../shared/env';
 *
 * async function main() {
 *   loadEnv();  // Load .env file
 *   // Now process.env.OPENAI_API_KEY is available
 * }
 * ```
 */

import * as path from 'path';

/**
 * Loads environment variables from .env file.
 *
 * Searches for .env file in:
 * 1. Current working directory
 * 2. Project root (based on this file's location)
 *
 * Does not throw if file is missing - just logs a warning.
 */
export function loadEnv(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv');

  // Try current working directory first
  let result = dotenv.config();

  if (result.error) {
    // Try project root (two directories up from shared/)
    const projectRoot = path.resolve(__dirname, '..', '..');
    result = dotenv.config({ path: path.join(projectRoot, '.env') });
  }

  // Check if we have the required API key
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      '\n⚠️  Warning: OPENAI_API_KEY not found in environment.\n' +
      '   Copy .env.example to .env and add your API key:\n' +
      '   cp .env.example .env\n'
    );
  }
}

/**
 * Gets an environment variable, throwing if not found.
 * @param name - The environment variable name
 * @returns The value
 * @throws Error if the variable is not set
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Gets an environment variable with a default value.
 * @param name - The environment variable name
 * @param defaultValue - Default value if not set
 */
export function getEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}
