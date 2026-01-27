# Frontend UI Architecture

> React + Electron frontend patterns for autonomous AI development interfaces.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | React | 19.2.3 | UI rendering and lifecycle |
| Routing | TanStack React Router | Latest | File-based type-safe routing |
| State | Zustand | Latest | Global state management |
| Data | TanStack React Query | Latest | Server state with caching |
| Build | Vite | 7.3.0 | Fast dev server and bundling |
| Styling | Tailwind CSS | 4.1.18 | Utility-first CSS |
| Desktop | Electron | 39.2.7 | Cross-platform desktop |
| Language | TypeScript | 5.9.3 | Type-safe development |

---

## UI Components

### Base Components (Radix UI)

```
Dialog, Card, Tabs, Accordion, Sheet
Input, Textarea, Select, Checkbox, Radio
Button, Label, Popover, Tooltip
Spinner, Skeleton, Loading State
Breadcrumb, Dropdown Menu
```

### Specialized Components

| Component | Purpose |
|-----------|---------|
| Code Editors | JSON, Shell, XML syntax (CodeMirror) |
| LogViewer | Agent output display with ANSI |
| GitDiffPanel | Side-by-side diff visualization |
| XtermLogViewer | Terminal-style log output |
| TaskProgressPanel | Real-time task progress |
| ImageDropZone | Drag-and-drop image upload |

---

## State Management

### Zustand Store Structure

```typescript
// app-store.ts (142.5 KB)
interface AppStore {
  // Project management
  currentProject: Project | null;
  projects: Project[];
  favorites: string[];
  trashedProjects: Project[];

  // UI State
  theme: string;
  font: string;
  sidebarOpen: boolean;
  viewMode: 'board' | 'list';

  // Feature Kanban
  features: Feature[];
  selectedFeatures: string[];
  boardConfig: BoardConfig;

  // Auto Mode (per-worktree)
  autoModeByWorktree: Record<string, WorktreeAutoState>;

  // Terminal Sessions
  terminalSessions: TerminalSession[];
  terminalLayouts: TerminalLayout[];

  // Model Configuration
  phaseModels: Record<string, PhaseModelConfig>;
  defaultProvider: string;

  // Actions
  setCurrentProject: (project: Project) => void;
  updateFeature: (id: string, updates: Partial<Feature>) => void;
  startAutoMode: (worktreeId: string) => void;
  stopAutoMode: (worktreeId: string) => void;
  // ... 100+ more actions
}

// Per-worktree state isolation pattern
type WorktreeKey = `${string}::${string}`; // projectId::branchName

interface WorktreeAutoState {
  isRunning: boolean;
  activeFeatures: string[];
  maxConcurrency: number;
  failureCount: number;
}
```

### Auth Store

```typescript
// auth-store.ts (minimal, server-synced)
interface AuthStore {
  authChecked: boolean;
  isAuthenticated: boolean;
  settingsLoaded: boolean;

  checkAuth: () => Promise<void>;
  login: (apiKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
}
```

### Feature-Specific Stores

```typescript
// ideation-store.ts - Brainstorming state
// notifications-store.ts - Toast/alert queue
// setup-store.ts - Configuration flows
```

---

## React Query Patterns

### Query Hook Categories

```typescript
// Domain-based organization
├─ Development: useFeatures, useWorktrees, useGitStatus
├─ External: useGitHubIssues, useGitHubPRs, useValidations
├─ Configuration: useSettings, useModels, useCLIStatus
├─ Execution: useSessions, useRunningAgents, useAutoModeStatus
└─ Files: useFilesystem, useDiffs, useContext
```

### Query Key Hierarchy

```typescript
const queryKeys = {
  features: {
    all: (projectPath: string) => ['features', projectPath] as const,
    one: (projectPath: string, id: string) =>
      ['features', projectPath, id] as const,
  },
  worktrees: {
    all: (projectPath: string) => ['worktrees', projectPath] as const,
  },
  github: {
    issues: (projectId: string) => ['github', 'issues', projectId] as const,
    prs: (projectId: string) => ['github', 'prs', projectId] as const,
  },
};
```

### Invalidation Strategy

```typescript
// Granular invalidation
queryClient.invalidateQueries({
  queryKey: queryKeys.features.one(projectPath, featureId),
});

// Bulk invalidation
queryClient.invalidateQueries({
  queryKey: queryKeys.features.all(projectPath),
});

// Cascading (parent clears children)
queryClient.invalidateQueries({
  queryKey: ['features', projectPath],
  exact: false,
});
```

---

## Kanban Board (dnd-kit)

### Architecture

```typescript
<DndContext
  onDragEnd={handleDragEnd}
  collisionDetection={customCollisionStrategy}
  sensors={[dialogAwarePointerSensor]}
>
  <KanbanBoard>
    {columns.map(column => (
      <KanbanColumn key={column.id} column={column}>
        {features
          .filter(f => f.status === column.id)
          .map(feature => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
      </KanbanColumn>
    ))}
  </KanbanBoard>
</DndContext>
```

### Custom Collision Detection

```typescript
const customCollisionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  // Priority 1: Specific targets (dependencies, worktrees)
  const specificTargets = pointerCollisions.filter(c =>
    String(c.id).startsWith('card-drop-') ||
    String(c.id).startsWith('worktree-drop-')
  );

  if (specificTargets.length > 0) {
    return specificTargets;
  }

  // Priority 2: Column drops
  return pointerCollisions;
};
```

### Dialog-Aware Sensor

```typescript
const dialogAwarePointerSensor = useSensor(PointerSensor, {
  activationConstraint: {
    distance: 8, // Minimum drag distance
  },
  // Ignore drags from dialogs
  eventListenerOptions: {
    target: document.body,
  },
});
```

### Feature Card Actions

```typescript
const getFeatureActions = (feature: Feature) => ({
  edit: () => openEditDialog(feature),
  delete: () => confirmDelete(feature.id),
  verify: () => verifyFeature(feature.id),
  implement: () => startImplementation(feature.id),
  moveTo: (status: FeatureStatus) => updateStatus(feature.id, status),
  assignWorktree: (branch: string) => assignToWorktree(feature.id, branch),
});
```

---

## Real-Time Communication

### HTTP API Client

```typescript
// Dual authentication (Electron vs Web)
async function getHeaders(): Promise<Headers> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (isElectron()) {
    // Electron: API key from file
    const apiKey = await getApiKey();
    headers.set('X-API-Key', apiKey);
  } else {
    // Web: Session token from localStorage
    const token = localStorage.getItem('sessionToken');
    if (token) {
      headers.set('X-Session-Token', token);
    }
  }

  return headers;
}

// Request with error handling
async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) {
    clearTokens();
    dispatchLogout();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}
```

### WebSocket Event Streaming

```typescript
type EventType =
  | 'agent:start'
  | 'agent:stream'
  | 'agent:complete'
  | 'agent:error'
  | 'agent:tool-use'
  | 'auto_mode_started'
  | 'auto_mode_feature_start'
  | 'auto_mode_feature_complete'
  | 'auto_mode_paused_failures'
  | 'auto_mode_stopped'
  | 'feature_created'
  | 'feature_updated'
  | 'feature_deleted'
  | 'terminal:output'
  | 'terminal:exit'
  | 'notification:created';

function subscribeToEvent(
  type: EventType,
  callback: (data: unknown) => void
): () => void {
  const ws = getWebSocket();
  const handler = (event: MessageEvent) => {
    const message = JSON.parse(event.data);
    if (message.type === type) {
      callback(message.data);
    }
  };
  ws.addEventListener('message', handler);
  return () => ws.removeEventListener('message', handler);
}
```

### Connection Management

```typescript
// Electron: Immediate connection
// Web: Deferred to avoid 401s on first-load

function initWebSocket(): WebSocket {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    scheduleReconnect();
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
}

function scheduleReconnect(): void {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  setTimeout(() => {
    reconnectAttempts++;
    initWebSocket();
  }, delay);
}
```

---

## Terminal Integration (xterm.js)

### Architecture

```typescript
interface TerminalSession {
  id: string;
  cwd: string;
  shell: string;
  isActive: boolean;
}

interface TerminalLayout {
  type: 'row' | 'column' | 'terminal';
  children?: TerminalLayout[];
  sessionId?: string;
  size?: number; // Percentage
}

function TerminalView() {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [layout, setLayout] = useState<TerminalLayout>({ type: 'terminal' });

  return (
    <TerminalLayoutProvider layout={layout} onLayoutChange={setLayout}>
      <TerminalTabs sessions={sessions} onSelect={setActiveSession} />
      <TerminalPanes>
        {renderLayout(layout, (sessionId) => (
          <TerminalPanel
            sessionId={sessionId}
            onResize={handleResize}
            onInput={handleInput}
          />
        ))}
      </TerminalPanes>
    </TerminalLayoutProvider>
  );
}
```

### Keyboard Shortcuts

```typescript
const terminalShortcuts = {
  'Alt+D': 'Split vertical',
  'Alt+S': 'Split horizontal',
  'Alt+W': 'Close pane',
  'Ctrl+Alt+ArrowUp': 'Navigate up',
  'Ctrl+Alt+ArrowDown': 'Navigate down',
  'Ctrl+Alt+ArrowLeft': 'Navigate left',
  'Ctrl+Alt+ArrowRight': 'Navigate right',
};

function useTerminalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        splitVertical();
      } else if (e.altKey && e.key === 's') {
        e.preventDefault();
        splitHorizontal();
      } else if (e.altKey && e.key === 'w') {
        e.preventDefault();
        closePane();
      } else if (e.ctrlKey && e.altKey && e.key.startsWith('Arrow')) {
        e.preventDefault();
        navigateSpatially(e.key.replace('Arrow', '').toLowerCase());
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

### Layout Persistence

```typescript
// Debounced persistence (500ms)
const saveLayout = useDebouncedCallback((layout: TerminalLayout) => {
  localStorage.setItem(
    `terminal-layout-${projectPath}`,
    JSON.stringify(layout)
  );
}, 500);

// Restore on project switch
useEffect(() => {
  const saved = localStorage.getItem(`terminal-layout-${projectPath}`);
  if (saved) {
    try {
      setLayout(JSON.parse(saved));
    } catch {
      setLayout({ type: 'terminal' });
    }
  }
}, [projectPath]);

// Cleanup on unload
useEffect(() => {
  const cleanup = () => {
    // Sync XMLHttpRequest to ensure cleanup
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/terminal/cleanup', false);
    xhr.send();
  };
  window.addEventListener('beforeunload', cleanup);
  return () => window.removeEventListener('beforeunload', cleanup);
}, []);
```

---

## Theming System

### Theme Configuration

```typescript
interface ThemeOption {
  value: string;          // Theme identifier
  label: string;          // Display name
  Icon: LucideIcon;       // Visual representation
  testId: string;         // Testing identifier
  isDark: boolean;        // Dark/light categorization
  color: string;          // Brand color for UI
}

// 50 themes organized by type
const darkThemes: ThemeOption[] = [
  { value: 'ayu-dark', label: 'Ayu Dark', isDark: true, color: '#0d1017', ... },
  { value: 'dracula', label: 'Dracula', isDark: true, color: '#282a36', ... },
  { value: 'tokyo-night', label: 'Tokyo Night', isDark: true, color: '#1a1b26', ... },
  // ... 17 more
];

const lightThemes: ThemeOption[] = [
  { value: 'github', label: 'GitHub', isDark: false, color: '#ffffff', ... },
  { value: 'paper', label: 'Paper', isDark: false, color: '#f5f5f5', ... },
  // ... 18 more
];
```

### Theme Application

```typescript
// Synchronous hydration before render
function hydrateTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.add(`theme-${theme}`);
}

// Call before React renders
hydrateTheme();

// Theme switching
function setTheme(theme: string) {
  document.documentElement.classList.remove(
    ...Array.from(document.documentElement.classList)
      .filter(c => c.startsWith('theme-'))
  );
  document.documentElement.classList.add(`theme-${theme}`);
  localStorage.setItem('theme', theme);
}
```

### Cascading Theme Resolution

```typescript
function getEffectiveTheme(): string {
  return projectTheme || globalTheme || 'dark';
}

function getEffectiveFont(): string {
  return projectFont || globalFont || 'Inter';
}
```

---

## Custom Hooks

### Data Management

```typescript
// Settings sync with server
function useSettingsSync() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings!, ...updates };
    setSettings(newSettings);
    await syncSettings(newSettings);
  }, [settings]);

  return { settings, updateSettings };
}

// Auto mode orchestration
function useAutoMode(projectPath: string) {
  const store = useAppStore();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToEvent('auto_mode_started', (data) => {
      if (data.projectPath === projectPath) {
        setIsRunning(true);
        store.setAutoRunning(projectPath, true);
      }
    });
    return unsubscribe;
  }, [projectPath]);

  const start = useCallback(async () => {
    await apiRequest('/api/auto-mode/start', {
      method: 'POST',
      body: JSON.stringify({ projectPath }),
    });
  }, [projectPath]);

  const stop = useCallback(async () => {
    await apiRequest('/api/auto-mode/stop', {
      method: 'POST',
      body: JSON.stringify({ projectPath }),
    });
  }, [projectPath]);

  return { isRunning, start, stop };
}
```

### Platform Detection

```typescript
function useOsDetection() {
  const [os, setOs] = useState<'mac' | 'windows' | 'linux'>('mac');

  useEffect(() => {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) setOs('mac');
    else if (platform.includes('win')) setOs('windows');
    else setOs('linux');
  }, []);

  return os;
}

function isMac(): boolean {
  return navigator.platform.toLowerCase().includes('mac');
}
```

### Responsive Design

```typescript
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

function useResponsiveKanban() {
  const isSmall = useMediaQuery('(max-width: 768px)');
  const isMedium = useMediaQuery('(max-width: 1024px)');

  return {
    columns: isSmall ? 1 : isMedium ? 2 : 4,
    cardSize: isSmall ? 'compact' : 'full',
  };
}
```

---

## Mutation Patterns

### Optimistic Updates

```typescript
function useFeatureMutation() {
  return useMutation({
    mutationFn: (feature: Feature) => api.updateFeature(feature),

    onMutate: async (newFeature) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ['features', projectPath],
      });

      // Snapshot current data
      const previousFeatures = queryClient.getQueryData<Feature[]>(
        ['features', projectPath]
      );

      // Optimistically update
      queryClient.setQueryData<Feature[]>(
        ['features', projectPath],
        (old) => old?.map(f =>
          f.id === newFeature.id ? newFeature : f
        ) || []
      );

      return { previousFeatures };
    },

    onError: (err, newFeature, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['features', projectPath],
        context?.previousFeatures
      );
      toast.error('Update failed');
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['features', projectPath],
      });
    },
  });
}
```

---

## View Components

### Primary Views

| View | Size | Purpose |
|------|------|---------|
| `board-view.tsx` | 69 KB | Kanban feature board |
| `terminal-view.tsx` | 65.9 KB | Multi-session terminal |
| `dashboard-view.tsx` | 42.7 KB | Project management |
| `context-view.tsx` | 44 KB | Workspace context |
| `graph-view-page.tsx` | 15.6 KB | Dependency visualization |

### View Shortcuts

| View | Shortcut | Route |
|------|----------|-------|
| Board | K | /board |
| Agent | A | /agent |
| Spec | D | /spec |
| Context | C | /context |
| Settings | S | /settings |
| Terminal | T | /terminal |
| Graph | H | /graph |
| GitHub Issues | G | /github/issues |

---

## Electron Integration

### Main Process Responsibilities

```typescript
// main.ts
async function bootstrap() {
  // Environment detection
  const isDev = !app.isPackaged;

  // Port allocation (3008 default, fallback range)
  const port = await findAvailablePort(3008, 100);

  // API key management
  const apiKey = await ensureApiKey();

  // Spawn backend server
  const server = spawn('node', ['dist/server/index.js'], {
    env: { ...process.env, PORT: port, API_KEY: apiKey },
  });

  // Health check with exponential backoff
  await waitForServer(port);

  // Create window
  const window = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadURL(`http://localhost:${port}`);
}
```

### Preload Script (Security Layer)

```typescript
// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  openFileBrowser: (options) => ipcRenderer.invoke('open-file-browser', options),
  showItemInFolder: (path) => shell.showItemInFolder(path),
  openExternal: (url) => shell.openExternal(url),
  // Note: File operations go through HTTP, not IPC
});
```

---

## Performance Optimizations

### State Management

- Zustand: No re-render on unused state slices
- React Query: Automatic stale-while-revalidate
- Selective subscriptions: Only affected components re-render

### Rendering

- Code splitting via Vite
- Lazy loading for views
- Memoization: `memo()`, `useMemo()`, `useCallback()`

### Terminal

- Debounced layout persistence (500ms)
- Sync cleanup on unload
- 4KB/4ms output batching

### Styling

- Tailwind (no runtime overhead)
- Instant theme switching via CSS classes
- Lazy image loading

---

*Reference: Frontend UI patterns from Automaker v0.13.0+*
