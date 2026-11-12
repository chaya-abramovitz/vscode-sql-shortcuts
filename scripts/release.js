// Publishes a GitHub release for the current package.json version and attaches the installer.
// The installer is uploaded as "sql-shortcuts.vsix" so the README's
// .../releases/latest/download/sql-shortcuts.vsix link always gets the newest version.
//
// Usage: node scripts/release.js <notes.md>
// Needs: the .vsix built (npx @vscode/vsce package) and a GitHub login saved in Git (used by git push).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'chaya-abramovitz/vscode-sql-shortcuts';
const root = path.join(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
const vsix = path.join(root, `sql-shortcuts-${version}.vsix`);
const notes = fs.readFileSync(process.argv[2], 'utf8');
if (!fs.existsSync(vsix)) throw new Error(`build first: ${path.basename(vsix)} not found`);

// GitHub token from Git's credential store (never printed)
const cred = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n' }).toString();
const token = (cred.match(/^password=(.*)$/m) || [])[1];
if (!token) throw new Error('no GitHub login found in Git');

async function gh(method, url, body, headers = {}) {
  const res = await fetch(url.startsWith('http') ? url : 'https://api.github.com' + url, {
    method,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'sql-shortcuts-release', ...headers },
    body
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.split('?')[0]} -> ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

(async () => {
  const tag = 'v' + version;
  const existing = (await gh('GET', `/repos/${REPO}/releases?per_page=30`)).find(r => r.tag_name === tag);
  if (existing && !existing.draft) throw new Error(`${tag} is already published`);

  const fields = { tag_name: tag, target_commitish: 'main', name: 'SQL Shortcuts ' + version, body: notes, draft: true };
  const rel = existing
    ? await gh('PATCH', `/repos/${REPO}/releases/${existing.id}`, JSON.stringify(fields))
    : await gh('POST', `/repos/${REPO}/releases`, JSON.stringify(fields));
  for (const a of rel.assets || []) await gh('DELETE', `/repos/${REPO}/releases/assets/${a.id}`);

  const upload = rel.upload_url.replace(/\{.*\}$/, '') + '?name=sql-shortcuts.vsix';
  const asset = await gh('POST', upload, fs.readFileSync(vsix), { 'Content-Type': 'application/octet-stream' });
  const pub = await gh('PATCH', `/repos/${REPO}/releases/${rel.id}`, JSON.stringify({ draft: false, make_latest: 'true' }));

  console.log('published:', pub.html_url);
  console.log('installer:', asset.name, asset.size, 'bytes');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
