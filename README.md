# @krasnoperov/dev

Simple tmux session manager for remote development. Easily run persistent AI coding sessions (Claude, Codex, etc.) that survive SSH disconnects.

## Installation

```bash
npm install -g @krasnoperov/dev
```

## Usage

### From local machine

```bash
rdev h1 subtitles      # SSH → ~/projects/subtitles → dev
rdev h1 subtitles -n   # Force new session, skip picker
rdev h1                # Plain SSH
```

### On remote server

```bash
cd ~/projects/myproject
dev                    # Attach/pick/create session
dev -n                 # Force new session
dev -l                 # List sessions
dev -k <name>          # Kill session
```

## How It Works

1. `rdev <host> <project>` - SSH to host, create project dir if needed, run `dev`
2. `dev` - Find tmux sessions matching current directory name
   - 0 sessions → create new
   - 1 session → attach directly
   - 2+ sessions → show picker

### Session Naming

```
myproject              # First session
myproject-1430         # Additional sessions (HHMM timestamp)
myproject-1455
```

### Picker with Claude Summaries

When multiple sessions exist, `dev` shows a picker with Claude session summaries:

```
┌ dev - myproject
│
◆ Select session
│ ● myproject (fix auth bug [main])
│ ○ myproject-1430 (refactor API [feature/api])
│ ○ myproject-1455
│ ○ New session
└
```

## Storage Structure

Sessions are stored using Claude-style path notation:

```
~/.local/share/dev-sessions/
├── -home-alv-projects-subtitles/
│   ├── index.json              # Project metadata
│   └── sessions/
│       ├── subtitles.json      # Session metadata
│       └── subtitles-1430.json
└── -home-alv-projects-api/
    └── ...
```

**Session metadata (sessions/subtitles.json):**
```json
{
  "tmuxSession": "subtitles",
  "created": "2026-02-03T19:00:00Z",
  "lastAttached": "2026-02-03T20:30:00Z",
  "claudeSessionId": "abc123-...",
  "claudeSummary": "fix auth bug",
  "gitBranch": "main"
}
```

## Claude Integration

To show Claude session summaries in the picker, install the hook:

```bash
dev setup
```

This installs a Claude hook at `~/.claude/hooks/session_start` that updates
session metadata with the Claude session ID when Claude starts.

## Workflow Example

```bash
# Terminal 1: Start working
$ rdev h1 api
alv@h1:api $ claude
# Working on "implement auth"
# Ctrl+B D to detach

# Terminal 2: Parallel work
$ rdev h1 api -n
alv@h1:api $ claude
# Working on "write tests"
# Ctrl+B D to detach

# Later: Reconnect
$ rdev h1 api
┌ dev - api
◆ Select session
│ ● api (implement auth [main])
│ ○ api-1430 (write tests [main])
│ ○ New session
└
# Pick session to continue
```

## Requirements

- Node.js 20+
- tmux (on remote server)
- SSH configured for your hosts

## License

MIT
