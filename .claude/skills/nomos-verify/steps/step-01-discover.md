# Step 01: Discover Features

<objective>
Load feature details and identify dependencies for verification order.
</objective>

<instructions>

## 1. Load Feature Details

For each feature in `{features_to_verify}`:

```javascript
// Extract from features.json
{
  id: "F027",
  title: "...",
  status: "verified",
  acceptanceCriteria: [...],
  dependencies: [...],
  category: "CAT-API"
}
```

## 2. Categorize by Type

Group features for targeted verification:

| Category | Verification Focus |
|----------|-------------------|
| CAT-API | Server endpoints, REST, WebSocket |
| CAT-UI | Browser testing, visual, interaction |
| CAT-DB | Database operations, migrations |
| CAT-CORE | Core logic, types, utilities |

## 3. Check Dependencies

Build dependency graph:
- Identify features that depend on others
- Order verification: dependencies first
- Flag circular dependencies

```
F028 → depends on → F027
F037 → depends on → F027
F038 → depends on → F037
```

## 4. Determine Verification Order

Priority order:
1. Features with no dependencies
2. Features whose dependencies are already verified
3. Features with pending dependencies (note as blocked)

## 5. Identify Running Services Required

Based on feature categories:
- **CAT-API:** Server must be running (port 3008)
- **CAT-UI:** Web app must be running (port 3001)
- **Both:** Both services needed

## 6. Save Discovery Results

Write to `{output_dir}/discovery.json`:

```json
{
  "timestamp": "{timestamp}",
  "features": [...],
  "verification_order": [...],
  "services_required": ["server", "web"],
  "blocked_features": [...]
}
```

## 7. Display Summary

```markdown
## Discovery Results

| Metric | Count |
|--------|-------|
| Total Features | {count} |
| API Features | {api_count} |
| UI Features | {ui_count} |
| Blocked | {blocked_count} |

**Verification Order:**
1. F027 - Create Hono Server Foundation
2. F028 - Implement Health Check Endpoint
...
```

</instructions>

<next_step>
Load `steps/step-02-verify.md`
</next_step>
