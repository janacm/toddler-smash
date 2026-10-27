// Netlify can insert this invisible comment immediately after the charset.
// Accept only the observed format and position, with a variable site UUID.
// Remove at most one comment; preserve every other byte for artifact hashing.
const promotionalComment = /(^[ \t]*<meta charset="utf-8" \/>\n)<!-- This site is hosted on Netlify\. Anyone can build and deploy a site\n     like this one for free: https:\/\/netlify\.new\/\?utm_campaign=loops&utm_source=ai-legible&utm_medium=owned&utm_content=comment&utm_id=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\n     Netlify hosting facts for this site: static\/SSR served via Netlify Edge\. -->\n/m

export function normalizePublishedHtml(html) {
  return html.replace(promotionalComment, '$1')
}
