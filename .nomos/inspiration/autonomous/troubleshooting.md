# Troubleshooting Guide

> Common issues and solutions for autonomous AI development systems.

---

## Quick Diagnostics

```bash
# Run health check
curl http://localhost:3008/api/health

# Check logs
tail -f ~/.automaker/logs/server.log

# Verify configuration
automaker config list

# Run diagnostics
automaker doctor
```

---

## Installation Issues

### Node.js Version Mismatch

**Symptom:**
```
Error: The engine "node" is incompatible with this module.
Expected version ">=20.0.0"
```

**Solution:**
```bash
# Check current version
node --version

# Install correct version with nvm
nvm install 22
nvm use 22

# Or with Homebrew (macOS)
brew install node@22
brew link node@22 --force
```

### npm Install Failures

**Symptom:**
```
npm ERR! code EACCES
npm ERR! permission denied
```

**Solution:**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Or use sudo (not recommended)
sudo npm install -g automaker
```

**Symptom:**
```
gyp ERR! build error
```

**Solution:**
```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt install -y python3 make g++

# Windows
npm install --global windows-build-tools
```

### Missing Dependencies

**Symptom:**
```
Error: Cannot find module 'xxx'
```

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Server Issues

### Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3008
```

**Solution:**
```bash
# Find process using port
lsof -i :3008  # macOS/Linux
netstat -ano | findstr :3008  # Windows

# Kill process
kill -9 <PID>

# Or use different port
PORT=3009 npm run dev
```

### Server Won't Start

**Symptom:**
```
Server failed to start
```

**Checklist:**
1. Check if port is available
2. Verify environment variables are set
3. Check file permissions on data directory
4. Review logs for specific errors

```bash
# Debug mode
DEBUG=* npm run dev

# Check environment
env | grep -E "(PORT|ANTHROPIC|NODE_ENV)"

# Verify data directory
ls -la ~/.automaker
```

### Memory Issues

**Symptom:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Solution:**
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run dev

# Or in package.json scripts
"dev": "NODE_OPTIONS='--max-old-space-size=4096' tsx watch src/index.ts"
```

---

## API Key Issues

### Invalid API Key

**Symptom:**
```
Error: Invalid API key
```

**Solution:**
```bash
# Check if key is set
echo $ANTHROPIC_API_KEY | head -c 15
# Should show: sk-ant-api03-...

# Verify key format
# Claude keys start with: sk-ant-api03-
# OpenAI keys start with: sk-

# Set key
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Or in .env file
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." >> .env
```

### Rate Limit Exceeded

**Symptom:**
```
Error: 429 Too Many Requests
```

**Solution:**
```bash
# Check rate limit status
curl -I https://api.anthropic.com/v1/messages

# Wait for rate limit reset (usually 1 minute)

# Reduce concurrency
automaker config set AUTO_MODE_CONCURRENCY 1

# Use different model (lower usage)
automaker config set DEFAULT_MODEL claude-haiku-3-5-20250414
```

### API Connection Failed

**Symptom:**
```
Error: ECONNREFUSED
```

**Solution:**
```bash
# Check internet connectivity
ping api.anthropic.com

# Check for proxy issues
echo $HTTP_PROXY $HTTPS_PROXY

# If behind corporate proxy
export HTTPS_PROXY=http://proxy.company.com:8080

# Or set base URL for custom endpoint
export ANTHROPIC_BASE_URL=https://your-proxy.com
```

---

## Agent Issues

### Agent Not Starting

**Symptom:**
Agent stuck at "Starting..."

**Checklist:**
1. Verify API key is valid
2. Check feature status is `backlog`
3. Ensure no other agent is running on same feature
4. Review server logs

```bash
# Check agent sessions
curl http://localhost:3008/api/sessions

# Check feature status
curl http://localhost:3008/api/features/F001

# View detailed logs
tail -f ~/.automaker/logs/agent-F001.log
```

### Agent Hangs

**Symptom:**
Agent not responding, no output

**Solution:**
```bash
# Stop stuck agent
curl -X POST http://localhost:3008/api/agents/stop \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-id"}'

# Clear session state
rm ~/.automaker/sessions/session-id.json

# Restart with timeout
automaker run F001 --timeout 300000
```

### Agent Crashes

**Symptom:**
```
Agent terminated unexpectedly
```

**Checklist:**
1. Check memory usage during execution
2. Review agent logs for errors
3. Verify feature description is valid
4. Check for infinite loops in generated code

```bash
# View crash log
cat ~/.automaker/logs/agent-F001-crash.log

# Run with more memory
NODE_OPTIONS="--max-old-space-size=4096" automaker run F001

# Run with verbose logging
DEBUG=agent:* automaker run F001
```

---

## WebSocket Issues

### Connection Failed

**Symptom:**
```
WebSocket connection failed
```

**Solution:**
```bash
# Check WebSocket endpoint
curl -i http://localhost:3008/ws
# Should return 101 Switching Protocols (with WebSocket client)

# Verify CORS settings
grep CORS .env

# Check if behind reverse proxy
# Nginx needs special config for WebSockets
```

### Connection Dropped

**Symptom:**
WebSocket disconnects frequently

**Solution:**
```nginx
# Nginx config - increase timeouts
location /ws {
    proxy_pass http://localhost:3008;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;  # 24 hours
    proxy_send_timeout 86400;
}
```

---

## Git Issues

### Worktree Creation Failed

**Symptom:**
```
fatal: 'feature/xyz' is already checked out
```

**Solution:**
```bash
# List existing worktrees
git worktree list

# Remove stale worktree
git worktree remove ~/.automaker/worktrees/feature-xyz --force

# Prune worktree references
git worktree prune
```

### Branch Already Exists

**Symptom:**
```
fatal: A branch named 'feature/F001' already exists
```

**Solution:**
```bash
# Delete local branch
git branch -D feature/F001

# Delete remote branch (if needed)
git push origin --delete feature/F001

# Or use different branch name
automaker run F001 --branch feature/F001-v2
```

### Merge Conflicts

**Symptom:**
```
Automatic merge failed; fix conflicts and commit
```

**Solution:**
```bash
# View conflicts
git diff --name-only --diff-filter=U

# Resolve manually or abort
git merge --abort

# Or use agent to resolve
automaker run F-MERGE --description "Resolve merge conflicts in feature/F001"
```

---

## Database Issues

### Database Locked

**Symptom:**
```
SQLITE_BUSY: database is locked
```

**Solution:**
```bash
# Find processes using database
fuser ~/.automaker/automaker.db

# Stop all automaker processes
pkill -f automaker

# Or enable WAL mode (prevents locks)
sqlite3 ~/.automaker/automaker.db "PRAGMA journal_mode=WAL;"
```

### Corrupted Database

**Symptom:**
```
SQLITE_CORRUPT: database disk image is malformed
```

**Solution:**
```bash
# Backup current database
cp ~/.automaker/automaker.db ~/.automaker/automaker.db.backup

# Try to recover
sqlite3 ~/.automaker/automaker.db ".recover" | sqlite3 ~/.automaker/automaker-recovered.db

# If recovery fails, start fresh
rm ~/.automaker/automaker.db
automaker init
```

---

## Performance Issues

### Slow Startup

**Solution:**
```bash
# Disable source maps in production
NODE_ENV=production npm start

# Use compiled JavaScript
npm run build
node dist/index.js
```

### High Memory Usage

**Solution:**
```bash
# Monitor memory
node --inspect dist/index.js
# Open chrome://inspect

# Reduce concurrency
automaker config set MAX_CONCURRENT_SESSIONS 1

# Enable memory limits
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

### Slow Agent Response

**Solution:**
```bash
# Use faster model
automaker config set DEFAULT_MODEL claude-haiku-3-5-20250414

# Reduce thinking budget
automaker run F001 --thinking-mode low

# Enable streaming (already default)
automaker config set STREAMING_ENABLED true
```

---

## Debug Mode

### Enable Debug Logging

```bash
# All modules
DEBUG=* npm run dev

# Specific modules
DEBUG=automaker:* npm run dev
DEBUG=automaker:agent,automaker:git npm run dev

# Agent only
DEBUG=agent:* automaker run F001
```

### Inspect Running Process

```bash
# Start with inspector
node --inspect dist/index.js

# Open Chrome DevTools
# Navigate to: chrome://inspect

# Or use VS Code debugger with launch.json
```

### Generate Diagnostic Report

```bash
# Run diagnostics
automaker doctor

# Export report
automaker doctor --output diagnostics.json

# Include in bug report
```

---

## Getting Help

### Collect Information

Before reporting issues, gather:

1. **Version information:**
```bash
automaker --version
node --version
npm --version
```

2. **Configuration:**
```bash
automaker config list 2>&1 | grep -v API_KEY
```

3. **Logs:**
```bash
tail -100 ~/.automaker/logs/server.log
```

4. **System info:**
```bash
uname -a
```

### Report Issues

1. Search existing issues first
2. Include version and system info
3. Provide steps to reproduce
4. Attach relevant logs (redact API keys!)
5. Include expected vs actual behavior

---

*Reference: Troubleshooting patterns from Automaker v0.13.0+*
