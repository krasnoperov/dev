import * as p from '@clack/prompts'
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, chmodSync, unlinkSync } from 'node:fs'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'

const cwd = process.cwd()
const dirName = basename(cwd).replace(/\./g, '-')
const home = homedir()
const devSessionsRoot = join(home, '.local/share/dev-sessions')
const claudeProjects = join(home, '.claude/projects')
const claudeHooksDir = join(home, '.claude/hooks')
const hookPath = join(claudeHooksDir, 'session_start')

// Convert path to Claude-style notation: /home/alv/projects/foo → -home-alv-projects-foo
function pathToKey(path: string): string {
  return path.replace(/\//g, '-')
}

function getProjectDir(path: string = cwd): string {
  return join(devSessionsRoot, pathToKey(path))
}

function getSessionsDir(path: string = cwd): string {
  return join(getProjectDir(path), 'sessions')
}

interface ProjectIndex {
  path: string
  created: string
}

interface SessionMeta {
  tmuxSession: string
  created: string
  lastAttached: string
  claudeSessionId?: string
  claudeSummary?: string
  gitBranch?: string
}

interface ClaudeSessionEntry {
  sessionId: string
  summary?: string
  gitBranch?: string
}

interface ClaudeSessionsIndex {
  entries: ClaudeSessionEntry[]
}

function ensureProjectIndex(): void {
  const projectDir = getProjectDir()
  const indexPath = join(projectDir, 'index.json')

  mkdirSync(getSessionsDir(), { recursive: true })

  if (!existsSync(indexPath)) {
    const index: ProjectIndex = {
      path: cwd,
      created: new Date().toISOString(),
    }
    writeFileSync(indexPath, JSON.stringify(index, null, 2))
  }
}

function getSessionMeta(tmuxSession: string, path: string = cwd): SessionMeta | null {
  const metaPath = join(getSessionsDir(path), `${tmuxSession}.json`)
  if (!existsSync(metaPath)) return null
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'))
  } catch {
    return null
  }
}

function saveSessionMeta(meta: SessionMeta, path: string = cwd): void {
  const sessionsDir = getSessionsDir(path)
  mkdirSync(sessionsDir, { recursive: true })
  const metaPath = join(sessionsDir, `${meta.tmuxSession}.json`)
  writeFileSync(metaPath, JSON.stringify(meta, null, 2))
}

function updateLastAttached(tmuxSession: string): void {
  const meta = getSessionMeta(tmuxSession)
  if (meta) {
    meta.lastAttached = new Date().toISOString()
    saveSessionMeta(meta)
  }
}

function getClaudeInfo(claudeSessionId: string): { summary?: string; gitBranch?: string } | null {
  const claudeProjectPath = join(claudeProjects, pathToKey(cwd), 'sessions-index.json')
  if (!existsSync(claudeProjectPath)) return null

  try {
    const index: ClaudeSessionsIndex = JSON.parse(readFileSync(claudeProjectPath, 'utf8'))
    const entry = index.entries.find(e => e.sessionId === claudeSessionId)
    if (entry) {
      return { summary: entry.summary, gitBranch: entry.gitBranch }
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function getTmuxSessions(): string[] {
  try {
    const output = execSync('tmux ls 2>/dev/null', { encoding: 'utf8' })
    return output
      .split('\n')
      .filter(line => line.startsWith(dirName))
      .map(line => line.split(':')[0])
  } catch {
    return []
  }
}

function getTmuxSessionName(): string | null {
  if (!process.env.TMUX) return null
  try {
    return execSync('tmux display-message -p "#S"', { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function getStoredSessions(): string[] {
  const sessionsDir = getSessionsDir()
  if (!existsSync(sessionsDir)) return []

  return readdirSync(sessionsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

function attachTmux(session: string): void {
  updateLastAttached(session)
  const child = spawn('tmux', ['attach', '-t', session], {
    stdio: 'inherit',
  })
  child.on('exit', code => process.exit(code || 0))
}

function newTmux(session: string): void {
  ensureProjectIndex()

  const meta: SessionMeta = {
    tmuxSession: session,
    created: new Date().toISOString(),
    lastAttached: new Date().toISOString(),
  }
  saveSessionMeta(meta)

  const child = spawn('tmux', ['new-session', '-s', session], {
    stdio: 'inherit',
  })
  child.on('exit', code => process.exit(code || 0))
}

function listSessions(): void {
  ensureProjectIndex()
  const tmuxSessions = getTmuxSessions()
  const storedSessions = getStoredSessions()

  // Combine active and stored sessions
  const allSessions = [...new Set([...tmuxSessions, ...storedSessions])]

  if (allSessions.length === 0) {
    console.log(`No sessions for ${cwd}`)
    return
  }

  console.log(`Sessions in ${cwd}:`)
  for (const session of allSessions) {
    const meta = getSessionMeta(session)
    const isActive = tmuxSessions.includes(session)
    const status = isActive ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m'

    let display = `  ${status} ${session}`
    if (meta) {
      const parts: string[] = []
      if (meta.claudeSummary) parts.push(meta.claudeSummary.slice(0, 30))
      if (meta.gitBranch) parts.push(`[${meta.gitBranch}]`)
      if (meta.lastAttached) parts.push(formatTimeAgo(meta.lastAttached))
      if (parts.length > 0) display += ` (${parts.join(' ')})`
    }
    console.log(display)
  }
}

// Clean up orphaned session metadata (sessions that no longer exist in tmux)
function cleanSessions(): void {
  const sessionsDir = getSessionsDir()
  if (!existsSync(sessionsDir)) {
    console.log('No session metadata found.')
    return
  }

  const tmuxSessions = getTmuxSessions()
  const storedSessions = getStoredSessions()
  const orphaned = storedSessions.filter(s => !tmuxSessions.includes(s))

  if (orphaned.length === 0) {
    console.log('No orphaned sessions to clean.')
    return
  }

  for (const session of orphaned) {
    const metaPath = join(sessionsDir, `${session}.json`)
    unlinkSync(metaPath)
    console.log(`Removed: ${session}`)
  }
  console.log(`Cleaned ${orphaned.length} orphaned session(s).`)
}

// Handle Claude hook: update session metadata with Claude session ID
function handleHook(): void {
  const claudeSessionId = process.env.CLAUDE_SESSION_ID
  const tmuxSession = getTmuxSessionName()

  if (!claudeSessionId || !tmuxSession) {
    // Not in tmux or no Claude session ID - silently exit
    return
  }

  const meta = getSessionMeta(tmuxSession)
  if (meta) {
    meta.claudeSessionId = claudeSessionId
    // Also try to get fresh summary/branch from Claude's index
    const claudeInfo = getClaudeInfo(claudeSessionId)
    if (claudeInfo) {
      meta.claudeSummary = claudeInfo.summary
      meta.gitBranch = claudeInfo.gitBranch
    }
    saveSessionMeta(meta)
  }
}

// Install Claude hook
function init(): void {
  mkdirSync(claudeHooksDir, { recursive: true })

  const hookContent = `#!/bin/bash
# Installed by @krasnoperov/dev
# Updates dev session metadata with Claude session ID
dev hook session_start
`

  writeFileSync(hookPath, hookContent)
  chmodSync(hookPath, 0o755)

  console.log(`Installed Claude hook at ${hookPath}`)
  console.log('Claude sessions will now be tracked in dev session metadata.')
}

// Remove Claude hook
function deinit(): void {
  if (!existsSync(hookPath)) {
    console.log('No hook installed.')
    return
  }

  unlinkSync(hookPath)
  console.log(`Removed Claude hook from ${hookPath}`)
}

function showHelp(): void {
  console.log(`dev - tmux session manager

Usage:
  dev                      Attach/pick/create session for current directory
  dev ls                   List sessions for current directory
  dev new                  Force create new session
  dev clean                Remove metadata for dead tmux sessions
  dev init                 Install Claude hook
  dev deinit               Remove Claude hook
  dev hook session_start   (internal) Handle Claude hook event
  dev -h, --help           Show this help

Closing sessions:
  Use 'exit' or Ctrl+D in tmux, or 'tmux kill-session -t NAME'

Examples:
  cd ~/projects/myapp && dev   # Start working
  dev new                      # New parallel session
  dev ls                       # See all sessions
  dev clean                    # Remove stale metadata
`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const cmd = args[0]

  // Handle subcommands
  if (cmd === 'hook' && args[1] === 'session_start') {
    handleHook()
    return
  }

  if (cmd === 'init') {
    init()
    return
  }

  if (cmd === 'deinit') {
    deinit()
    return
  }

  if (cmd === 'ls') {
    listSessions()
    return
  }

  if (cmd === 'clean') {
    cleanSessions()
    return
  }

  if (args.includes('-h') || args.includes('--help') || cmd === 'help') {
    showHelp()
    return
  }

  const forceNew = cmd === 'new'

  ensureProjectIndex()

  const sessions = getTmuxSessions()

  // No sessions → create new
  if (sessions.length === 0) {
    newTmux(dirName)
    return
  }

  // Force new session
  if (forceNew) {
    const timestamp = new Date().toTimeString().slice(0, 5).replace(':', '')
    newTmux(`${dirName}-${timestamp}`)
    return
  }

  // One session → attach directly
  if (sessions.length === 1) {
    attachTmux(sessions[0])
    return
  }

  // Multiple → show picker
  p.intro(`dev - ${dirName}`)

  const options = sessions.map(s => {
    const meta = getSessionMeta(s)
    let hint: string | undefined
    if (meta) {
      const parts: string[] = []
      if (meta.claudeSummary) parts.push(meta.claudeSummary.slice(0, 30))
      if (meta.gitBranch) parts.push(`[${meta.gitBranch}]`)
      if (meta.lastAttached) parts.push(formatTimeAgo(meta.lastAttached))
      if (parts.length > 0) hint = parts.join(' ')
    }
    return { value: s, label: s, hint }
  })
  options.push({ value: '__new__', label: 'New session', hint: undefined })

  const selected = await p.select({
    message: 'Select session',
    options,
  })

  if (p.isCancel(selected)) {
    p.cancel('Cancelled')
    process.exit(0)
  }

  if (selected === '__new__') {
    const timestamp = new Date().toTimeString().slice(0, 5).replace(':', '')
    newTmux(`${dirName}-${timestamp}`)
  } else {
    attachTmux(selected as string)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
