import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Check if path represents repository documentation. */
export function isDocFile(path) {
  return /^docs\/.*\.(md|txt)$/i.test(path) || /^README\.md$/i.test(path)
}

/** Check if path represents agent instructions. */
export function isAgentFile(path) {
  return /^(AGENTS\.md|CLAUDE\.md)$/i.test(path)
}

/**
 * Verify that a list of changed files includes both documentation updates
 * (docs/* or README.md) and agent guidance updates (AGENTS.md or CLAUDE.md).
 */
export function verifyDocsUpdated(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      ok: true,
      hasDocs: false,
      hasAgents: false,
      docFiles: [],
      agentFiles: [],
      errors: [],
      message: 'No files changed.',
    }
  }

  const docFiles = files.filter(isDocFile)
  const agentFiles = files.filter(isAgentFile)
  const hasDocs = docFiles.length > 0
  const hasAgents = agentFiles.length > 0
  const errors = []

  if (!hasDocs) {
    errors.push(
      'Missing documentation update: pull requests must update at least one file in docs/ (e.g. docs/requirements.md) or README.md.',
    )
  }
  if (!hasAgents) {
    errors.push(
      'Missing agent guidance update: pull requests must update AGENTS.md or CLAUDE.md with relevant agent instructions.',
    )
  }

  return {
    ok: errors.length === 0,
    hasDocs,
    hasAgents,
    docFiles,
    agentFiles,
    errors,
  }
}

/** Retrieve changed files from CLI args or git diff against target base. */
export function getChangedFiles(baseRef) {
  const cliArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))
  if (cliArgs.length > 0) {
    return cliArgs
  }

  const baseName = baseRef || process.env.GITHUB_BASE_REF || 'main'
  const candidateTargets = [
    `origin/${baseName}`,
    baseName,
    'origin/main',
    'main',
  ]

  for (const target of candidateTargets) {
    try {
      const output = execSync(`git diff --name-only ${target}...HEAD`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
      return output ? output.split('\n').map((s) => s.trim()).filter(Boolean) : []
    } catch {
      // Try next candidate target
    }
  }

  try {
    const output = execSync('git diff --name-only HEAD~1', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
    return output ? output.split('\n').map((s) => s.trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

// When run directly as a CLI script
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isMain) {
  const files = getChangedFiles()
  const result = verifyDocsUpdated(files)

  if (!result.ok) {
    const errorText = [
      '❌ Documentation & agent guidelines verification failed for pull request:\n',
      ...result.errors.map((e) => `  - ${e}`),
      '\nChanged files detected in this PR:',
      ...files.map((f) => `  • ${f}`),
      '\nEvery pull request must update both docs/ (e.g. docs/requirements.md) and AGENTS.md/CLAUDE.md.',
    ].join('\n')

    console.error(errorText)
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, `### ❌ PR Docs & Agent Guidelines Check\n\n${result.errors.join('\n\n')}\n`)
    }
    process.exit(1)
  }

  const successText = `✅ Docs & agent guidance verified: updated docs (${result.docFiles.join(', ') || 'none'}) and agent files (${result.agentFiles.join(', ') || 'none'}).`
  console.log(successText)
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `### ✅ PR Docs & Agent Guidelines Check\n\n${successText}\n`)
  }
}
