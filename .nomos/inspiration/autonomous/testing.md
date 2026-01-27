# Testing Guide

> End-to-end testing with Playwright, unit testing with Vitest, and mock mode setup for autonomous AI development systems.

---

## Testing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                       Testing Pyramid                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                          ┌───────┐                              │
│                          │  E2E  │  ← Playwright                │
│                         /│ Tests │\    (Critical paths)         │
│                        / └───────┘ \                            │
│                       /             \                           │
│                      / ┌───────────┐ \                          │
│                     /  │Integration│  \  ← Vitest + MSW         │
│                    /   │   Tests   │   \   (API, Services)      │
│                   /    └───────────┘    \                       │
│                  /                       \                      │
│                 /  ┌─────────────────┐    \                     │
│                /   │   Unit Tests    │     \  ← Vitest          │
│               /    │                 │      \   (Functions)     │
│              /     └─────────────────┘       \                  │
│             └─────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Unit Testing with Vitest

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset handlers after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});
```

### Unit Test Examples

```typescript
// src/utils/sanitize.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeBranchName, validatePath } from './sanitize';

describe('sanitizeBranchName', () => {
  it('replaces spaces with underscores', () => {
    expect(sanitizeBranchName('feature branch')).toBe('feature_branch');
  });

  it('removes Windows-invalid characters', () => {
    expect(sanitizeBranchName('feat:test?')).toBe('feattest');
  });

  it('handles reserved Windows names', () => {
    expect(sanitizeBranchName('CON')).toBe('_CON');
    expect(sanitizeBranchName('PRN')).toBe('_PRN');
  });

  it('enforces max length', () => {
    const longName = 'a'.repeat(300);
    expect(sanitizeBranchName(longName).length).toBeLessThanOrEqual(200);
  });
});

describe('validatePath', () => {
  it('rejects paths with null bytes', () => {
    const result = validatePath('/path/with\0null');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('null bytes');
  });

  it('rejects path traversal', () => {
    const result = validatePath('/home/../etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('traversal');
  });
});
```

### Component Test Examples

```typescript
// src/components/FeatureCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureCard } from './FeatureCard';

const mockFeature = {
  id: 'F001',
  title: 'Test Feature',
  status: 'backlog',
  priority: 1,
  description: 'Test description',
};

describe('FeatureCard', () => {
  it('renders feature title', () => {
    render(<FeatureCard feature={mockFeature} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
  });

  it('shows priority badge', () => {
    render(<FeatureCard feature={mockFeature} />);
    expect(screen.getByText('P1')).toBeInTheDocument();
  });

  it('calls onStart when start button clicked', async () => {
    const onStart = vi.fn();
    render(<FeatureCard feature={mockFeature} onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    expect(onStart).toHaveBeenCalledWith('F001');
  });

  it('shows loading state when agent running', () => {
    render(<FeatureCard feature={{ ...mockFeature, status: 'in_progress' }} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

### Store Test Examples

```typescript
// src/stores/features.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFeatureStore } from './features';

describe('useFeatureStore', () => {
  beforeEach(() => {
    // Reset store state
    useFeatureStore.setState({ features: [], loading: false });
  });

  it('adds feature to store', () => {
    const { result } = renderHook(() => useFeatureStore());

    act(() => {
      result.current.addFeature({
        id: 'F001',
        title: 'New Feature',
        status: 'backlog',
      });
    });

    expect(result.current.features).toHaveLength(1);
    expect(result.current.features[0].id).toBe('F001');
  });

  it('updates feature status', () => {
    const { result } = renderHook(() => useFeatureStore());

    act(() => {
      result.current.addFeature({ id: 'F001', status: 'backlog' });
      result.current.updateFeature('F001', { status: 'in_progress' });
    });

    expect(result.current.features[0].status).toBe('in_progress');
  });

  it('filters features by status', () => {
    const { result } = renderHook(() => useFeatureStore());

    act(() => {
      result.current.addFeature({ id: 'F001', status: 'backlog' });
      result.current.addFeature({ id: 'F002', status: 'in_progress' });
    });

    const backlogFeatures = result.current.getFeaturesByStatus('backlog');
    expect(backlogFeatures).toHaveLength(1);
    expect(backlogFeatures[0].id).toBe('F001');
  });
});
```

---

## Integration Testing

### MSW Setup (Mock Service Worker)

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'healthy' });
  }),

  // Features API
  http.get('/api/features', () => {
    return HttpResponse.json([
      { id: 'F001', title: 'Feature 1', status: 'backlog' },
      { id: 'F002', title: 'Feature 2', status: 'in_progress' },
    ]);
  }),

  http.post('/api/features', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'F003', ...body }, { status: 201 });
  }),

  http.patch('/api/features/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: params.id, ...body });
  }),

  // Agent API
  http.post('/api/agents/start', async ({ request }) => {
    const { featureId } = await request.json();
    return HttpResponse.json({
      sessionId: `session-${featureId}`,
      status: 'running',
    });
  }),

  http.post('/api/agents/stop', async ({ request }) => {
    const { sessionId } = await request.json();
    return HttpResponse.json({ sessionId, status: 'stopped' });
  }),
];

// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### API Integration Tests

```typescript
// src/services/api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';
import { featuresApi, agentApi } from './api';

describe('featuresApi', () => {
  it('fetches features successfully', async () => {
    const features = await featuresApi.list();

    expect(features).toHaveLength(2);
    expect(features[0].id).toBe('F001');
  });

  it('creates feature successfully', async () => {
    const newFeature = await featuresApi.create({
      title: 'New Feature',
      description: 'Description',
    });

    expect(newFeature.id).toBe('F003');
    expect(newFeature.title).toBe('New Feature');
  });

  it('handles API errors', async () => {
    server.use(
      http.get('/api/features', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    await expect(featuresApi.list()).rejects.toThrow('Server error');
  });
});

describe('agentApi', () => {
  it('starts agent successfully', async () => {
    const result = await agentApi.start('F001');

    expect(result.sessionId).toBe('session-F001');
    expect(result.status).toBe('running');
  });

  it('stops agent successfully', async () => {
    const result = await agentApi.stop('session-F001');

    expect(result.status).toBe('stopped');
  });
});
```

---

## E2E Testing with Playwright

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Page Objects

```typescript
// e2e/pages/dashboard.page.ts
import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly backlogColumn: Locator;
  readonly inProgressColumn: Locator;
  readonly completedColumn: Locator;
  readonly newFeatureButton: Locator;
  readonly autoModeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backlogColumn = page.getByTestId('column-backlog');
    this.inProgressColumn = page.getByTestId('column-in_progress');
    this.completedColumn = page.getByTestId('column-completed');
    this.newFeatureButton = page.getByRole('button', { name: /new feature/i });
    this.autoModeToggle = page.getByRole('switch', { name: /auto mode/i });
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async createFeature(title: string, description: string) {
    await this.newFeatureButton.click();
    await this.page.getByLabel('Title').fill(title);
    await this.page.getByLabel('Description').fill(description);
    await this.page.getByRole('button', { name: /create/i }).click();
  }

  async getFeatureCard(title: string): Promise<Locator> {
    return this.page.getByTestId('feature-card').filter({ hasText: title });
  }

  async dragFeatureTo(featureTitle: string, columnName: string) {
    const feature = await this.getFeatureCard(featureTitle);
    const column = this.page.getByTestId(`column-${columnName}`);
    await feature.dragTo(column);
  }

  async toggleAutoMode() {
    await this.autoModeToggle.click();
  }
}
```

### E2E Test Examples

```typescript
// e2e/features.spec.ts
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Feature Management', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('creates new feature', async ({ page }) => {
    await dashboard.createFeature(
      'Test Feature',
      'This is a test description'
    );

    // Verify feature appears in backlog
    const featureCard = await dashboard.getFeatureCard('Test Feature');
    await expect(featureCard).toBeVisible();
    await expect(dashboard.backlogColumn).toContainText('Test Feature');
  });

  test('drags feature between columns', async ({ page }) => {
    // Create a feature first
    await dashboard.createFeature('Drag Test', 'Description');

    // Drag to in_progress
    await dashboard.dragFeatureTo('Drag Test', 'in_progress');

    // Verify it moved
    await expect(dashboard.inProgressColumn).toContainText('Drag Test');
    await expect(dashboard.backlogColumn).not.toContainText('Drag Test');
  });

  test('deletes feature', async ({ page }) => {
    await dashboard.createFeature('Delete Me', 'To be deleted');

    const featureCard = await dashboard.getFeatureCard('Delete Me');
    await featureCard.hover();
    await featureCard.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify removed
    await expect(featureCard).not.toBeVisible();
  });
});
```

### Agent E2E Tests

```typescript
// e2e/agent.spec.ts
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Agent Execution', () => {
  test.slow(); // Mark as slow test

  test('starts and stops agent', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Create feature
    await dashboard.createFeature('Agent Test', 'Simple task');

    // Start agent
    const featureCard = await dashboard.getFeatureCard('Agent Test');
    await featureCard.getByRole('button', { name: /start/i }).click();

    // Verify running state
    await expect(featureCard).toHaveAttribute('data-status', 'in_progress');
    await expect(page.getByTestId('terminal')).toContainText(/Starting agent/i);

    // Stop agent
    await featureCard.getByRole('button', { name: /stop/i }).click();

    // Verify stopped
    await expect(page.getByTestId('terminal')).toContainText(/Agent stopped/i);
  });

  test('agent completes feature', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.createFeature('Complete Test', 'Add console.log');

    const featureCard = await dashboard.getFeatureCard('Complete Test');
    await featureCard.getByRole('button', { name: /start/i }).click();

    // Wait for completion (with timeout)
    await expect(featureCard).toHaveAttribute(
      'data-status',
      'waiting_approval',
      { timeout: 120000 }
    );
  });
});
```

---

## Mock Mode Setup

### Mock Provider for Testing

```typescript
// src/providers/mock.provider.ts
import { BaseProvider, AgentMessage } from './base.provider';

export class MockProvider extends BaseProvider {
  private responses: Map<string, string[]> = new Map();
  private delays: { min: number; max: number } = { min: 100, max: 500 };

  setResponses(featureId: string, responses: string[]) {
    this.responses.set(featureId, responses);
  }

  setDelay(min: number, max: number) {
    this.delays = { min, max };
  }

  async *streamResponse(
    featureId: string,
    messages: AgentMessage[]
  ): AsyncGenerator<string> {
    const responses = this.responses.get(featureId) || [
      'I understand the task.',
      'Let me analyze the codebase.',
      'I have completed the implementation.',
    ];

    for (const response of responses) {
      // Simulate network delay
      await this.delay();

      // Stream response word by word
      const words = response.split(' ');
      for (const word of words) {
        yield word + ' ';
        await this.delay(20, 50);
      }
      yield '\n';
    }
  }

  private async delay(min?: number, max?: number) {
    const minDelay = min ?? this.delays.min;
    const maxDelay = max ?? this.delays.max;
    const ms = Math.random() * (maxDelay - minDelay) + minDelay;
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Using Mock Mode

```typescript
// Enable mock mode in tests
process.env.MOCK_PROVIDER = 'true';

// Or via environment file
// .env.test
MOCK_PROVIDER=true
MOCK_DELAY_MIN=50
MOCK_DELAY_MAX=200
```

### Mock Mode Configuration

```typescript
// src/config/mock.config.ts
export const mockConfig = {
  enabled: process.env.MOCK_PROVIDER === 'true',
  delay: {
    min: parseInt(process.env.MOCK_DELAY_MIN || '100'),
    max: parseInt(process.env.MOCK_DELAY_MAX || '500'),
  },
  scenarios: {
    success: ['analyze', 'implement', 'complete'],
    failure: ['analyze', 'error: compilation failed'],
    timeout: ['analyze', /* never responds */],
  },
};
```

---

## Running Tests

### Commands

```bash
# Unit tests
npm run test                 # Run once
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage

# E2E tests
npm run test:e2e             # All browsers
npm run test:e2e:chromium    # Chrome only
npm run test:e2e:headed      # Visible browser

# All tests
npm run test:all
```

### CI Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

*Reference: Testing patterns from Automaker v0.13.0+*
