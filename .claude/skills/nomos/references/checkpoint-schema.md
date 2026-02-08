# NOMOS v4 Checkpoint Schema

JSON checkpoint files are the **sole inter-phase communication channel**. Each phase reads ONLY the previous checkpoint. Agents get fresh context windows via Task tool.

---

## File Location

```
.nomos/output/{feature_id}/cp-{NN}.json
```

Where `NN` is the zero-padded phase number (01-06).

---

## Common Envelope

Every checkpoint shares this envelope structure:

```json
{
  "v": 4,
  "phase": 1,
  "feature_id": "F031",
  "ts": "2026-02-08T10:00:00Z",
  "status": "completed",
  "env": {
    "worktree_path": ".nomos/worktrees/F031",
    "output_dir": "/abs/path/.nomos/output/F031",
    "server_port": 3010,
    "web_port": 3011,
    "project_root": "/abs/path/to/project"
  },
  "flags": {
    "auto": false,
    "test": false,
    "merge": false,
    "cleanup": false,
    "plan_only": false,
    "verify_only": false
  },
  "feature_summary": {
    "id": "F031",
    "title": "Feature Title",
    "ac": ["AC1: ...", "AC2: ..."],
    "category": "core",
    "phase": "phase-1",
    "dependencies": ["F030"]
  },
  "data": {}
}
```

### Envelope Fields

| Field | Type | Description |
|-------|------|-------------|
| `v` | number | Schema version, always `4` |
| `phase` | number | Phase number (1-6) |
| `feature_id` | string | Feature identifier |
| `ts` | string | ISO-8601 timestamp |
| `status` | string | `completed`, `failed`, or `escalated` |
| `env` | object | Environment — propagated through all phases |
| `flags` | object | Feature flags — propagated through all phases |
| `feature_summary` | object | Feature metadata — propagated through all phases |
| `data` | object | Phase-specific payload (see below) |

**Propagation rule:** `env`, `flags`, and `feature_summary` are copied verbatim from cp-01 into every subsequent checkpoint. Any phase can access the AC list without re-reading cp-01.

---

## Phase-Specific Data

### cp-01.json — UNDERSTAND

```json
{
  "data": {
    "risk_level": "LOW|MEDIUM|HIGH",
    "patterns": ["pattern1", "pattern2"],
    "antipatterns": ["antipattern1"],
    "key_files": [
      {"path": "src/foo.ts", "purpose": "Main handler"}
    ],
    "pre_implemented": false,
    "pre_implemented_evidence": [],
    "dependencies_status": "all_verified|blocked",
    "stack_context": ["react", "hono"],
    "thresholds": {"duration_min": 30, "files_max": 15}
  }
}
```

### cp-02.json — PLAN

```json
{
  "data": {
    "plan_overview": "Brief description of approach",
    "file_operations": [
      {"path": "src/foo.ts", "action": "create|modify|delete", "purpose": "..."}
    ],
    "ac_mapping": [
      {"ac": "AC1: ...", "files": ["src/foo.ts"], "approach": "..."}
    ],
    "estimated_complexity": "S|M|L",
    "test_plan": ["test1", "test2"],
    "risks": ["risk1"]
  }
}
```

### cp-03.json — EXECUTE

```json
{
  "data": {
    "verdict": "PASS|FAIL|ESCALATED",
    "iterations": 2,
    "writer_agent_id": "agent-abc123",
    "files_changed": ["src/foo.ts", "src/bar.ts"],
    "lines_added": 150,
    "lines_removed": 30,
    "candidate_antipatterns": [],
    "last_qa_issues": []
  }
}
```

### cp-04.json — REVIEW

```json
{
  "data": {
    "verdict": "PASS|FAIL|ESCALATED",
    "gate_a": {
      "status": "PASS|FAIL",
      "typecheck": "PASS|FAIL",
      "lint": "PASS|FAIL",
      "tests": "PASS|FAIL",
      "test_count": 42
    },
    "gate_b": {
      "status": "PASS|FAIL|SKIP",
      "code_review": {"status": "PASS|FAIL", "findings": 3, "blocking": 0},
      "security_review": {"status": "PASS|FAIL", "findings": 1, "blocking": 0}
    },
    "gate_c": {
      "status": "PASS|FAIL|SKIP",
      "ac_results": [
        {"ac": "AC1", "status": "PASS|FAIL", "evidence": "..."}
      ]
    },
    "fix_cycles_used": 1,
    "total_findings": 4,
    "blocking_findings": 0
  }
}
```

### cp-05.json — SHIP

```json
{
  "data": {
    "git_ops": {
      "branch": "nomos/F031",
      "commits": 3,
      "pushed": true,
      "pr_created": true,
      "pr_url": "https://github.com/...",
      "pr_number": 42,
      "merge_commit": "abc1234"
    },
    "state_transition": "in_progress -> waiting_approval",
    "cleanup": {
      "ports_released": true,
      "worktree_removed": false
    }
  }
}
```

### cp-06.json — LEARN

```json
{
  "data": {
    "skipped": false,
    "metrics_recorded": true,
    "patterns_extracted": 2,
    "antipatterns_extracted": 1,
    "code_patterns_added": 3,
    "codebase_map_updated": true,
    "insight_written": true,
    "insight_file": ".nomos/learning/insights/F031.json",
    "retrospective_summary": "..."
  }
}
```

---

## Resume Protocol

To resume a feature pipeline:

1. Scan `.nomos/output/{feature_id}/cp-*.json`
2. Find the highest-numbered completed checkpoint
3. Start the next phase, reading only that checkpoint
4. If no checkpoints exist, start from Phase 1

```bash
# Find latest completed checkpoint
ls -1 .nomos/output/{feature_id}/cp-*.json 2>/dev/null | sort -V | tail -1
```

---

## Validation Rules

- `env.output_dir` MUST be an absolute path
- `status` must be one of: `completed`, `failed`, `escalated`
- `phase` must match the file number (cp-01.json → phase: 1)
- All timestamps must be valid ISO-8601
- `feature_summary.ac` must be non-empty
