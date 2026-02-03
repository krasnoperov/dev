import * as p from '@clack/prompts'
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'

const cwd = process.cwd()
const dirName = basename(cwd).replace(/\./g, '-')
const home = homedir()
const sessionsDb = join(home, '.local/share/dev-sessions')
const claudeProjects = join(home, '.claude/projects')

interface SessionEntry {
  sessionId: string
  summary?: string
  gitBranch?: string
}

interface SessionsIndex {
  entries: SessionEntry[]
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

function getClaudeSummary(tmuxSession: string): string | null {
  const idFile = join(sessionsDb, tmuxSession)
  if (!existsSync(idFile)) return null

  const claudeId = readFileSync(idFile, 'utf8').trim()
  const projectPath = cwd.replace(/\//g, '-')
  const indexFile = join(claudeProjects, projectPath, 'sessions-index.json')

  if (!existsSync(indexFile)) return null

  try {
    const index: SessionsIndex = JSON.parse(readFileSync(indexFile, 'utf8'))
    const entry = index.entries.find(e => e.sessionId === claudeId)
    if (entry) {
      const summary = entry.summary?.slice(0, 40) || ''
      const branch = entry.gitBranch || ''
      return branch ? `${summary} [${branch}]` : summary
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function attachTmux(session: string): void {
  const child = spawn('tmux', ['attach', '-t', session], {
    stdio: 'inherit',
  })
  child.on('exit', code => process.exit(code || 0))
}

function newTmux(session: string): void {
  const child = spawn('tmux', ['new-session', '-s', session], {
    stdio: 'inherit',
  })
  child.on('exit', code => process.exit(code || 0))
}

function listSessions(): void {
  const sessions = getTmuxSessions()
  if (sessions.length === 0) {
    console.log(`No sessions for ${dirName}`)
    return
  }
  console.log(`Sessions in ${dirName}:`)
  for (const session of sessions) {
    const summary = getClaudeSummary(session)
    if (summary) {
      console.log(`  ${session} (${summary})`)
    } else {
      console.log(`  ${session}`)
    }
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

  mkdirSync(sessionsDb, { recursive: true })

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

  const options = sessions.map(s => ({
    value: s,
    label: s,
    hint: getClaudeSummary(s) || undefined,
  }))
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
