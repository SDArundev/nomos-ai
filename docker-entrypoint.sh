#!/bin/bash
set -e

# Write Claude OAuth credentials if provided
if [ -n "$CLAUDE_OAUTH_CREDENTIALS" ]; then
    mkdir -p /home/nomos/.claude
    echo "$CLAUDE_OAUTH_CREDENTIALS" > /home/nomos/.claude/.credentials.json
    chmod 600 /home/nomos/.claude/.credentials.json
    chown -R nomos:nomos /home/nomos/.claude
fi

# Fix ownership on home directory
chown -R nomos:nomos /home/nomos

# Fix ownership on npm cache if it exists
if [ -d /home/nomos/.npm ]; then
    chown -R nomos:nomos /home/nomos/.npm
fi

# Switch to non-root user and exec the command
exec gosu nomos "$@"
