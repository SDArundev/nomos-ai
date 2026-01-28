# Deployment & Configuration

> Cross-platform packaging, CI/CD, configuration, and testing.

---

## Cross-Platform Packaging

### Desktop App Distribution

| Platform | Format | Command |
|----------|--------|---------|
| macOS (Apple Silicon) | DMG | `npm run package:mac` |
| macOS (Intel) | DMG | `npm run package:mac` |
| Windows | NSIS Installer | `npm run package:win` |
| Linux (AppImage) | AppImage | `npm run package:linux` |
| Linux (Debian) | .deb | `npm run package:linux` |
| Linux (Flatpak) | Flatpak | `npm run package:flatpak` |

### Electron Builder Configuration

```json
{
    "build": {
        "appId": "com.autoclaude.ui",
        "productName": "Auto-Claude",
        "extraResources": [
            {
                "from": "python-runtime/${os}-${arch}/python",
                "to": "python"
            },
            {
                "from": "python-runtime/${os}-${arch}/site-packages",
                "to": "python-site-packages"
            },
            {
                "from": "../backend",
                "to": "backend"
            }
        ],
        "mac": {
            "hardenedRuntime": true,
            "entitlements": "resources/entitlements.mac.plist"
        }
    }
}
```

### Bundled Python Runtime

The desktop app bundles a standalone Python runtime:
- No system Python dependency
- Platform-specific binary (darwin-arm64, darwin-x64, win32-x64, linux-x86_64)
- Backend code included as extra resource
- `python-env-manager.ts` handles runtime detection and management

---

## CI/CD Pipelines

### GitHub Actions Workflows

```
.github/workflows/
├── ci.yml                    # Main CI (lint, test, typecheck)
├── lint.yml                  # Standalone linting
├── release.yml               # Production release
├── beta-release.yml          # Beta release
├── prepare-release.yml       # Release preparation
├── build-prebuilds.yml       # Native module prebuilds
├── quality-security.yml      # Quality and security checks
├── virustotal-scan.yml       # Binary virus scanning
├── discord-release.yml       # Discord release notifications
├── test-azure-auth.yml       # Azure auth testing
├── pr-labeler.yml            # Auto-label PRs
├── issue-auto-label.yml      # Auto-label issues
├── stale.yml                 # Stale issue management
└── welcome.yml               # Welcome new contributors
```

### Release Process

```
1. Version bump: node scripts/bump-version.js patch|minor|major
2. Create PR to `main` branch
3. CI runs (lint + test + typecheck)
4. Quality/security checks pass
5. PR merged → release.yml triggers
6. Build desktop apps for all platforms
7. macOS notarization
8. VirusTotal scan
9. SHA256 checksum generation
10. GitHub Release created
11. Auto-updater notified
12. Discord notification sent
```

---

## Configuration

### Environment Variables (.env)

```bash
# apps/backend/.env

# Authentication (one of these)
ANTHROPIC_AUTH_TOKEN=         # OAuth token (from Claude subscription)
ANTHROPIC_API_KEY=            # Direct API key

# Memory (optional)
GRAPHITI_ENABLED=true
GRAPHITI_PROVIDER=anthropic   # anthropic | openai | azure | google | ollama

# Integrations (optional)
LINEAR_API_KEY=
GITHUB_TOKEN=
GITLAB_TOKEN=

# E2E Testing
ELECTRON_MCP_ENABLED=true

# Error Tracking (optional)
SENTRY_DSN=

# Debug
DEBUG=false
```

### Task-Level Configuration (task_metadata.json)

```json
{
    "phase_models": {
        "planning": "opus",
        "coding": "sonnet",
        "qa": "sonnet"
    },
    "thinking_budgets": {
        "planning": 16000,
        "coding": 8000,
        "qa": 8000
    }
}
```

### App Settings (managed via UI)

```typescript
interface AppSettings {
    // General
    theme: string;           // "default" | "dusk" | "lime" | "ocean" | ...
    language: string;        // "en" | "fr"

    // Agent defaults
    defaultModel: string;    // "sonnet" | "opus" | "haiku"
    defaultThinkingLevel: string;  // "none" | "low" | "medium" | "high" | "ultrathink"
    worktreeDefault: boolean;
    maxConcurrentAgents: number;  // 1-12

    // Integrations
    github?: { token: string; autoReview: boolean; };
    gitlab?: { url: string; token: string; };
    linear?: { apiKey: string; teamId: string; };
    graphiti?: { enabled: boolean; provider: string; };

    // Notifications
    notifications: {
        sound: boolean;
        desktop: boolean;
        onComplete: boolean;
        onError: boolean;
    };
}
```

---

## Testing

### Backend (Python)

```bash
# Run all backend tests
cd apps/backend && .venv/bin/pytest tests/ -v

# Or from root
npm run test:backend
```

**Test coverage**: 100+ test files covering:
- Agent architecture and flow
- Auth and client
- Context gathering
- Discovery and analysis
- GitHub/GitLab integration
- Implementation plans
- Merge system (conflict detection, auto-merger, AI resolver)
- Phase events
- QA loop, criteria, reports
- Recovery and workspace
- Security (validators, scanning)
- Spec pipeline
- Worktree management

### Frontend (TypeScript)

```bash
cd apps/frontend

# Unit tests (Vitest)
npm test              # Single run
npm run test:watch    # Watch mode
npm run test:coverage # With coverage

# E2E tests (Playwright)
npm run test:e2e
```

**Test coverage**:
- Component tests (React Testing Library)
- Store tests (Zustand)
- Hook tests
- IPC handler tests
- Integration tests (task lifecycle, terminal, file watcher)
- E2E tests (Playwright with Electron)

### E2E with Electron MCP

QA agents can validate the running Electron app:

```bash
# Start app in debug mode
npm run dev:debug

# Set ELECTRON_MCP_ENABLED=true in .env

# QA agent uses Puppeteer MCP to interact with the app
# Tools: take_screenshot, click_by_text, fill_input, get_page_structure
```

---

## Platform Abstraction

```python
# apps/backend/core/platform/
def is_windows() -> bool
def is_macos() -> bool
def is_linux() -> bool
def get_path_delimiter() -> str      # ";" (Win) or ":" (Unix)
def find_executable(name: str) -> str  # Cross-platform exec lookup
def requires_shell(command: str) -> bool  # .cmd/.bat detection

# apps/frontend/src/main/platform/
function isWindows(): boolean
function isMacOS(): boolean
function isLinux(): boolean
function joinPaths(...parts: string[]): string
function findExecutable(name: string): Promise<string>
```

### Rules
- Never use `process.platform` directly
- Never hardcode paths
- Use `findExecutable()` for CLI tools
- CI tests all three platforms

---

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install backend + frontend deps |
| `npm start` | Build and run desktop app |
| `npm run dev` | Dev mode with HMR |
| `npm run dev:debug` | Debug mode (remote debugging) |
| `npm run dev:mcp` | MCP mode (Chrome DevTools port) |
| `npm run build` | Production build |
| `npm run lint` | Biome check (frontend) |
| `npm run lint:fix` | Biome auto-fix |
| `npm test` | Frontend unit tests |
| `npm run test:backend` | Backend pytest |
| `npm run package` | Package for current platform |

---

## Pre-Commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: ruff-check
        name: ruff lint
        entry: ruff check
        language: system
        types: [python]

# .husky/pre-commit
# Frontend: Biome lint-staged
npx lint-staged

# .husky/commit-msg
# Commit message validation
```

---

*Reference: Deployment, configuration, and testing from Auto-Claude v2.7.5*
