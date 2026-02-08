# Phase 0: ROUTE

Route sub-commands and handle special modes before entering the v4 pipeline.

<critical>
## Sub-command Routing

Parse the FIRST positional argument (non-flag) from the user's input:

**IF first argument is `verify`:**
-> Remove "verify" from argument list
-> Load `.claude/skills/nomos-verify/steps/step-00-init.md`
-> Pass remaining arguments as-is
-> **STOP processing this file entirely**

**IF first argument is `refactor`:**
-> Remove "refactor" from argument list
-> Load `.claude/skills/nomos-refactor/steps/step-00-init.md`
-> Pass remaining arguments as-is
-> **STOP processing this file entirely**

**IF first argument is `improve`:**
-> Remove "improve" from argument list
-> Load `.claude/skills/nomos-improve/steps/step-00-init.md`
-> Pass remaining arguments as-is
-> **STOP processing this file entirely**

**OTHERWISE:** Continue with v4 feature implementation below.
</critical>

---

## Special Modes

**IF `-s` or `--status`:**
```bash
bash .claude/skills/nomos/scripts/nomos.sh session
```
-> EXIT after showing dashboard

**IF `-l` without feature_id:**
-> Load phase-06-learn.md directly
-> EXIT after learning

---

## Enter v4 Pipeline

**IMMEDIATELY load:** `steps/phase-01-understand.md`

Pass all arguments through — Phase 1 handles flag parsing, feature validation, worktree creation, and everything that was in v3 step-00-init.
