# Frontend UI Architecture

> Electron + React desktop application architecture.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 40 |
| Build | electron-vite 5, Vite 7 |
| UI | React 19, TypeScript 5.9 (strict) |
| State | Zustand 5 (24+ stores) |
| Styling | Tailwind CSS 4, Radix UI, CVA |
| Terminal | xterm.js 6 + WebGL addon |
| DnD | @dnd-kit (Kanban board) |
| Animation | Motion (Framer Motion) |
| Markdown | react-markdown + remark-gfm |
| i18n | react-i18next (en + fr) |
| Validation | Zod 4 |
| Linting | Biome 2 |
| Testing | Vitest 4 + React Testing Library + Playwright |

---

## Application Structure

### Main Process (Electron)

```
src/main/
├── index.ts                    # App lifecycle, window creation
├── ipc-setup.ts                # IPC handler registration
├── agent/                      # Agent management
│   ├── agent-manager.ts        # Agent lifecycle orchestration
│   ├── agent-queue.ts          # Queue routing, spec number locking
│   ├── agent-process.ts        # Subprocess spawn & NDJSON parsing
│   ├── agent-state.ts          # Running agent state tracking
│   ├── agent-events.ts         # Lifecycle events
│   └── parsers/                # Phase event parsers
├── claude-profile/             # Multi-account management
│   ├── credential-utils.ts     # OS credential storage
│   ├── token-refresh.ts        # OAuth token lifecycle
│   ├── usage-monitor.ts        # Per-profile usage tracking
│   ├── profile-scorer.ts       # Availability scoring
│   └── rate-limit-manager.ts   # Auto-switch on rate limit
├── terminal/                   # PTY management
│   ├── pty-daemon.ts           # Background PTY process
│   ├── pty-manager.ts          # PTY lifecycle
│   ├── terminal-manager.ts     # Session management
│   ├── terminal-lifecycle.ts   # Create/cleanup/events
│   └── claude-integration-handler.ts
├── ipc-handlers/               # 40+ IPC handler modules
│   ├── task-handlers.ts
│   ├── terminal-handlers.ts
│   ├── settings-handlers.ts
│   ├── github/                 # GitHub integration handlers
│   ├── gitlab/                 # GitLab integration handlers
│   ├── ideation/               # Ideation handlers
│   ├── context/                # Context/memory handlers
│   └── ...
├── services/                   # Background services
│   ├── profile-service.ts
│   └── sdk-session-recovery-coordinator.ts
├── changelog/                  # Release notes generation
├── insights/                   # Codebase exploration
└── platform/                   # Cross-platform abstraction
```

### Renderer Process (React)

```
src/renderer/
├── App.tsx                     # Root component
├── main.tsx                    # Entry point
├── components/                 # 100+ components
│   ├── KanbanBoard.tsx         # Main task board
│   ├── Terminal.tsx             # xterm.js terminal
│   ├── TerminalGrid.tsx         # Multi-terminal layout
│   ├── SortableTaskCard.tsx     # Draggable task card
│   ├── TaskDetailModal → task-detail/
│   ├── onboarding/             # Setup wizard
│   ├── settings/               # App settings
│   ├── github-issues/          # GitHub issues
│   ├── github-prs/             # GitHub PRs
│   ├── gitlab-issues/          # GitLab issues
│   ├── gitlab-merge-requests/  # GitLab MRs
│   ├── ideation/               # Improvement suggestions
│   ├── roadmap/                # Feature planning
│   ├── changelog/              # Release notes
│   ├── context/                # Project context
│   ├── task-form/              # Task creation
│   ├── terminal/               # Terminal components
│   └── ui/                     # Radix primitives
├── stores/                     # 24+ Zustand stores
│   ├── project-store.ts
│   ├── task-store.ts
│   ├── terminal-store.ts
│   ├── settings-store.ts
│   ├── github/
│   ├── gitlab/
│   └── ...
├── hooks/                      # Custom hooks
├── contexts/                   # React contexts
├── lib/                        # Utilities
└── styles/                     # CSS
```

---

## State Management (Zustand)

### 24+ Domain Stores

| Store | Domain |
|-------|--------|
| `project-store` | Active project, project list, tabs |
| `task-store` | Tasks, specs, status management |
| `terminal-store` | Terminal sessions, active terminal |
| `settings-store` | User preferences, agent config |
| `kanban-settings-store` | Kanban board configuration |
| `claude-profile-store` | Multi-account profiles |
| `auth-failure-store` | Authentication failure state |
| `rate-limit-store` | Rate limit tracking |
| `context-store` | Project context, memory |
| `changelog-store` | Changelog entries |
| `ideation-store` | Improvement ideas |
| `insights-store` | Codebase insights |
| `roadmap-store` | Feature roadmap |
| `file-explorer-store` | File tree state |
| `download-store` | Download progress |
| `release-store` | Release management |
| `project-env-store` | Project env vars |
| `terminal-font-settings-store` | Terminal fonts |
| `github/issues-store` | GitHub issues |
| `github/pr-review-store` | GitHub PR reviews |
| `github/sync-status-store` | GitHub sync state |
| `github/investigation-store` | Issue investigations |
| `gitlab-store` | GitLab issues |
| `gitlab/mr-review-store` | GitLab MR reviews |

---

## IPC Communication Pattern

```typescript
// Pattern: Renderer → Main → Backend

// 1. Renderer calls via electronAPI
window.electronAPI.tasks.create(taskData);

// 2. Preload exposes safe API (src/preload/api/)
contextBridge.exposeInMainWorld('electronAPI', {
    tasks: {
        create: (data) => ipcRenderer.invoke('task:create', data),
        list: () => ipcRenderer.invoke('task:list'),
        update: (id, data) => ipcRenderer.invoke('task:update', id, data),
    },
    agent: {
        start: (taskId) => ipcRenderer.invoke('agent:start', taskId),
        stop: (taskId) => ipcRenderer.invoke('agent:stop', taskId),
        onPhaseEvent: (cb) => ipcRenderer.on('agent:phase', cb),
    },
    terminal: {
        create: (opts) => ipcRenderer.invoke('terminal:create', opts),
        write: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
    },
});

// 3. Main process handles (src/main/ipc-handlers/)
ipcMain.handle('task:create', async (event, data) => {
    return taskService.create(data);
});

ipcMain.handle('agent:start', async (event, taskId) => {
    return agentManager.start(taskId);
});
```

---

## Agent Process Management

```typescript
// src/main/agent/agent-process.ts
class AgentProcess {
    private process: ChildProcess;
    private parser: NDJSONParser;

    async start(task: Task): Promise<void> {
        // Spawn Python subprocess
        this.process = spawn('python', [
            'run.py',
            '--spec', task.specId,
            '--model', task.model,
        ], {
            cwd: task.projectDir,
            env: this.buildEnv(task),
        });

        // Parse NDJSON output for phase events
        this.parser = new NDJSONParser(this.process.stdout);
        this.parser.on('data', (event) => {
            if (event.type === 'phase') {
                this.emit('phase', event);
                mainWindow.webContents.send('agent:phase', event);
            }
        });
    }
}
```

---

## Terminal System

```typescript
// src/main/terminal/pty-manager.ts
class PtyManager {
    private sessions = new Map<string, PtySession>();

    async createSession(opts: TerminalOptions): Promise<string> {
        const pty = spawn(detectShell(), [], {
            cwd: opts.workingDir,
            env: this.buildEnv(opts),
            cols: opts.cols || 80,
            rows: opts.rows || 24,
        });

        const sessionId = uuid();
        this.sessions.set(sessionId, { pty, ...opts });
        return sessionId;
    }
}

// Renderer: xterm.js with WebGL
// src/renderer/components/terminal/useXterm.ts
function useXterm(sessionId: string) {
    const terminalRef = useRef<Terminal>();

    useEffect(() => {
        const term = new Terminal({
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
        });

        // WebGL for GPU-accelerated rendering
        term.loadAddon(new WebglAddon());
        term.loadAddon(new FitAddon());
        term.loadAddon(new WebLinksAddon());

        // IPC bridge for PTY I/O
        term.onData((data) => {
            window.electronAPI.terminal.write(sessionId, data);
        });

        window.electronAPI.terminal.onData(sessionId, (data) => {
            term.write(data);
        });

        return () => term.dispose();
    }, [sessionId]);
}
```

---

## Styling System

```css
/* Tailwind CSS v4 with custom themes */
/* 7 color themes × 2 modes (light/dark) = 14 variants */

/* Theme system uses CSS custom properties */
:root {
    --color-bg-primary: theme('colors.gray.900');
    --color-text-primary: theme('colors.gray.100');
    /* ... */
}

[data-theme="ocean"] {
    --color-bg-primary: theme('colors.slate.900');
    --color-accent: theme('colors.cyan.500');
}
```

```typescript
// Utility: cn() helper
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Component variants with CVA
const buttonVariants = cva(
    "inline-flex items-center rounded-md font-medium",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground",
                destructive: "bg-destructive text-destructive-foreground",
                outline: "border border-input bg-background",
            },
            size: {
                default: "h-10 px-4",
                sm: "h-8 px-3",
                lg: "h-12 px-8",
            },
        },
    }
);
```

---

## i18n System

```typescript
// react-i18next with namespace-based organization
// Supported: English, French

// src/shared/i18n/locales/en/navigation.json
{
    "items": {
        "kanban": "Kanban Board",
        "terminals": "Terminals",
        "insights": "Insights",
        "roadmap": "Roadmap",
        "githubPRs": "GitHub PRs"
    }
}

// Usage
import { useTranslation } from 'react-i18next';
const { t } = useTranslation(['navigation']);
<span>{t('navigation:items.kanban')}</span>
```

---

## Key Metrics

| Metric | Value |
|--------|-------|
| React Components | 100+ |
| Zustand Stores | 24+ |
| IPC Handler Modules | 40+ |
| Preload API Modules | 15+ |
| Custom Hooks | 20+ |
| UI Primitives (Radix) | 25+ |
| Color Themes | 7 (light + dark) |
| Supported Languages | 2 (en, fr) |

---

*Reference: Frontend UI architecture from Auto-Claude v2.7.5*
