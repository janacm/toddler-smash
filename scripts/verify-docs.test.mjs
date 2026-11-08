import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { isAgentFile, isDocFile, verifyDocsUpdated } from './verify-docs.mjs'

const scriptPath = fileURLToPath(new URL('./verify-docs.mjs', import.meta.url))

test('isDocFile matches docs directory and README.md', () => {
  assert.equal(isDocFile('docs/requirements.md'), true)
  assert.equal(isDocFile('docs/grown-ups.md'), true)
  assert.equal(isDocFile('docs/desktop.md'), true)
  assert.equal(isDocFile('docs/playtesting.md'), true)
  assert.equal(isDocFile('README.md'), true)
  assert.equal(isDocFile('readme.md'), true)

  assert.equal(isDocFile('src/docs/something.ts'), false)
  assert.equal(isDocFile('docs.md'), false)
  assert.equal(isDocFile('docs/image.png'), false)
})

test('isAgentFile matches AGENTS.md and CLAUDE.md', () => {
  assert.equal(isAgentFile('AGENTS.md'), true)
  assert.equal(isAgentFile('CLAUDE.md'), true)
  assert.equal(isAgentFile('agents.md'), true)

  assert.equal(isAgentFile('src/AGENTS.md'), false)
  assert.equal(isAgentFile('AGENT.md'), false)
  assert.equal(isAgentFile('AGENTS.txt'), false)
})

test('verifyDocsUpdated passes when both docs and agent files are present', () => {
  const result = verifyDocsUpdated([
    'src/toys/ripple.ts',
    'docs/requirements.md',
    'AGENTS.md',
  ])
  assert.equal(result.ok, true)
  assert.equal(result.hasDocs, true)
  assert.equal(result.hasAgents, true)
  assert.equal(result.errors.length, 0)
  assert.deepEqual(result.docFiles, ['docs/requirements.md'])
  assert.deepEqual(result.agentFiles, ['AGENTS.md'])
})

test('verifyDocsUpdated fails when docs/ are missing', () => {
  const result = verifyDocsUpdated([
    'src/toys/ripple.ts',
    'AGENTS.md',
  ])
  assert.equal(result.ok, false)
  assert.equal(result.hasDocs, false)
  assert.equal(result.hasAgents, true)
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0], /Missing documentation update/)
})

test('verifyDocsUpdated fails when agent instructions are missing', () => {
  const result = verifyDocsUpdated([
    'src/toys/ripple.ts',
    'docs/requirements.md',
  ])
  assert.equal(result.ok, false)
  assert.equal(result.hasDocs, true)
  assert.equal(result.hasAgents, false)
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0], /Missing agent guidance update/)
})

test('verifyDocsUpdated fails when both docs and agent instructions are missing', () => {
  const result = verifyDocsUpdated([
    'src/toys/ripple.ts',
    'src/audio.ts',
  ])
  assert.equal(result.ok, false)
  assert.equal(result.hasDocs, false)
  assert.equal(result.hasAgents, false)
  assert.equal(result.errors.length, 2)
})

test('verifyDocsUpdated handles empty or non-array inputs gracefully', () => {
  assert.equal(verifyDocsUpdated([]).ok, true)
  assert.equal(verifyDocsUpdated(null).ok, true)
  assert.equal(verifyDocsUpdated(undefined).ok, true)
})

test('CLI verification succeeds with valid file arguments and exits zero', () => {
  const stdout = execFileSync(process.execPath, [
    scriptPath,
    'src/audio.ts',
    'docs/requirements.md',
    'AGENTS.md',
  ], { encoding: 'utf8' })
  assert.match(stdout, /Docs & agent guidance verified/)
})

test('CLI verification fails with invalid file arguments and exits non-zero', () => {
  assert.throws(
    () => {
      execFileSync(
        process.execPath,
        [scriptPath, 'src/audio.ts'],
        { encoding: 'utf8', stdio: 'pipe' },
      )
    },
    (err) => {
      assert.equal(err.status, 1)
      assert.match(err.stderr, /Documentation & agent guidelines verification failed/)
      return true
    },
  )
})
