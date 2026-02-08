---
name: nomos-runner
description: >
  Launch headless Docker containers that implement NOMOS features autonomously.
  Use when the user wants to run features in Docker, launch parallel containers,
  auto-pick from backlog, check runner status, or monitor running containers.
  Triggers: "/runner", "run in docker", "headless", "run features in parallel",
  "launch container", "auto-pick features", "runner status", "runner logs".
---

# NOMOS Headless Runner

Run NOMOS feature implementation in isolated Docker containers with real-time log streaming.

## Prerequisites

- Docker running (`docker info`)
- `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` set
- `GH_TOKEN` set (for push to remote)
- Image built (auto-builds on first run)

## Script Location

```
RUNNER=.claude/skills/nomos/scripts/nomos-runner.sh
```

## Commands

### Auto-pick and run

Pick N pending features from backlog (sorted by priority) and run in parallel:

```bash
bash $RUNNER --mount --auto        # next 1 pending feature
bash $RUNNER --mount --auto 3      # next 3 in parallel
```

### Run specific features

```bash
bash $RUNNER --mount F276 F277 F278
```

### With options

```bash
bash $RUNNER --mount --model opus --budget 10 --auto 2
bash $RUNNER --mount --flags "-a -t -m" F276    # include merge flag
bash $RUNNER --mount --timeout 7200 --auto      # 2h timeout
bash $RUNNER --build --mount --auto             # force rebuild image first
```

### Monitor

```bash
bash $RUNNER --status              # show running/stopped containers
bash $RUNNER --logs F276           # tail logs for feature
bash $RUNNER --stop                # stop all containers
bash $RUNNER --cleanup             # remove stopped containers
```

### Check logs from Claude Code

Read log files directly without docker:

```bash
# List available logs
ls -la .nomos/runner-logs/

# Read latest log
cat .nomos/runner-logs/F276.log
```

## Workflow

1. Parse user intent (auto-pick vs specific features, options)
2. Check Docker is running: `docker info`
3. Run the appropriate `nomos-runner.sh` command via Bash
4. Monitor progress by reading `.nomos/runner-logs/{FEATURE_ID}.log`
5. Report results when containers complete

## Options Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--auto [N]` | 1 | Auto-pick N pending features from backlog |
| `--mount` | off | Bind-mount repo (faster, recommended) |
| `--build` | off | Force rebuild Docker image |
| `--model` | sonnet | Claude model |
| `--budget` | 5 | Max USD per feature (API key only) |
| `--flags` | "-a -t" | NOMOS pipeline flags |
| `--timeout` | 3600 | Seconds before timeout |
| `--status` | - | Show container status |
| `--logs ID` | - | Tail logs for feature |
| `--stop` | - | Stop all containers |
| `--cleanup` | - | Remove stopped containers |

## Notes

- Always use `--mount` for local development (faster than clone mode)
- Add `--build` after changing `Dockerfile.runner` or `nomos-container.sh`
- Containers push to GitHub if `GH_TOKEN` and repo URL are available
- Logs stream in real-time to `.nomos/runner-logs/`
- Each container creates a `feature/{FEATURE_ID}` branch from `main`
