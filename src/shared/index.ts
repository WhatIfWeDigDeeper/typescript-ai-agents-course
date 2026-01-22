/**
 * Shared module exports.
 *
 * This barrel file re-exports all shared types and classes for convenient importing.
 *
 * @example
 * ```typescript
 * import { Message, LLM, Action, Tool } from './shared';
 * ```
 */

// Core types
export { Message, Role } from './Message';
export { Action, ToolArgs } from './Action';
export { ActionResult } from './ActionResult';
export { Tool, ToolParameters } from './Tool';
export { Prompt, PromptMetadata } from './Prompt';
export { Memory } from './Memory';
export { Goal } from './Goal';
export { LLM, LLMConfig, ToolCallResponse } from './LLM';
export { FileTools } from './FileTools';

// New GAME framework components
export { ConversationMemory, MemoryItem, MemoryItemType } from './ConversationMemory';
export { Environment, ActionResultEnvelope, EnvironmentConfig } from './Environment';
export {
  AgentLanguage,
  NaturalLanguage,
  JsonActionLanguage,
  FunctionCallingLanguage,
  Goal as AgentGoal,
  ParsedAction,
  PromptContext,
  ErrorContext,
  createGoal,
  extractCodeBlock,
} from './AgentLanguage';
export {
  Agent,
  AgentBuilder,
  AgentConfig,
  AgentStepResult,
  AgentCallbacks,
  GenerateResponseFn,
  createSimpleAgent,
} from './Agent';

// Zod-based tool definition
export {
  defineTool,
  ToolDefinition,
  RegisteredTool,
  getGlobalTool,
  getAllGlobalTools,
  getToolNamesByTag,
  clearGlobalRegistry,
  listFilesDefinition,
  readFileDefinition,
  terminateDefinition,
} from './defineTool';
export {
  ToolRegistry,
  ToolRegistryOptions,
  createFileOperationsRegistry,
  createFullRegistry,
} from './ToolRegistry';
