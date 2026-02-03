import * as p from '@clack/prompts'
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'

const cwd = process.cwd()
const dirName = basename(cwd).replace(/\./g, '-')
const home = homedir()
const devSessionsRoot = join(home, '.local/share/dev-sessions')
const claudeProjects = join(home, '.claude/projects')

// Convert path to Claude-style notation: /home/alv/projects/foo → -home-alv-projects-foo
function pathToKey(path: string): string {
  return path.replace(/\//g, '-')
}

function getProjectDir(): string {
  return join(devSessionsRoot, pathToKey(cwd))
}

function getSessionsDir(): string {
  return join(getProjectDir(), 'sessions')
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

function getSessionMeta(tmuxSession: string): SessionMeta | null {
  const metaPath = join(getSessionsDir(), `${tmuxSession}.json`)
  if (!existsSync(metaPath)) return null
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'))
  } catch {
    return null
  }
}

function saveSessionMeta(meta: SessionMeta): void {
  const metaPath = join(getSessionsDir(), `${meta.tmuxSession}.json`)
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

function getStoredSessions(): string[] {
  const sessionsDir = getSessionsDir()
  if (!existsSync(sessionsDir)) return []

  return readdirSync(sessionsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
}

function getSessionDisplay(tmuxSession: string): string {
  const meta = getSessionMeta(tmuxSession)
  if (!meta) return tmuxSession

  // Try to get fresh Claude info if we have a session ID
  if (meta.claudeSessionId) {
    const claudeInfo = getClaudeInfo(meta.claudeSessionId)
    if (claudeInfo) {
      meta.claudeSummary = claudeInfo.summary
      meta.gitBranch = claudeInfo.gitBranch
      saveSessionMeta(meta)
    }
  }

  const parts: string[] = []
  if (meta.claudeSummary) {
    const summary = meta.claudeSummary.length > 35
      ? meta.claudeSummary.slice(0, 35) + '...'
      : meta.claudeSummary
    parts.push(summary)
  }
  if (meta.gitBranch) {
    parts.push(`[${meta.gitBranch}]`)
  }

  return parts.length > 0 ? `${tmuxSession} (${parts.join(' ')})` : tmuxSession
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

function killSession(name: string): void {
  try {
    execSync(`tmux kill-session -t ${name}`, { encoding: 'utf8' })
    console.log(`Killed session: ${name}`)
  } catch {
    console.error(`Failed to kill session: ${name}`)
    process.exit(1)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Handle flags
  if (args.includes('-l') || args.includes('--list')) {
    listSessions()
    return
  }

  if (args.includes('-k') || args.includes('--kill')) {
    const idx = args.indexOf('-k') !== -1 ? args.indexOf('-k') : args.indexOf('--kill')
    const name = args[idx + 1]
    if (!name) {
      console.error('Usage: dev -k <session-name>')
      process.exit(1)
    }
    killSession(name)
    return
  }

  const forceNew = args.includes('-n') || args.includes('--new')

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
