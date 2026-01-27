---
name: step-00i-interactive
description: Interactively configure NOMOS workflow flags
returns_to: step-00-init.md
---

# Step 0i: Interactive Configuration

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER skip the interactive menu
- 🛑 NEVER assume user preferences
- ✅ ALWAYS use AskUserQuestion for flag selection
- ✅ ALWAYS update all flag variables before returning
- 📋 YOU ARE A CONFIGURATOR, not an implementer
- 💬 FOCUS on flag configuration only
- 🚫 FORBIDDEN to start any workflow steps

## CONTEXT BOUNDARIES:

- Variables available: All current flag values from step-00-init
- This sub-step updates: All flag variables based on user selection
- Return to step-00-init.md after completion

## YOUR TASK:

Present an interactive menu for the user to enable/disable workflow flags.

---

## EXECUTION SEQUENCE:

### 1. Display Current Configuration

Show current flag values:
```
**Current NOMOS Configuration for {feature_id}:**

| Flag | Status | Description |
|------|--------|-------------|
| Auto (`-a`) | {auto_mode ? "✓ ON" : "✗ OFF"} | Skip confirmations |
| Test (`-t`) | {test_mode ? "✓ ON" : "✗ OFF"} | Include test steps |
| PR (`-pr`) | {pr_mode ? "✓ ON" : "✗ OFF"} | Create pull request |
| Plan only (`-p`) | {plan_only ? "✓ ON" : "✗ OFF"} | Stop after planning |
| Verify only (`-v`) | {verify_only ? "✓ ON" : "✗ OFF"} | Review step only |
```

### 2. Ask for Primary Flags

Use AskUserQuestion with multiSelect:
```yaml
questions:
  - header: "Configure"
    question: "Select flags to TOGGLE (selected flags will flip their state):"
    options:
      - label: "Auto mode (-a)"
        description: "{auto_mode ? 'Disable' : 'Enable'} - skip confirmations, full pipeline"
      - label: "Test mode (-t)"
        description: "{test_mode ? 'Disable' : 'Enable'} - include test creation and running"
      - label: "PR mode (-pr)"
        description: "{pr_mode ? 'Disable' : 'Enable'} - create pull request at end"
      - label: "Done - proceed with current"
        description: "No changes, proceed with workflow"
    multiSelect: true
```

### 3. Ask for Scope Flags

Use AskUserQuestion:
```yaml
questions:
  - header: "Scope"
    question: "What scope for this run?"
    options:
      - label: "Full pipeline (Recommended)"
        description: "Run all steps from context to merge/ship"
      - label: "Plan only (-p)"
        description: "Stop after step 03 (planning)"
      - label: "Verify only (-v)"
        description: "Run only step 06 (review/quality gate)"
    multiSelect: false
```

### 4. Apply Changes

For each selected flag, toggle its value:
```
IF "Auto mode" selected → {auto_mode} = !{auto_mode}
IF "Test mode" selected → {test_mode} = !{test_mode}
IF "PR mode" selected → {pr_mode} = !{pr_mode}

IF "Plan only" selected → {plan_only} = true, {verify_only} = false
IF "Verify only" selected → {verify_only} = true, {plan_only} = false
IF "Full pipeline" selected → {plan_only} = false, {verify_only} = false
```

### 5. Show Final Configuration

Display updated configuration:
```
**Updated NOMOS Configuration:**

| Flag | Status |
|------|--------|
| Auto | {auto_mode ? "✓ ON" : "✗ OFF"} |
| Test | {test_mode ? "✓ ON" : "✗ OFF"} |
| PR | {pr_mode ? "✓ ON" : "✗ OFF"} |
| Plan only | {plan_only ? "✓ ON" : "✗ OFF"} |
| Verify only | {verify_only ? "✓ ON" : "✗ OFF"} |

**Pipeline:** {plan_only ? "Plan only (steps 00-03)" : verify_only ? "Verify only (step 06)" : "Full pipeline"}
```

### 6. Return

→ Return to step-00-init.md with all flags updated

---

## SUCCESS METRICS:

✅ Current configuration displayed
✅ User able to toggle any flag
✅ All selected flags properly toggled
✅ Scope correctly set (plan_only/verify_only mutually exclusive)
✅ Final configuration shown

## FAILURE MODES:

❌ Not showing current flag states
❌ Forgetting to toggle selected flags
❌ Allowing both plan_only and verify_only to be true
❌ Starting workflow instead of returning
❌ **CRITICAL**: Using plain text prompts instead of AskUserQuestion

---

## RETURN:

After configuration complete, return to `./step-00-init.md` to continue initialization.

<critical>
Remember: This sub-step ONLY handles flag configuration. Return immediately after updating flags.
</critical>
