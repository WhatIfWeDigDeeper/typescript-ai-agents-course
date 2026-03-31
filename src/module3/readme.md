# GAME Framework - TypeScript Example

Comprehensive, modular example showing how to design AI agents using the GAME framework (Goals, Actions, Memory, Environment) and multiple language interfaces for agent communication. The repository includes a small set of TypeScript sources that demonstrate how to compose an agent, how to expose tools to the agent, and how to automatically generate a README from source files using the same framework.

## What is GAME?

GAME is a lightweight architectural pattern for AI agents where:
- G - Goals: What the agent is trying to achieve
- A - Actions: Tools and operations the agent can perform
- M - Memory: Context and state storage
- E - Environment: The world the agent interacts with

Different "languages" define how the agent communicates with the LLM (prompts and response parsing). Languages shown in this repo include:
- NaturalLanguage: Pure chat-like interaction (no tooling required)
- JsonActionLanguage: Parses action blocks from text
- FunctionCallingLanguage: OpenAI-style function-calling integration with structured tool calls

The same GAME components work with any language, emphasizing the separation of what to do from how to talk about it.

## Project Files

- GAMEAgent.ts
  - A complete example of the GAME framework in action. It:
    - Defines the core GAME concepts (Goals, Actions via ToolRegistry, Memory, Environment)
    - Shows three demonstration modes: FunctionCallingLanguage, JsonActionLanguage, and NaturalLanguage
    - Includes a simple GAMEAgent class and a lightweight demo harness that runs the agent against a sample prompt
    - Provides guidance comments such as how to run: npm run module3:game

- ReadmeCreatorAgent.ts
  - A practical CLI tool that uses the GAME framework to analyze source files in a directory and generate a README.md.
  - It exposes a command-line interface to configure the target directory, file extension, and output path, then uses the writeReadme mechanism to save the README.
  - Includes options such as --ext, --dir, --output, --stdout, and --verbose, with sensible defaults.
  - Demonstrates how the same agent and tool primitives can be used for non-LLM tasks like code documentation generation.

- readmeTools.ts
  - Tooling utilities that help the agent discover and read project files, register tools, and output results (e.g., list files, read files, and terminate).
  - These expose a consistent interface for the agent to request file-system operations as tools within a controlled registry.

- Other referenced modules (shared/*)
  - shared/env, shared/Agent, shared/AgentLanguage, shared/ConversationMemory, shared/Environment, shared/ToolRegistry, and defineTool provide the core framework primitives:
    - Environment models the runtime context (working directory, etc.)
    - LLM abstraction (for an OpenAI-like interface) and AgentBuilder to compose an agent
    - AgentLanguage hierarchy for different communication strategies
    - Tool registry and tool definitions for safe, pluggable actions

## How to Run

Prerequisites:
- Node.js (the project uses TypeScript and common CLI patterns). Ensure npm/yarn is installed.

1) Install dependencies
   - npm install

2) Run the GAME module demo (language-agnostic demonstration in GAMEAgent.ts)
   - npm run module3:game

3) Generate a README.md from source files (via ReadmeCreatorAgent)
   - npm run module3:readme -- --ext ts --dir .
   - Optional flags:
     - --ext, -e: File extension to analyze (default: ts)
     - --dir, -d: Target directory (default: current working directory)
     - --output, -o: Output file path (default: <dir>/README.md)
     - --stdout: Print README to stdout instead of writing a file
     - --verbose, -v: Enable verbose logging

Notes:
- The README generator uses the same tool/registry pattern demonstrated in the GAME framework to perform filesystem queries and then generate documentation via a writeReadme-like facility.
- The code intentionally demonstrates how to adapt the GAME core to non-LLM tasks (e.g., documentation generation) by using the tool-system and language-agnostic franchises.

## Architecture and Extensibility

- Core components: Goals (G), Actions (A), Memory (M), Environment (E)
- Languages: NaturalLanguage, JsonActionLanguage, FunctionCallingLanguage
- Tools: Defined and registered via the ToolRegistry using defineTool; can be extended with new tools, while keeping agent logic unchanged.
- Extending a language: Implement a new AgentLanguage and plug it into the AgentBuilder or GAMEAgent to see how behavior changes while keeping the same goals and tools.
- Extending tools: Add new operations by registering tools with a name and a schema (using zod) and wiring them into the registry.

## Implementation Details (High Level)

- The agent orchestrates goals, language, tools, memory, and environment through a builder pattern. This enables swapping language implementations without changing the core agent logic.
- Tools can be invoked by the agent to perform file operations or other domain actions. Tool responses become part of the memory and can influence subsequent reasoning steps.
- The README generator demonstrates how the same tool-oriented approach can automate code/documentation tasks, making it a practical example of the framework's flexibility.

## Contributing

Contributions are welcome. If you add new languages or tools, consider:
- Keeping a stable ToolRegistry interface
- Documenting any new language behavior and the expected prompt structure
- Providing tests or minimal examples to illustrate usage

## License

This project is provided for demonstration purposes. Include your preferred license here.

## Acknowledgments

This repository showcases a compact, educational use of the GAME pattern for AI agents and tool-driven automation in TypeScript.
