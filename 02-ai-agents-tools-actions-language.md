# AI Agents, Tools, Actions, and language

## GAIL - Goals, Actions, Information, Language

![structured prompt](imgs/02-structured-prompt.png)

![GAIL](imgs/02-GAIL.png)



1. Goals / instructions
   1. persona
   2. rules - bounded set of constraints
   3. process
2. Actions
   1. what agent can do, interact with env.
3. Information - feedback from action tasks, Input at beginning and output at ends. Decide what next action to take.
   1. task
   2. history
   3. inputs
   4. Environment state / session state
4. Language
   1. output we want

![the agent Prompt](imgs/02-agent-prompt.png)

## Giving agents tools

Interact with the world to accomplish the task

constraints on what tools it can use.

these are the actions you can take. Computer system interface as series of actions.

## Tool/Action Descriptions

naming and description of new tools critical for LLM for what it can use it for. (common tools are discoverable using man)


preset the tools, ordering, language (optional use all of them?)

name and description of tool can make or break these systems, contextual information about when to use.

## Tool Results and Agent Feedback

Tool Use Outcome

result of actions from tools (like ls and cat)

complete one step at a time and wait for the result

giving more information from results so it can adapt and update

**error messages are critically important** - so be really clear what is going on and why

feedback is critically important so it can update the state of the world around it.

## Agent Tools

Using JSON Schema is natural for APIs and Agents

Read file

```json
{
  "toolName": "readFile",
  "description": "Reads the content of a specified file.",
  "parameters": {
    "type": "object",
    "properties": {
      "filePath": { "type": "string" }
    },
    "required": ["filePath"]
  }
}
```

Write file

```json
{
  "toolName": "writeDocFile",
  "description": "Writes a documentation file to the docs/ directory.",
  "parameters": {
    "type": "object",
    "properties": {
      "fileName": { "type": "string" },
      "content": { "type": "string" }
    },
    "required": ["fileName", "content"]
  }
}
```

Response

```json
{
  "toolName": "readFile",
  "args": {
    "filePath": "src/file.ts"
  }
}
```

## Using LLM Function Calling for AI-Agent Interaction

Ensure structured and predictable responses by Function calling.

> most LLMs offer function calling APIs that guarantee structured execution. Instead of treating function execution as a free-form text generation task, function calling APIs allow us to explicitly define the tools available to the model using JSON Schema

### Key Benefits



1. Eliminates prompt engineering for structured responses – No need to force the model to output JSON **manually**.
2. Uses standardized JSON Schema – The same format used in API documentation applies seamlessly to AI interactions.
3. Allows mixed text and tool execution – The model can decide whether a tool is necessary or provide a natural response.
4. Simplifies parsing logic – Instead of handling inconsistent outputs, developers only check for tool calls in the response. We don’t need to parse or extract from unstructured text
5. Guarantees syntactically correct arguments – The model automatically ensures arguments match the expected parameter format.


## Try Out LLM Function Calling


## An Agent Loop with function calling

1. No More Custom Parsing Logic
2. Dynamic Execution
3. Unified Text & Action Handling - If no function call is needed, the model responds with a message, allowing mixed conversational and action-driven workflows.
4. Automated Function Execution - The agent dynamically maps the tool name from the model to its corresponding TypeScript function and executes it with the provided arguments.

> By leveraging function calling, we remove unnecessary complexity from the agent loop, allowing the AI to interact with its environment more reliably. This simplification makes AI agents more robust, scalable, and easier to integrate into real-world applications.

## How the function calling agent works


