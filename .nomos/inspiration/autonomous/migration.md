# Migration & Upgrade Guide

> Version upgrade paths, breaking changes, and migration procedures for autonomous AI development systems.

---

## Version Compatibility

| From Version | To Version | Migration Required | Breaking Changes |
|--------------|------------|-------------------|------------------|
| 0.12.x | 0.13.x | Yes | Database schema, API routes |
| 0.11.x | 0.12.x | Yes | Settings format |
| 0.10.x | 0.11.x | No | None |
| 0.9.x | 0.10.x | Yes | Feature schema |

---

## Before Upgrading

### Pre-Upgrade Checklist

- [ ] Back up database and configuration
- [ ] Stop all running agents
- [ ] Disable auto mode
- [ ] Note current version
- [ ] Read release notes for target version
- [ ] Check Node.js version requirements

### Create Backup

```bash
# Full backup
tar -czvf automaker-backup-$(date +%Y%m%d).tar.gz ~/.automaker

# Or individual components
cp ~/.automaker/automaker.db ~/.automaker/automaker.db.backup
cp ~/.automaker/settings.json ~/.automaker/settings.json.backup

# Export features
automaker features export > features-backup.json
```

### Check Current Version

```bash
automaker --version
# or
cat package.json | grep version
```

---

## Upgrade Procedures

### Standard Upgrade (Minor/Patch)

```bash
# 1. Stop all services
automaker auto-mode stop
pkill -f automaker

# 2. Pull latest code
git fetch origin
git checkout v0.13.0  # or latest tag

# 3. Install dependencies
npm install

# 4. Build
npm run build

# 5. Run migrations (if any)
npm run migrate

# 6. Restart
npm run start
```

### npm Global Upgrade

```bash
# 1. Stop services
automaker auto-mode stop

# 2. Upgrade
npm update -g automaker

# 3. Verify
automaker --version

# 4. Run post-upgrade
automaker doctor
```

### Docker Upgrade

```bash
# 1. Stop containers
docker compose down

# 2. Pull new images
docker compose pull

# 3. Run migrations
docker compose run --rm server npm run migrate

# 4. Start with new version
VERSION=0.13.0 docker compose up -d
```

---

## Migration Scripts

### Database Migration

```typescript
// migrations/001_add_feature_metadata.ts
import { Database } from 'better-sqlite3';

export function up(db: Database): void {
  db.prepare(`
    ALTER TABLE features ADD COLUMN metadata TEXT DEFAULT '{}'
  `).run();

  db.prepare(`
    ALTER TABLE features ADD COLUMN tags TEXT DEFAULT '[]'
  `).run();
}

export function down(db: Database): void {
  // SQLite doesn't support DROP COLUMN easily
  // Create new table without columns and copy data
  db.prepare(`
    CREATE TABLE features_new AS
    SELECT id, title, description, status, priority, created_at, updated_at
    FROM features
  `).run();

  db.prepare('DROP TABLE features').run();
  db.prepare('ALTER TABLE features_new RENAME TO features').run();
}
```

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Run specific migration
npm run migrate -- --to 001

# Rollback last migration
npm run migrate:down

# Rollback to specific version
npm run migrate:down -- --to 001
```

### Manual Migration

```bash
# Connect to SQLite
sqlite3 ~/.automaker/automaker.db

# Check schema version
SELECT * FROM migrations;

# Apply manual changes
ALTER TABLE features ADD COLUMN new_field TEXT;

# Update version
INSERT INTO migrations (version, applied_at) VALUES ('002', datetime('now'));
```

---

## Version-Specific Migrations

### v0.12.x → v0.13.x

**Breaking Changes:**
- Database schema changes (features table)
- API route restructuring
- Settings format update
- WebSocket protocol changes

**Migration Steps:**

```bash
# 1. Backup
cp -r ~/.automaker ~/.automaker.backup.v0.12

# 2. Export data
automaker features export > features-v12.json
automaker settings export > settings-v12.json

# 3. Update code
git checkout v0.13.0
npm install
npm run build

# 4. Run automated migration
npm run migrate

# 5. Verify data
automaker features list
automaker settings list

# 6. If issues, restore backup
# cp -r ~/.automaker.backup.v0.12/* ~/.automaker/
```

**Settings Migration:**

```typescript
// Old format (v0.12)
{
  "apiKey": "sk-...",
  "model": "claude-3-sonnet",
  "maxTokens": 4096
}

// New format (v0.13)
{
  "providers": {
    "claude": {
      "apiKey": "${ANTHROPIC_API_KEY}",
      "model": "claude-sonnet-4-20250514",
      "maxTokens": 8192
    }
  },
  "defaultProvider": "claude"
}
```

### v0.11.x → v0.12.x

**Breaking Changes:**
- Settings file restructured
- Feature status names changed

**Migration Script:**

```typescript
// scripts/migrate-0.11-to-0.12.ts
import fs from 'fs';
import path from 'path';
import os from 'os';

const dataDir = process.env.DATA_DIR || path.join(os.homedir(), '.automaker');
const settingsPath = path.join(dataDir, 'settings.json');

// Read old settings
const oldSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

// Transform
const newSettings = {
  version: 2,
  ...oldSettings,
  // Rename fields
  autoMode: {
    ...oldSettings.autoModeConfig,
    enabled: oldSettings.autoModeEnabled,
  },
};

// Remove old fields
delete newSettings.autoModeConfig;
delete newSettings.autoModeEnabled;

// Write new settings
fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));

console.log('Settings migrated successfully');
```

**Status Name Changes:**

| Old Status | New Status |
|------------|------------|
| `pending` | `backlog` |
| `running` | `in_progress` |
| `review` | `waiting_approval` |
| `done` | `verified` |

---

## Data Migration Patterns

### Feature Schema Migration

```typescript
interface FeatureV1 {
  id: string;
  name: string;  // renamed to title
  desc: string;  // renamed to description
  state: string; // renamed to status
}

interface FeatureV2 {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;      // new field
  planningMode: string;  // new field
  metadata: Record<string, unknown>;  // new field
}

function migrateFeature(v1: FeatureV1): FeatureV2 {
  return {
    id: v1.id,
    title: v1.name,
    description: v1.desc,
    status: mapStatus(v1.state),
    priority: 3,  // default
    planningMode: 'lite',  // default
    metadata: {},
  };
}

function mapStatus(oldStatus: string): string {
  const mapping: Record<string, string> = {
    'pending': 'backlog',
    'running': 'in_progress',
    'review': 'waiting_approval',
    'done': 'verified',
  };
  return mapping[oldStatus] || oldStatus;
}
```

### Batch Migration

```typescript
async function migrateFeatures(dataDir: string): Promise<void> {
  const featuresPath = path.join(dataDir, 'features.json');
  const backupPath = path.join(dataDir, 'features.json.backup');

  // Backup
  await fs.promises.copyFile(featuresPath, backupPath);

  // Read and migrate
  const content = await fs.promises.readFile(featuresPath, 'utf-8');
  const features = JSON.parse(content);
  const migrated = features.map(migrateFeature);

  // Validate
  for (const feature of migrated) {
    const result = featureSchema.safeParse(feature);
    if (!result.success) {
      throw new Error(`Invalid feature after migration: ${feature.id}`);
    }
  }

  // Write
  await fs.promises.writeFile(featuresPath, JSON.stringify(migrated, null, 2));

  console.log(`Migrated ${migrated.length} features`);
}
```

---

## API Migration

### Deprecated Endpoints

```
v0.12 (deprecated)          →  v0.13 (current)
─────────────────────────────────────────────────
GET  /api/feature           →  GET  /api/features
POST /api/feature           →  POST /api/features
GET  /api/feature/:id       →  GET  /api/features/:id
POST /api/agent/start       →  POST /api/agents/start
POST /api/agent/stop        →  POST /api/agents/stop
GET  /api/auto-mode/status  →  GET  /api/auto-mode
```

### API Version Header

```bash
# Request specific API version
curl -H "X-API-Version: 0.12" http://localhost:3008/api/feature

# Default uses latest version
curl http://localhost:3008/api/features
```

### Backward Compatibility Layer

```typescript
// Redirect old routes to new ones
app.use('/api/feature', (req, res, next) => {
  console.warn('Deprecated: /api/feature, use /api/features');
  req.url = req.url.replace('/feature', '/features');
  next();
});

// Support both formats in response
app.get('/api/features/:id', (req, res) => {
  const feature = getFeature(req.params.id);

  // Check requested version
  const version = req.headers['x-api-version'] || '0.13';

  if (version.startsWith('0.12')) {
    // Return old format
    res.json({
      id: feature.id,
      name: feature.title,  // old field name
      desc: feature.description,
      state: feature.status,
    });
  } else {
    // Return new format
    res.json(feature);
  }
});
```

---

## Rollback Procedures

### Quick Rollback

```bash
# If upgrade fails, restore from backup
cp -r ~/.automaker.backup/* ~/.automaker/

# Checkout previous version
git checkout v0.12.0
npm install
npm run build
npm start
```

### Database Rollback

```bash
# Restore database backup
cp ~/.automaker/automaker.db.backup ~/.automaker/automaker.db

# Or run down migrations
npm run migrate:down -- --to <previous-version>
```

### Docker Rollback

```bash
# Revert to previous image
docker compose down
VERSION=0.12.0 docker compose up -d

# Or use specific image digest
docker compose pull automaker/server@sha256:abc123...
docker compose up -d
```

---

## Testing Migrations

### Migration Test Script

```typescript
// test/migrations.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Database } from 'better-sqlite3';
import { migrate } from '../src/migrations';

describe('Database Migrations', () => {
  let db: Database;

  beforeAll(() => {
    db = new Database(':memory:');
    // Create initial schema
    db.prepare(`
      CREATE TABLE features (
        id TEXT PRIMARY KEY,
        name TEXT,
        desc TEXT,
        state TEXT
      )
    `).run();
  });

  afterAll(() => {
    db.close();
  });

  it('migrates features table correctly', () => {
    // Insert test data in old format
    db.prepare(`
      INSERT INTO features (id, name, desc, state)
      VALUES ('F001', 'Test', 'Description', 'pending')
    `).run();

    // Run migration
    migrate(db, '001_rename_columns');

    // Verify new schema
    const feature = db.prepare('SELECT * FROM features WHERE id = ?').get('F001');
    expect(feature.title).toBe('Test');
    expect(feature.description).toBe('Description');
    expect(feature.status).toBe('backlog');
  });
});
```

### Dry Run Migration

```bash
# Preview migration changes
npm run migrate -- --dry-run

# Output:
# Migration 001_add_metadata:
#   ALTER TABLE features ADD COLUMN metadata TEXT DEFAULT '{}'
#   ALTER TABLE features ADD COLUMN tags TEXT DEFAULT '[]'
#
# Would affect 42 features
```

---

## Post-Upgrade Verification

### Health Checks

```bash
# API health
curl http://localhost:3008/api/health

# Database integrity
sqlite3 ~/.automaker/automaker.db "PRAGMA integrity_check;"

# Feature count
automaker features list | wc -l

# Run diagnostics
automaker doctor
```

### Verification Script

```bash
#!/bin/bash
# verify-upgrade.sh

echo "Checking version..."
automaker --version

echo "Checking health..."
curl -s http://localhost:3008/api/health | jq .status

echo "Checking features..."
COUNT=$(automaker features list --json | jq length)
echo "Features: $COUNT"

echo "Checking settings..."
automaker settings list | head -5

echo "Testing agent start/stop..."
RESULT=$(automaker run F001 --dry-run)
echo "Agent test: $RESULT"

echo "Upgrade verification complete!"
```

---

## Changelog Summary

### v0.13.0

- Added multi-provider support
- New thinking mode configuration
- Database schema v3
- WebSocket protocol v2
- Deprecated: `/api/feature` routes

### v0.12.0

- Restructured settings format
- Added auto mode configuration
- New feature statuses
- Deprecated: old status names

### v0.11.0

- Initial stable release
- Basic feature management
- Single provider support

---

*Reference: Migration patterns from Automaker v0.13.0+*
