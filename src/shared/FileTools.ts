/**
 * Shared file operations for agent tools.
 *
 * This module provides common file system operations that agents can use.
 * Centralizing these prevents code duplication across modules.
 *
 * @example
 * ```typescript
 * // List files in current directory
 * const files = FileTools.listFiles();
 *
 * // Read a file
 * const content = FileTools.readFile("package.json");
 *
 * // Check if file exists
 * if (FileTools.exists("readme.md")) { ... }
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { ActionResult } from './ActionResult';

export const FileTools = {
  /**
   * Lists all files in a directory.
   * @param directory - Directory to list (defaults to cwd)
   * @returns Array of filenames (not full paths)
   */
  listFiles(directory: string = process.cwd()): string[] {
    try {
      const entries = fs.readdirSync(directory);
      return entries.filter(entry => {
        const fullPath = path.join(directory, entry);
        try {
          return fs.statSync(fullPath).isFile();
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error(`Error listing files in ${directory}:`, error);
      return [];
    }
  },

  /**
   * Lists all directories in a directory.
   * @param directory - Directory to list (defaults to cwd)
   * @returns Array of directory names
   */
  listDirectories(directory: string = process.cwd()): string[] {
    try {
      const entries = fs.readdirSync(directory);
      return entries.filter(entry => {
        const fullPath = path.join(directory, entry);
        try {
          return fs.statSync(fullPath).isDirectory();
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error(`Error listing directories in ${directory}:`, error);
      return [];
    }
  },

  /**
   * Reads the contents of a file.
   * @param filePath - Path to the file (relative or absolute)
   * @returns File contents as string
   * @throws Error if file cannot be read
   */
  readFile(filePath: string): string {
    const resolvedPath = path.resolve(filePath);
    return fs.readFileSync(resolvedPath, 'utf-8');
  },

  /**
   * Reads a file and returns an ActionResult (safe version).
   * @param filePath - Path to the file
   * @returns ActionResult with contents or error
   */
  readFileSafe(filePath: string): ActionResult<string> {
    return ActionResult.fromTry(() => FileTools.readFile(filePath));
  },

  /**
   * Checks if a file or directory exists.
   * @param filePath - Path to check
   */
  exists(filePath: string): boolean {
    try {
      fs.accessSync(path.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Checks if a path is a file.
   * @param filePath - Path to check
   */
  isFile(filePath: string): boolean {
    try {
      return fs.statSync(path.resolve(filePath)).isFile();
    } catch {
      return false;
    }
  },

  /**
   * Checks if a path is a directory.
   * @param dirPath - Path to check
   */
  isDirectory(dirPath: string): boolean {
    try {
      return fs.statSync(path.resolve(dirPath)).isDirectory();
    } catch {
      return false;
    }
  },

  /**
   * Writes content to a file.
   * @param filePath - Path to write to
   * @param content - Content to write
   */
  writeFile(filePath: string, content: string): void {
    const resolvedPath = path.resolve(filePath);
    const dir = path.dirname(resolvedPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, content, 'utf-8');
  },

  /**
   * Writes to a file and returns an ActionResult (safe version).
   * @param filePath - Path to write to
   * @param content - Content to write
   */
  writeFileSafe(filePath: string, content: string): ActionResult<void> {
    return ActionResult.fromTry(() => FileTools.writeFile(filePath, content));
  },

  /**
   * Gets file stats (size, modified date, etc).
   * @param filePath - Path to the file
   */
  getStats(filePath: string): fs.Stats | null {
    try {
      return fs.statSync(path.resolve(filePath));
    } catch {
      return null;
    }
  },
};
