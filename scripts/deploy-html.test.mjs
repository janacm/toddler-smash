import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizePublishedHtml } from './deploy-html.mjs'

const prefix = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n'
const suffix = '    <title>Toddler Smash</title>\n  </head>\n<body><script src="/assets/app.js"></script></body></html>\n'
const comment = `<!-- This site is hosted on Netlify. Anyone can build and deploy a site
     like this one for free: https://netlify.new/?utm_campaign=loops&utm_source=ai-legible&utm_medium=owned&utm_content=comment&utm_id=00000000-0000-0000-0000-000000000000
     Netlify hosting facts for this site: static/SSR served via Netlify Edge. -->
`
const original = prefix + suffix

test('accepts unchanged HTML with or without the one recognized comment', () => {
  assert.equal(normalizePublishedHtml(original), original)
  assert.equal(normalizePublishedHtml(prefix + comment + suffix), original)
})

test('preserves changed application markup so its artifact hash fails', () => {
  const changed = suffix.replace('app.js', 'other.js')
  assert.equal(normalizePublishedHtml(prefix + comment + changed), prefix + changed)
  assert.notEqual(normalizePublishedHtml(prefix + comment + changed), original)
})

test('does not hide injected markup, malformed comments, duplicates or moved comments', () => {
  const variants = [
    prefix + comment.replace('utm_id=', 'utm_id=--><script>alert(1)</script><!--') + suffix,
    prefix + comment.replace('utm_id=00000000', 'utm_id=unexpected') + suffix,
    prefix + comment.replace('https://netlify.new/', 'https://example.com/') + suffix,
    prefix + comment.replace('Netlify Edge.', 'different text.') + suffix,
    prefix + comment + comment + suffix,
    prefix + '\n' + comment + suffix,
    prefix + suffix + comment,
  ]
  for (const html of variants) {
    assert.notEqual(normalizePublishedHtml(html), original)
  }
})
