# Phase 0: ROUTE

Parse swarm mode, flags, and scope. Create output directory and session config.

---

## 1. Parse Mode

Extract the FIRST positional argument after `swarm`:

| Argument | Mode | Description |
|----------|------|-------------|
| `audit` | audit | Re-examine verified features for real bugs |
| `research` | research | Deep research before implementing a feature |
| `discuss` | discuss | Multi-perspective debate on a topic |
| `learn` | learn | Audit and improve the learning system |

**If no mode specified:** Default to `audit`.

**If mode is invalid:** Print available modes and STOP.

---

## 2. Parse Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--auto` | `-a` | false | Auto-apply recommended actions without confirmation |
| `--fix` | `-f` | false | Create fix tasks in features.json for broken features |
| `--batch` | `-b N` | 5 | Number of features per batch (audit mode) |
| `--rounds` | `-r N` | 2 | Number of discussion rounds (discuss mode) |
| `--quick` | `-q` | false | Quick mode: fewer agents (skip tester in audit) |
| `--prune` | | false | Remove stale entries (learn mode) |

---

## 3. Resolve Scope

**Audit mode:**
- If feature range given (e.g., `F025-F040`): parse start/end, filter features.json
- If specific features given (e.g., `F025 F031 F040`): use those
- If no scope: all features with `status: "verified"` or `status: "waiting_approval"`
- Read `.nomos/features.json` and filter by scope
- Store the list of feature objects in session config

**Research mode:**
- Requires a feature ID (e.g., `F045`)
- Read feature spec from features.json
- Extract acceptance criteria and dependencies

**Discuss mode:**
- Requires a topic string (quoted argument after `discuss`)
- Topic becomes the debate proposition

**Learn mode:**
- No scope needed — operates on all `.nomos/learning/` files
- If `--prune`: note in flags for Phase 2

---

## 4. Create Output Directory

```
timestamp=$(date +%Y%m%d-%H%M%S)
output_dir=".nomos/swarm/{mode}-{timestamp}"
mkdir -p "${output_dir}/screenshots"
```

Use absolute path for `output_dir` (project root based).

---

## 5. Write Session Config

Write `{output_dir}/session.json`:

```json
{
  "mode": "audit",
  "timestamp": "20260208-143022",
  "output_dir": "/Users/sda/Workspace/nomos-ai/.nomos/swarm/audit-20260208-143022",
  "flags": {
    "auto": false,
    "fix": false,
    "batch_size": 5,
    "rounds": 2,
    "quick": false,
    "prune": false
  },
  "scope": {
    "type": "range",
    "features": ["F025", "F026", "F027"],
    "total": 3
  },
  "team_name": "nomos-audit-20260208-143022",
  "status": "initialized"
}
```

For `discuss` mode, `scope` is:
```json
{
  "type": "topic",
  "topic": "State machine extraction to @nomos-ai/types?",
  "total": 1
}
```

For `learn` mode, `scope` is:
```json
{
  "type": "learning_system",
  "files": ["patterns.json", "antipatterns.json", "metrics.json", "..."],
  "total": null
}
```

---

## 6. Print Session Banner

```
NOMOS Swarm — {MODE} Session
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode:    {mode}
Scope:   {scope description}
Agents:  {count} ({agent names})
Flags:   {active flags}
Output:  {output_dir}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 7. Continue

**IMMEDIATELY load:** `steps/phase-01-assemble.md`

Pass `session_config` (the session.json contents) forward.
