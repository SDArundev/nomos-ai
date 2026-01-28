# Claude Agent SDK Integration (Python)

> Detailed patterns for integrating the Claude Agent SDK Python package into autonomous development systems.

---

## SDK Overview

**Package:** `claude-agent-sdk` (Python)
**Version:** >= 0.1.19
**Auth:** Claude Pro/Max subscription (OAuth) or API profiles

The Claude Agent SDK enables autonomous AI agents with:
- Full codebase access (read, write, execute)
- Extended thinking capabilities (configurable budget)
- Tool invocation (built-in + MCP servers)
- Security hooks for command validation
- Session management with context preservation

---

## Client Factory

Auto-Claude centralizes all SDK usage through `create_client()`:

```python
# core/client.py - Single entry point for all agent sessions
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
from claude_agent_sdk.types import HookMatcher

def create_client(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    agent_type: str = "coder",
    max_thinking_tokens: int = None,
) -> ClaudeSDKClient:
    """
    Create configured Claude SDK client.

    All AI interactions MUST use this function.
    NEVER use anthropic.Anthropic() directly.
    """
    # 1. Get auth credentials
    env_vars = get_sdk_env_vars()  # OAuth token or API key
    validate_token_not_encrypted(env_vars)

    # 2. Load project data (cached 5-min TTL)
    project_index, capabilities = _get_cached_project_data(project_dir)

    # 3. Get agent-specific configuration
    allowed_tools = get_allowed_tools(agent_type, capabilities)
    mcp_servers = get_required_mcp_servers(agent_type, project_dir, capabilities)

    # 4. Setup security hook
    security_hook = bash_security_hook  # Validates all bash commands

    # 5. Build options
    options = ClaudeAgentOptions(
        model=model,
        environment=env_vars,
        allowed_tools=allowed_tools,
        max_thinking_tokens=max_thinking_tokens,
        mcp_servers=mcp_servers,
        hooks={
            "bash": [HookMatcher(callback=security_hook)],
        },
    )

    return ClaudeSDKClient(options)
```

---

## Agent Session Pattern

```python
# agents/session.py
async def run_agent_session(
    client: ClaudeSDKClient,
    prompt: str,
    spec_dir: Path,
    verbose: bool = False,
    phase: LogPhase = LogPhase.CODING,
) -> tuple[str, str]:
    """
    Run a single agent session with the configured client.

    Returns:
        Tuple of (status, response_text)
        status: "success" | "error" | "interrupted"
    """
    task_logger = get_task_logger(spec_dir)

    try:
        response = await client.send_message(prompt)

        if task_logger:
            task_logger.log_session_response(response, phase)

        return "success", response.text

    except Exception as e:
        if task_logger:
            task_logger.log_error(str(e), phase)
        return "error", str(e)
```

---

## Agent Types and Configurations

```python
# agents/tools_pkg/models.py - AGENT_CONFIGS (single source of truth)

AGENT_CONFIGS = {
    "planner": {
        "allowed_tools": [
            "Read", "Write", "Bash", "Glob", "Grep",
            "Task",  # Can spawn sub-agents for research
        ],
        "mcp_servers": ["context7"],  # Documentation lookup
        "description": "Creates implementation plans from specs",
    },
    "coder": {
        "allowed_tools": [
            "Read", "Write", "Bash", "Glob", "Grep",
            "Edit", "Task",  # Full coding capabilities
        ],
        "mcp_servers": ["context7", "auto_claude_tools"],
        "description": "Implements subtasks autonomously",
    },
    "qa_reviewer": {
        "allowed_tools": [
            "Read", "Bash", "Glob", "Grep",
            # No Write/Edit - reviewer only reads and runs tests
        ],
        "mcp_servers": ["puppeteer"],  # Browser testing
        "description": "Validates implementation against spec",
    },
    "qa_fixer": {
        "allowed_tools": [
            "Read", "Write", "Bash", "Glob", "Grep", "Edit",
        ],
        "mcp_servers": [],
        "description": "Fixes issues found by QA reviewer",
    },
}
```

---

## Phase-Aware Model Resolution

```python
# phase_config.py
DEFAULT_PHASE_MODELS = {
    "planning": "sonnet",
    "coding": "sonnet",
    "qa": "sonnet",
    "spec_discovery": "sonnet",
    "spec_writing": "sonnet",
    "spec_critique": "sonnet",
}

DEFAULT_THINKING_BUDGETS = {
    "planning": 16000,
    "coding": 8000,
    "qa": 8000,
    "spec_discovery": 4000,
    "spec_writing": 16000,
}

def get_phase_model(spec_dir: Path, phase: str, cli_model: str = None) -> str:
    """Resolve model for execution phase with layered configuration."""
    # Priority: CLI override → task metadata → global settings → defaults
    if cli_model:
        return cli_model

    # Check task-specific configuration
    task_meta = _load_task_metadata(spec_dir)
    if task_meta and phase in task_meta.get("phase_models", {}):
        return task_meta["phase_models"][phase]

    # Fall back to defaults
    return DEFAULT_PHASE_MODELS.get(phase, "sonnet")

def get_phase_thinking_budget(spec_dir: Path, phase: str) -> int:
    """Resolve thinking token budget for execution phase."""
    task_meta = _load_task_metadata(spec_dir)
    if task_meta and phase in task_meta.get("thinking_budgets", {}):
        return task_meta["thinking_budgets"][phase]
    return DEFAULT_THINKING_BUDGETS.get(phase, 8000)
```

---

## Security Hook Integration

```python
# security/hooks.py
def bash_security_hook(command: str) -> tuple[bool, str]:
    """
    Security hook attached to Claude SDK for bash command validation.

    Returns:
        (allowed: bool, reason: str)
    """
    # Get security profile for current project
    project_dir = Path(os.environ.get(PROJECT_DIR_ENV_VAR, os.getcwd()))
    profile = get_security_profile(project_dir)

    # Parse and validate command
    is_allowed, reason = validate_command(command, profile)

    if not is_allowed:
        logger.warning(f"Blocked command: {command} - {reason}")

    return is_allowed, reason
```

---

## MCP Server Configuration

```python
# Custom MCP server validation (core/client.py)
def _validate_custom_mcp_server(server: dict) -> bool:
    """Validate custom MCP server for security."""
    # Safe command allowlist
    SAFE_COMMANDS = {"npx", "npm", "node", "python", "python3", "uv", "uvx"}

    # Dangerous command blocklist
    DANGEROUS_COMMANDS = {"bash", "sh", "cmd", "powershell", "zsh", "fish"}

    # Dangerous flags blocklist
    DANGEROUS_FLAGS = {"--eval", "-e", "-c", "--exec", "-m", "-p"}

    if server["type"] == "command":
        command = server.get("command", "")
        # No path separators allowed
        if "/" in command or "\\" in command:
            return False
        if command in DANGEROUS_COMMANDS:
            return False
        if command not in SAFE_COMMANDS:
            return False
        # Check args for dangerous flags
        for arg in server.get("args", []):
            if arg in DANGEROUS_FLAGS:
                return False

    return True

# Built-in MCP servers
CONTEXT7_TOOLS = {
    "id": "context7",
    "name": "Context7 Documentation",
    "type": "command",
    "command": "npx",
    "args": ["-y", "@context7/mcp"],
}

PUPPETEER_TOOLS = {
    "id": "puppeteer",
    "name": "Browser Testing",
    "type": "command",
    "command": "npx",
    "args": ["-y", "@anthropic-ai/mcp-puppeteer"],
}
```

---

## OAuth and Multi-Profile Authentication

```python
# core/auth.py
def get_sdk_env_vars() -> dict[str, str]:
    """Get environment variables for SDK authentication."""
    env = {}

    # Check for OAuth token first
    auth_token = os.environ.get("ANTHROPIC_AUTH_TOKEN")
    if auth_token:
        validate_token_not_encrypted(auth_token)
        env["ANTHROPIC_AUTH_TOKEN"] = auth_token
        return env

    # Fall back to API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        env["ANTHROPIC_API_KEY"] = api_key
        return env

    # Try to load from credentials
    token = require_auth_token()
    env["ANTHROPIC_AUTH_TOKEN"] = token
    return env
```

Frontend multi-profile management:

```typescript
// src/main/claude-profile/
// - credential-utils.ts: OS credential storage (Keychain/WinCredMgr)
// - token-refresh.ts: OAuth token lifecycle
// - usage-monitor.ts: API usage tracking per profile
// - profile-scorer.ts: Score profiles by availability
// - rate-limit-manager.ts: Automatic profile switching on rate limit
```

---

## Project Index Caching

```python
# core/client.py - Performance optimization
_PROJECT_INDEX_CACHE: dict[str, tuple[dict, dict, float]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minute TTL
_CACHE_LOCK = threading.Lock()

def _get_cached_project_data(project_dir):
    """Get project index and capabilities with thread-safe caching."""
    key = str(project_dir.resolve())

    with _CACHE_LOCK:
        if key in _PROJECT_INDEX_CACHE:
            cached_index, cached_caps, cached_time = _PROJECT_INDEX_CACHE[key]
            if time.time() - cached_time < _CACHE_TTL_SECONDS:
                return copy.deepcopy(cached_index), copy.deepcopy(cached_caps)

    # Cache miss - load fresh
    project_index = load_project_index(project_dir)
    capabilities = detect_project_capabilities(project_index)

    with _CACHE_LOCK:
        _PROJECT_INDEX_CACHE[key] = (project_index, capabilities, time.time())

    return project_index, capabilities
```

---

## Key Differences from Automaker SDK Integration

| Aspect | Auto-Claude | Automaker |
|--------|-------------|-----------|
| Language | Python | TypeScript |
| SDK Package | `claude-agent-sdk` (Python) | `@anthropic-ai/claude-agent-sdk` (JS) |
| Auth | OAuth + API profiles + multi-account | API key + session cookies |
| Provider | Single (Claude SDK) | Multi-provider (Claude, Codex, Cursor) |
| Security | bash_security_hook + command allowlist | Path validation + env filtering |
| Agent Types | planner, coder, qa_reviewer, qa_fixer | Single generic agent |
| MCP Servers | Per-agent-type configuration | Global configuration |
| Caching | Thread-safe project index cache | None documented |
| Model Selection | Phase-aware with layered config | Feature/project level |

---

*Reference: Auto-Claude v2.7.5 Claude Agent SDK Python integration patterns.*
