# Migration Guide: {target} -> {replacement}

**Session:** REF-{timestamp}
**Type:** {refactor_type}

---

## Overview

This refactoring replaced `{target}` with `{replacement}`.

---

## Breaking Changes

{breaking_changes}

---

## Migration Steps

{migration_steps}

---

## API Changes

| Old | New | Notes |
|-----|-----|-------|
{api_changes}

---

## Before / After Examples

### Before

```typescript
{before_example}
```

### After

```typescript
{after_example}
```

---

## Common Issues

{common_issues}

---

## Verification

Run these commands to verify migration:

```bash
bun run check-types
bun test
bun run lint
```
