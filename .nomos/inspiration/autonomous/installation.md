# Installation Guide

> Step-by-step setup instructions, prerequisites, and troubleshooting for autonomous AI development systems.

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/automaker.git
cd automaker

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start development server
npm run dev
```

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 20.x | 22.x |
| npm | 9.x | 10.x |
| RAM | 4 GB | 8 GB |
| Disk | 2 GB | 10 GB |
| OS | macOS 12+, Ubuntu 20.04+, Windows 10+ | macOS 14+, Ubuntu 22.04+ |

### Required Software

#### Node.js

```bash
# macOS (Homebrew)
brew install node@22

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Windows (winget)
winget install OpenJS.NodeJS.LTS

# Verify installation
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x
```

#### Git

```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt install -y git

# Windows
winget install Git.Git

# Verify
git --version
```

#### Redis (Optional, for production)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Docker (any platform)
docker run -d -p 6379:6379 redis:7-alpine
```

### API Keys

You need at least one AI provider API key:

| Provider | Get Key | Environment Variable |
|----------|---------|---------------------|
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com) | `ANTHROPIC_API_KEY` |
| OpenAI (Codex) | [platform.openai.com](https://platform.openai.com) | `OPENAI_API_KEY` |

---

## Installation Methods

### Method 1: From Source (Recommended for Development)

```bash
# 1. Clone repository
git clone https://github.com/your-org/automaker.git
cd automaker

# 2. Install dependencies
npm install

# 3. Build all packages
npm run build

# 4. Create environment file
cp .env.example .env

# 5. Edit .env with your API key
nano .env
# Add: ANTHROPIC_API_KEY=sk-ant-api03-...

# 6. Start development server
npm run dev
```

### Method 2: Docker (Recommended for Production)

```bash
# 1. Clone repository
git clone https://github.com/your-org/automaker.git
cd automaker

# 2. Create environment file
cp .env.example .env
nano .env

# 3. Start with Docker Compose
docker compose up -d

# 4. View logs
docker compose logs -f
```

### Method 3: npm Global Install

```bash
# 1. Install globally
npm install -g automaker

# 2. Initialize configuration
automaker init

# 3. Start server
automaker start
```

### Method 4: Desktop App (Electron)

```bash
# 1. Download from releases
# https://github.com/your-org/automaker/releases

# 2. macOS
open Automaker.dmg
# Drag to Applications

# 3. Windows
# Run Automaker-Setup.exe

# 4. Linux
chmod +x Automaker.AppImage
./Automaker.AppImage
```

---

## Configuration

### Environment Variables

Create `.env` in project root:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional
NODE_ENV=development
PORT=3008
DATA_DIR=~/.automaker
LOG_LEVEL=info

# For production
SESSION_SECRET=generate-with-openssl-rand-hex-32
ALLOWED_ROOT_DIRECTORIES=/path/to/projects
```

### Generate Secrets

```bash
# Session secret (32 bytes hex)
openssl rand -hex 32

# API key
openssl rand -hex 16
```

### Data Directory Structure

```bash
~/.automaker/
├── .api-key              # Generated API key
├── settings.json         # User settings
├── projects/             # Registered projects
├── sessions/             # Agent sessions
├── logs/                 # Application logs
└── checkpoints/          # Feature checkpoints
```

---

## Verification

### Check Installation

```bash
# 1. Verify Node.js
node --version
# Expected: v22.x.x

# 2. Verify npm packages
npm list --depth=0
# Should show all dependencies

# 3. Verify build
ls packages/server/dist
ls packages/web/dist
# Should contain compiled files

# 4. Check API key
echo $ANTHROPIC_API_KEY | head -c 10
# Should show: sk-ant-api
```

### Start Server

```bash
# Development mode
npm run dev

# Expected output:
# Server running at http://localhost:3008
# Web UI at http://localhost:3001
```

### Test API

```bash
# Health check
curl http://localhost:3008/api/health
# Expected: {"status":"healthy",...}

# List providers
curl http://localhost:3008/api/providers
# Expected: ["claude","codex",...]
```

### Open Web UI

```bash
# Open in browser
open http://localhost:3001  # macOS
xdg-open http://localhost:3001  # Linux
start http://localhost:3001  # Windows
```

---

## Project Structure

```
automaker/
├── packages/
│   ├── server/          # Backend Express server
│   │   ├── src/
│   │   │   ├── routes/  # API endpoints
│   │   │   ├── services/# Business logic
│   │   │   └── utils/   # Helpers
│   │   └── package.json
│   │
│   ├── web/             # Frontend React app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── stores/  # Zustand stores
│   │   │   └── routes/  # TanStack Router
│   │   └── package.json
│   │
│   ├── shared/          # Shared types/utils
│   └── desktop/         # Electron app
│
├── docker-compose.yml
├── package.json         # Root workspace
└── .env.example
```

---

## Platform-Specific Notes

### macOS

```bash
# Install Xcode Command Line Tools (for native modules)
xcode-select --install

# If you get signing errors with Electron
xattr -cr /Applications/Automaker.app
```

### Windows

```powershell
# Enable long paths (required for node_modules)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Install build tools (for native modules)
npm install --global windows-build-tools

# Use PowerShell or Git Bash (not CMD)
```

### Linux

```bash
# Install build essentials
sudo apt install -y build-essential

# For Electron (if needed)
sudo apt install -y libgtk-3-0 libnotify-dev libnss3 libxss1 libasound2

# Increase file watchers (for development)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Troubleshooting

### Common Issues

#### "ANTHROPIC_API_KEY not set"

```bash
# Check if set
echo $ANTHROPIC_API_KEY

# Set in current shell
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Or add to .env file
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." >> .env
```

#### "Port 3008 already in use"

```bash
# Find process using port
lsof -i :3008  # macOS/Linux
netstat -ano | findstr :3008  # Windows

# Kill process
kill -9 <PID>

# Or use different port
PORT=3009 npm run dev
```

#### "npm install fails with node-gyp errors"

```bash
# macOS
xcode-select --install

# Ubuntu
sudo apt install -y python3 make g++

# Windows
npm install --global windows-build-tools
```

#### "EACCES permission denied"

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### "WebSocket connection failed"

```bash
# Check CORS settings
curl -I http://localhost:3008/api/health

# Verify WebSocket URL in frontend
grep VITE_WS_URL .env
# Should match server URL
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run dev

# Or specific modules
DEBUG=automaker:* npm run dev
```

### Clean Reinstall

```bash
# Remove all generated files
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf packages/*/dist
rm -f package-lock.json

# Fresh install
npm install
npm run build
```

---

## Next Steps

After successful installation:

1. **Register a project** - Add your first project to Automaker
2. **Create features** - Define features in the backlog
3. **Configure provider** - Select AI provider and model
4. **Run first agent** - Start an agent on a feature

See [Usage Guide](./usage.md) for detailed workflows.

---

*Reference: Installation guide from Automaker v0.13.0+*
