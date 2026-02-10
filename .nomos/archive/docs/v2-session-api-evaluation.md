# V2 Session API Evaluation

**Date:** 2026-02-09
**SDK Version:** @anthropic-ai/claude-agent-sdk v0.2.37 (claudeCodeVersion: 2.1.37)
**Status:** Available but unstable (@alpha)

## Summary

The V2 Session API is **available and functional** in the installed SDK. It provides multi-turn conversation support with session persistence, resumption, and graceful lifecycle management. However, it carries an `unstable_` prefix and `@alpha` annotation, meaning the API surface may change without notice.

**Recommendation: Adopt for D5 refactor** with an abstraction layer to insulate against API changes.

---

## API Surface

### Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `unstable_v2_createSession` | `(options: SDKSessionOptions) => SDKSession` | Create a new persistent session |
| `unstable_v2_resumeSession` | `(sessionId: string, options: SDKSessionOptions) => SDKSession` | Resume existing session by ID |
| `unstable_v2_prompt` | `(message: string, options: SDKSessionOptions) => Promise<SDKResultMessage>` | One-shot convenience (no session reuse) |

### SDKSession Interface

```typescript
interface SDKSession {
  readonly sessionId: string;    // Available after first message
  send(message: string | SDKUserMessage): Promise<void>;
  stream(): AsyncGenerator<SDKMessage, void>;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;  // Async disposal support
}
```

### SDKSessionOptions

```typescript
type SDKSessionOptions = {
  model: string;                          // Required
  pathToClaudeCodeExecutable?: string;
  executable?: 'node' | 'bun';
  executableArgs?: string[];
  env?: Record<string, string | undefined>;
  allowedTools?: string[];
  disallowedTools?: string[];
  canUseTool?: CanUseTool;
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  permissionMode?: PermissionMode;
};
```

---

## Capability Assessment

### 1. Session Resume After Crash

**Available: Yes** via `unstable_v2_resumeSession(sessionId, options)`

- Resumes by session ID, which means we need to persist the session ID in our database
- Session ID is available on `SDKSession.sessionId` after the first message
- On crash recovery, we can call `resumeSession` with the stored ID
- The V1 `query()` API also supports `resume` and `sessionId` options, so this capability exists in both APIs

**Integration plan:**
- Store `sdkSessionId` in the sessions table (column already exists)
- On startup, query for `in_progress` sessions and attempt resume
- Use `resumeSessionAt` (V1) or sequential `send()` (V2) to resume from a specific point

### 2. Multi-Turn Conversations

**Available: Yes** — this is the primary advantage of V2

- V1 `query()` is one-shot: single prompt in, stream messages out
- V2 `SDKSession.send()` allows sequential messages within one session
- Useful for: interactive agent sessions, follow-up questions, iterative refinement
- The `stream()` method returns an `AsyncGenerator<SDKMessage>` covering all message types

### 3. Graceful Cancellation

**V2:** `SDKSession.close()` — terminates the session
**V1:** `query().interrupt()` — interrupts current execution, `query().close()` — kills process

Both APIs support cancellation. V1's `interrupt()` is actually more granular (stops current turn without killing the session).

### 4. Dynamic Permission Changes

**V1 only:** `query().setPermissionMode(mode)`, `query().setModel(model)`, `query().setMaxThinkingTokens(n)`

V2 `SDKSessionOptions` sets permissions at creation time. V1's `Query` interface has runtime control methods that V2 lacks.

### 5. Cost Tracking

Both APIs emit `SDKResultMessage` which contains `total_cost_usd`, `usage`, and `modelUsage`. No difference in cost data availability.

### 6. Structured Output

Both APIs support `SDKMessage` streaming with the same message types:
- `SDKAssistantMessage` — model responses
- `SDKResultMessage` (success/error) — final result with cost data
- `SDKSystemMessage` — init info
- `SDKToolProgressMessage` — tool execution progress
- `SDKStatusMessage` — compacting status
- And more (see `SDKMessage` union type)

---

## V1 vs V2 Comparison

| Feature | V1 (`query()`) | V2 (`createSession()`) |
|---------|---------------|----------------------|
| Multi-turn | No (single prompt) | Yes (`send()` + `stream()`) |
| Session resume | Yes (`resume` option) | Yes (`resumeSession()`) |
| Interrupt | Yes (`interrupt()`) | No (only `close()`) |
| Dynamic permissions | Yes (`setPermissionMode()`) | No |
| Dynamic model | Yes (`setModel()`) | No |
| MCP server control | Yes (`setMcpServers()`) | No |
| Structured output | Yes (`outputFormat`) | Not in options |
| File checkpointing | Yes (`enableFileCheckpointing`) | Not in options |
| Cost data | Yes | Yes |
| Session persistence | Yes (`persistSession`) | Implicit |
| Stability | Stable | `@alpha` / `unstable_` |
| Process control | `spawnClaudeCodeProcess` | Limited |

---

## Risk Assessment

### Risks of Adopting V2 Now

1. **API instability** — `unstable_` prefix means breaking changes are expected. Our abstraction layer must be thick enough to absorb these.
2. **Feature gap** — V2 lacks dynamic permission/model changes, MCP server control, structured output, and file checkpointing that V1 has.
3. **No `interrupt()`** — V2 only has `close()` which terminates entirely. V1 has `interrupt()` for graceful pause.

### Risks of Staying on V1

1. **No multi-turn** — cannot send follow-up messages within a session
2. **CLI subprocess** — current implementation uses `child_process.spawn("claude", ...)` which is even lower-level than V1 `query()`

---

## Recommendation

### Phase 1 (D5): Replace CLI subprocess with V1 `query()` API

The current `AutoModeService` spawns the CLI as a subprocess. The immediate win is replacing this with the V1 `query()` API, which:
- Provides typed `SDKMessage` streaming (no stdout parsing)
- Gives cost data directly on `SDKResultMessage`
- Supports `interrupt()` for graceful cancellation
- Has `resume` and `sessionId` for crash recovery
- Is the **stable** API

### Phase 2 (Future): Adopt V2 when stable

When the V2 API drops the `unstable_` prefix:
- Migrate interactive/agent sessions to V2 for multi-turn support
- Keep pipeline sessions on V1 (they are single-prompt by nature)
- Use V2 for the expansion agent (intent-first flow) if multi-turn is needed

### Implementation Notes for D5

```typescript
// Replace spawn("claude", ...) with:
import { query } from "@anthropic-ai/claude-agent-sdk";

const stream = query({
  prompt: `Read .claude/skills/nomos/SKILL.md and follow...`,
  options: {
    model: "claude-sonnet-4-5-20250929",
    cwd: projectRoot,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    maxBudgetUsd: 5.0,
    settingSources: ["project"],
    abortController,
    sessionId: sdkSessionId, // for resume
  },
});

for await (const message of stream) {
  // message is typed as SDKMessage
  // No parsing needed — use switch(message.type)
}
```

For session resume on crash:
```typescript
const stream = query({
  prompt: "Continue the previous task",
  options: {
    resume: storedSessionId,
    // ... same options
  },
});
```

---

## V2 Proof of Concept

A minimal proof of concept (not for production use):

```typescript
import {
  unstable_v2_createSession,
  type SDKSession,
  type SDKMessage,
} from "@anthropic-ai/claude-agent-sdk";

async function v2Demo() {
  const session = unstable_v2_createSession({
    model: "claude-sonnet-4-5-20250929",
    permissionMode: "plan", // read-only for safety
  });

  // Send first message
  await session.send("What files are in the current directory?");

  // Stream response
  for await (const msg of session.stream()) {
    if (msg.type === "assistant") {
      console.log("Assistant:", msg.message.content);
    }
    if (msg.type === "result") {
      console.log("Cost:", msg.total_cost_usd);
      break;
    }
  }

  // Send follow-up (multi-turn)
  await session.send("Now show me the package.json");

  for await (const msg of session.stream()) {
    if (msg.type === "result") break;
  }

  // Store session ID for potential resume
  const sessionId = session.sessionId;
  console.log("Session ID for resume:", sessionId);

  session.close();
}
```

---

## Conclusion

The V2 API is present and usable but not yet stable. For the D5 refactor, **use V1 `query()` API** which provides all needed capabilities (typed streaming, cost tracking, resume, interrupt) with a stable interface. Plan for V2 adoption when it graduates from `@alpha`.
