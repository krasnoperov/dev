import { spawn } from 'node:child_process'

function usage(): void {
  console.log(`Usage: rdev <host> [project] [options]

Arguments:
  host      SSH host (e.g., h1, dev-server)
  project   Project name (creates ~/projects/<project> if needed)

Options:
  -n, --new   Force create new session (skip picker)
  -h, --help  Show this help

Examples:
  rdev h1 subtitles      # SSH → ~/projects/subtitles → dev
  rdev h1 subtitles -n   # SSH → new session, skip picker
  rdev h1                # SSH to host (plain)
`)
}

function ssh(host: string, command?: string): void {
  const args = command ? [host, '-t', command] : [host]

  const child = spawn('ssh', args, { stdio: 'inherit' })
  child.on('exit', code => process.exit(code || 0))
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.includes('-h') || args.includes('--help')) {
    usage()
    return
  }

  const host = args.find(a => !a.startsWith('-'))
  const project = args.filter(a => !a.startsWith('-'))[1]
  const forceNew = args.includes('-n') || args.includes('--new')

  if (!host) {
    usage()
    process.exit(1)
  }

  if (project) {
    const devArgs = forceNew ? ' -n' : ''
    const command = `mkdir -p ~/projects/${project} && cd ~/projects/${project} && exec dev${devArgs}`
    ssh(host, command)
  } else {
    // Plain SSH
    ssh(host)
  }
}

main()
