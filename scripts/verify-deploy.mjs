// Verify the canonical site serves the exact artifact CI tested, including its
// worker and cache policy. No dependency installation or second build needed.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { appendFile, readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'

const origin = 'https://toddler-smash.netlify.app'
const directory = resolve(process.argv[2] ?? 'dist')
const files = (await readdir(directory, { recursive: true, withFileTypes: true }))
  .filter(file => file.isFile())
  .map(file => relative(directory, join(file.parentPath, file.name)))
assert(files.includes('version.json'), 'Build artifact is missing version.json')
assert(files.includes('sw.js'), 'Build artifact is missing sw.js')
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
// Netlify sometimes inserts this invisible promotional comment at its edge.
// Ignore only that exact comment format; all application HTML must still match.
const netlifyComment = /<!-- This site is hosted on Netlify\. Anyone can build and deploy a site\n     like this one for free: https:\/\/netlify\.new\/\?[^\n]*\n     Netlify hosting facts for this site: static\/SSR served via Netlify Edge\. -->\n?/

async function verify() {
  for (const file of files) {
    const response = await fetch(new URL(file, `${origin}/`), {
      cache: 'no-store', signal: AbortSignal.timeout(15_000),
    })
    assert(response.ok, `${file}: HTTP ${response.status}`)
    let bytes = Buffer.from(await response.arrayBuffer())
    if (file.endsWith('.html')) bytes = Buffer.from(bytes.toString('utf8').replace(netlifyComment, ''))
    assert.equal(digest(bytes),
      digest(await readFile(join(directory, file))), `${file}: published bytes differ`)
    if (file === 'version.json' || file === 'sw.js') {
      assert.match(response.headers.get('cache-control') ?? '', /no-store/, `${file}: cache policy`)
    }
    if (file === 'index.html') {
      assert.match(response.headers.get('cache-control') ?? '', /must-revalidate/, 'HTML cache policy')
    }
  }
}

// Allow the CDN a short propagation window, but fail CI if the release never
// becomes visible. Network errors must not turn a deploy into a false success.
for (let attempt = 0; ; attempt++) {
  try {
    await verify()
    break
  } catch (error) {
    if (attempt === 5) throw error
    console.log(`Waiting for published release: ${error.message}`)
    await setTimeout(5_000)
  }
}

const { buildId } = JSON.parse(await readFile(join(directory, 'version.json'), 'utf8'))
const message = `Published and verified ${files.length} files at ${origin}\n\nBuild: ${buildId}\n`
console.log(message)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, message)
