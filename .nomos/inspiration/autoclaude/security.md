# Security Architecture

> Three-layer defense-in-depth security model for autonomous AI agent execution.

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 1: OS SANDBOX                                                  │
│   - Bash commands run in isolation                                   │
│   - Process-level sandboxing                                         │
│   - Environment variable filtering                                   │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 2: FILESYSTEM RESTRICTIONS                                     │
│   - Operations limited to project directory                          │
│   - Path traversal prevention                                        │
│   - File permission validation                                       │
│   - Worktree isolation                                               │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 3: DYNAMIC COMMAND ALLOWLIST                                   │
│   - Base commands (always allowed)                                   │
│   - Stack-detected commands (project-specific)                       │
│   - Custom user-defined commands                                     │
│   - Domain-specific validators (filesystem, git, shell, db, process)│
├─────────────────────────────────────────────────────────────────────┤
│ Layer 4: MCP SERVER VALIDATION                                       │
│   - Safe command allowlist (npx, npm, node, python, uv, uvx)       │
│   - Dangerous command blocklist (bash, sh, cmd, powershell)         │
│   - Dangerous flag blocklist (--eval, -e, -c, --exec, -m)          │
│   - No path separators in commands (prevent path traversal)         │
│   - Field type validation                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 5: CREDENTIAL MANAGEMENT                                       │
│   - OS-level credential storage (Keychain/WinCredMgr)               │
│   - Token encryption at rest                                         │
│   - OAuth token lifecycle & refresh                                  │
│   - API key isolation per profile                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 6: RELEASE SECURITY                                            │
│   - VirusTotal scan before publishing                                │
│   - SHA256 checksums for all releases                                │
│   - macOS code signing (hardened runtime)                            │
│   - Sentry error tracking                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Command Allowlisting System

### Three-Tier Command Validation

```python
# security/profile.py
class SecurityProfile:
    """Dynamic security profile per project."""

    def __init__(self, project_dir: Path):
        self.base_commands = BASE_COMMANDS          # Always allowed
        self.stack_commands = set()                  # Detected from project
        self.custom_commands = set()                 # User-defined

    def get_all_allowed_commands(self) -> set[str]:
        return self.base_commands | self.stack_commands | self.custom_commands
```

### Base Commands (Always Allowed)

```python
BASE_COMMANDS = {
    # Core shell utilities
    "ls", "cat", "echo", "pwd", "cd", "mkdir", "rm", "cp", "mv",
    "touch", "chmod", "chown", "find", "grep", "sed", "awk",
    "head", "tail", "wc", "sort", "uniq", "diff",

    # Git operations
    "git",

    # Text processing
    "jq", "curl", "wget",

    # Process management
    "ps", "kill", "which", "env",
}
```

### Stack-Detected Commands

```python
# project/command_registry/
# Each module detects commands based on project structure

class LanguageCommands:
    """Commands for detected programming languages."""
    def detect(self, project_index):
        commands = set()
        if project_index.get("python"):
            commands |= {"python", "python3", "pip", "pip3", "pytest", "ruff", "mypy"}
        if project_index.get("node"):
            commands |= {"node", "npm", "npx", "yarn", "pnpm", "bun"}
        if project_index.get("go"):
            commands |= {"go", "gofmt"}
        return commands

class FrameworkCommands:
    """Commands for detected frameworks."""
    def detect(self, project_index):
        commands = set()
        if project_index.get("nextjs"):
            commands |= {"next"}
        if project_index.get("django"):
            commands |= {"django-admin", "manage.py"}
        if project_index.get("rails"):
            commands |= {"rails", "rake", "bundle"}
        return commands

class DatabaseCommands:
    """Commands for detected databases."""
    def detect(self, project_index):
        commands = set()
        if project_index.get("postgres"):
            commands |= {"psql", "pg_dump", "pg_restore"}
        if project_index.get("redis"):
            commands |= {"redis-cli"}
        return commands
```

### Domain-Specific Validators

```python
# security/validator_registry.py
VALIDATORS = [
    FilesystemValidator(),    # Path traversal, symlink attacks
    GitValidator(),           # Force push protection, branch validation
    ShellValidator(),         # Pipe injection, command chaining
    DatabaseValidator(),      # SQL injection via CLI
    ProcessValidator(),       # Process spawning restrictions
]

# security/filesystem_validators.py
class FilesystemValidator:
    """Validates filesystem operations stay within project."""

    def validate(self, command: str, project_dir: Path) -> tuple[bool, str]:
        # Check for path traversal
        if ".." in command:
            return False, "Path traversal detected"

        # Check for absolute paths outside project
        paths = extract_paths(command)
        for path in paths:
            if not is_within_project(path, project_dir):
                return False, f"Path {path} outside project directory"

        return True, ""

# security/git_validators.py
class GitValidator:
    """Validates git operations for safety."""

    BLOCKED_GIT_OPERATIONS = {
        "push --force",
        "push -f",
        "reset --hard",
        "clean -fd",
    }

    def validate(self, command: str) -> tuple[bool, str]:
        for blocked in self.BLOCKED_GIT_OPERATIONS:
            if blocked in command:
                return False, f"Dangerous git operation: {blocked}"
        return True, ""
```

---

## MCP Server Security

```python
# core/client.py
SAFE_COMMANDS = {"npx", "npm", "node", "python", "python3", "uv", "uvx"}

DANGEROUS_COMMANDS = {
    "bash", "sh", "cmd", "powershell", "pwsh",
    "/bin/bash", "/bin/sh", "/bin/zsh",
    "/usr/bin/bash", "/usr/bin/sh",
    "zsh", "fish",
}

DANGEROUS_FLAGS = {
    "--eval", "-e", "-c", "--exec",
    "-m",       # Python module execution
    "-p",       # Python eval+print
    "--print",  # Node.js print
    "--experimental-loader",  # Node.js custom loaders
    "--require", "-r",        # Node.js require injection
}

def _validate_custom_mcp_server(server: dict) -> bool:
    """Multi-check MCP server validation."""

    # 1. Required fields check
    if not all(f in server for f in {"id", "name", "type"}):
        return False

    # 2. Type must be 'command' or 'http'
    if server["type"] not in ("command", "http"):
        return False

    if server["type"] == "command":
        command = server.get("command", "")

        # 3. No path separators (prevent path traversal)
        if "/" in command or "\\" in command:
            return False

        # 4. Not a dangerous command
        if command in DANGEROUS_COMMANDS:
            return False

        # 5. Must be in safe command list
        if command not in SAFE_COMMANDS:
            return False

        # 6. No dangerous flags in args
        for arg in server.get("args", []):
            if arg in DANGEROUS_FLAGS:
                return False

    elif server["type"] == "http":
        # URL must be present and valid
        if not isinstance(server.get("url"), str):
            return False

    # 7. No unexpected fields
    allowed_fields = {"id", "name", "type", "command", "args", "url", "headers", "description"}
    if set(server.keys()) - allowed_fields:
        return False

    return True
```

---

## Credential Management

### OS-Level Credential Storage

```typescript
// src/main/claude-profile/credential-utils.ts
class CredentialStorage {
    // macOS: Keychain
    // Windows: Windows Credential Manager
    // Linux: Secret Service API (gnome-keyring/kwallet)

    async store(profile: string, token: string): Promise<void>;
    async retrieve(profile: string): Promise<string | null>;
    async delete(profile: string): Promise<void>;
}
```

### Token Encryption

```typescript
// src/main/claude-profile/token-encryption.ts
// Tokens encrypted at rest using OS keychain
// Validated before use: validate_token_not_encrypted()
```

### OAuth Token Lifecycle

```typescript
// src/main/claude-profile/token-refresh.ts
class TokenRefresher {
    // Automatic token refresh before expiry
    // Retry with exponential backoff on failure
    // Falls back to re-authentication if refresh fails
}
```

---

## Secret Scanning

```python
# security/scan_secrets.py
# Pre-commit hook scans for secrets in staged files
# Checks for:
# - API keys (Anthropic, OpenAI, AWS, GCP, Azure)
# - Private keys (RSA, SSH)
# - Database connection strings
# - JWT tokens
# - Generic high-entropy strings
```

---

## Agent Tool Restrictions by Type

| Tool | Planner | Coder | QA Reviewer | QA Fixer |
|------|---------|-------|-------------|----------|
| Read | Yes | Yes | Yes | Yes |
| Write | Yes | Yes | **NO** | Yes |
| Edit | No | Yes | **NO** | Yes |
| Bash | Yes | Yes | Yes | Yes |
| Glob | Yes | Yes | Yes | Yes |
| Grep | Yes | Yes | Yes | Yes |
| Task | Yes | Yes | No | No |

The QA Reviewer explicitly lacks write/edit tools. This ensures it can only observe and report, never modify code. This separation prevents the reviewer from silently "fixing" issues, which would bypass the explicit fix→re-review cycle.

---

## Comparison with Automaker Security

| Aspect | Auto-Claude | Automaker |
|--------|-------------|-----------|
| Command Validation | Dynamic allowlist (base + stack + custom) | Static allowlist |
| Project Detection | Automatic stack analysis | Manual configuration |
| MCP Validation | Allowlist + blocklist + flag check | Not documented |
| Credential Storage | OS-level keychain | In-memory session |
| Secret Scanning | Pre-commit hook | Not documented |
| Agent Tool Isolation | Per-agent-type tool sets | Same tools for all |
| Release Security | VirusTotal + SHA256 + code signing | Not documented |
| Path Validation | Domain-specific validators | Path sanitization |

---

*Reference: Security architecture from Auto-Claude v2.7.5*
