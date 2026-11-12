const vscode = require('vscode');
const crypto = require('crypto');

let panel;

// host: { getItems(): [{prefix, description, text, space}], save(item, originalPrefix), remove(prefix), openJson() }
function open(context, host) {
  if (panel) {
    panel.reveal();
    return;
  }
  panel = vscode.window.createWebviewPanel('sqlShortcutsEditor', 'SQL Shortcuts', vscode.ViewColumn.Active, {
    enableScripts: true,
    retainContextWhenHidden: true
  });
  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'bolt.svg');
  panel.webview.html = html(crypto.randomBytes(16).toString('hex'));

  panel.webview.onDidReceiveMessage(async msg => {
    try {
      if (msg.type === 'ready') refresh();
      else if (msg.type === 'save') {
        const err = await host.save(msg.item, msg.originalPrefix);
        if (err) post({ type: 'error', message: err });
        else refresh(msg.item.prefix, 'Saved — ready to use');
      } else if (msg.type === 'delete') {
        const ok = await vscode.window.showWarningMessage(`Delete the shortcut "${msg.prefix}"?`, { modal: true }, 'Delete');
        if (ok === 'Delete') {
          await host.remove(msg.prefix);
          refresh(null, `Deleted ${msg.prefix}`);
        }
      } else if (msg.type === 'openJson') host.openJson();
    } catch (e) {
      post({ type: 'error', message: e.message });
    }
  }, null, context.subscriptions);

  panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);

  function refresh(select, status) {
    post({ type: 'data', items: host.getItems(), select, status });
  }
  open.refresh = refresh;
}

function post(msg) {
  if (panel) panel.webview.postMessage(msg);
}

// called when the file changes outside the panel
function refreshIfOpen() {
  if (panel && open.refresh) open.refresh();
}

function html(nonce) {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style nonce="${nonce}">
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; height: 100vh; display: flex;
    font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
    color: var(--vscode-foreground); background: var(--vscode-editor-background);
  }
  .side {
    width: 300px; min-width: 220px; display: flex; flex-direction: column;
    border-right: 1px solid var(--vscode-panel-border, var(--vscode-widget-border, #8884));
  }
  .side-head { padding: 12px; display: flex; gap: 8px; }
  input, textarea {
    font: inherit; color: var(--vscode-input-foreground); background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; padding: 5px 8px; width: 100%;
  }
  input:focus, textarea:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
  textarea {
    font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size);
    min-height: 200px; resize: vertical; tab-size: 4; line-height: 1.5;
  }
  button {
    font: inherit; border: none; border-radius: 2px; padding: 5px 12px; cursor: pointer; white-space: nowrap;
    color: var(--vscode-button-foreground); background: var(--vscode-button-background);
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
  button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button.danger { background: transparent; color: var(--vscode-errorForeground); border: 1px solid currentColor; }
  button.link { background: none; color: var(--vscode-textLink-foreground); padding: 0; }
  button.link:hover { text-decoration: underline; background: none; }
  .count { padding: 0 12px 6px; opacity: .7; font-size: .9em; }
  ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
  li { padding: 6px 12px; cursor: pointer; display: flex; gap: 10px; align-items: baseline; }
  li:hover { background: var(--vscode-list-hoverBackground); }
  li.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  li .p { font-family: var(--vscode-editor-font-family); font-weight: 600; min-width: 56px; }
  li .d { opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  main { flex: 1; overflow-y: auto; padding: 20px 28px; }
  .form { max-width: 760px; display: flex; flex-direction: column; gap: 16px; }
  h1 { font-size: 1.4em; font-weight: 600; margin: 0; }
  label { display: block; font-weight: 600; margin-bottom: 5px; }
  .row { display: flex; gap: 16px; }
  .row > div:first-child { width: 160px; flex: none; }
  .row > div:last-child { flex: 1; }
  .hint { opacity: .75; font-size: .9em; margin-top: 5px; line-height: 1.5; }
  code, .tok {
    font-family: var(--vscode-editor-font-family);
    background: var(--vscode-textCodeBlock-background, #8882); border-radius: 3px; padding: 0 4px;
  }
  .tools { display: flex; gap: 8px; margin-top: 6px; }
  .preview {
    font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size);
    white-space: pre-wrap; padding: 10px 12px; border-radius: 3px; line-height: 1.5; min-height: 2.5em;
    background: var(--vscode-textCodeBlock-background, #8881);
    border: 1px solid var(--vscode-widget-border, #8883);
  }
  .ph { background: var(--vscode-editor-findMatchHighlightBackground, #ea05); border-radius: 2px; padding: 0 2px; }
  .cur { display: inline-block; width: 2px; height: 1.1em; vertical-align: text-bottom; background: var(--vscode-editorCursor-foreground, currentColor); }
  .check { display: flex; gap: 8px; align-items: center; font-weight: normal; }
  .check input { width: auto; }
  .actions { display: flex; gap: 8px; align-items: center; }
  .spacer { flex: 1; }
  .status { min-height: 1.4em; }
  .status.ok { color: var(--vscode-testing-iconPassed, #3a3); }
  .status.err { color: var(--vscode-errorForeground); }
  @media (max-width: 640px) { body { flex-direction: column; } .side { width: auto; height: 40vh; border-right: none; } .row { flex-direction: column; } .row > div:first-child { width: auto; } }
</style>
</head>
<body>
  <aside class="side">
    <div class="side-head">
      <input id="search" placeholder="Search shortcuts…">
      <button id="new" title="Add a new shortcut">+ New</button>
    </div>
    <div class="count" id="count"></div>
    <ul id="list"></ul>
  </aside>
  <main>
    <div class="form">
      <h1 id="title">New shortcut</h1>
      <div class="row">
        <div>
          <label for="prefix">Shortcut</label>
          <input id="prefix" placeholder="e.g. ssf" spellcheck="false" autocomplete="off">
          <div class="hint">What you type, then Tab or Space.</div>
        </div>
        <div>
          <label for="desc">Description</label>
          <input id="desc" placeholder="e.g. SELECT * FROM">
        </div>
      </div>
      <div>
        <label for="text">Expands to</label>
        <textarea id="text" spellcheck="false" placeholder="SELECT * FROM {table}"></textarea>
        <div class="tools">
          <button class="secondary" id="addPh" title="Insert a fill-in spot">+ Fill-in spot</button>
          <button class="secondary" id="addCur" title="Where the cursor lands when you're done">+ Cursor ends here</button>
        </div>
        <div class="hint">
          Put a fill-in spot in curly braces, like <code>{table}</code>. After the shortcut expands, Tab jumps from one spot to the next.
          The same name used twice is typed once and fills in both places. <code>{cursor}</code> is where the cursor ends up.
        </div>
      </div>
      <div>
        <label>Preview</label>
        <div class="preview" id="preview"></div>
      </div>
      <label class="check"><input type="checkbox" id="space"> Also expand when I press Space (not just Tab)</label>
      <div class="actions">
        <button id="save">Save</button>
        <button class="secondary" id="cancel">Discard changes</button>
        <span class="status" id="status"></span>
        <span class="spacer"></span>
        <button class="danger" id="delete">Delete</button>
      </div>
      <div class="hint"><button class="link" id="json">Open the raw file</button> · Ctrl+S saves</div>
    </div>
  </main>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = id => document.getElementById(id);
  let items = [];
  let current = null; // original prefix of the shortcut being edited, null for new
  let filter = '';

  function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function renderList() {
    const f = filter.toLowerCase();
    const shown = items.filter(i => !f || i.prefix.toLowerCase().includes(f) || (i.description || '').toLowerCase().includes(f) || i.text.toLowerCase().includes(f));
    $('count').textContent = shown.length === items.length ? items.length + ' shortcuts' : shown.length + ' of ' + items.length;
    $('list').innerHTML = shown.map(i =>
      '<li data-p="' + esc(i.prefix) + '" class="' + (i.prefix === current ? 'active' : '') + '"><span class="p">' + esc(i.prefix) + '</span><span class="d">' + esc(i.description || '') + '</span></li>'
    ).join('');
  }

  function renderPreview() {
    const t = $('text').value;
    let out = '', last = 0, m;
    const re = /\\{([^{}\\n]+)\\}/g;
    while ((m = re.exec(t))) {
      out += esc(t.slice(last, m.index));
      last = re.lastIndex;
      out += m[1].trim().toLowerCase() === 'cursor' ? '<span class="cur" title="cursor ends here"></span>' : '<span class="ph">' + esc(m[1]) + '</span>';
    }
    out += esc(t.slice(last));
    $('preview').innerHTML = out || '<span style="opacity:.5">Type what the shortcut expands to</span>';
  }

  function load(item) {
    current = item ? item.prefix : null;
    $('title').textContent = item ? 'Edit shortcut' : 'New shortcut';
    $('prefix').value = item ? item.prefix : '';
    $('desc').value = item ? item.description || '' : '';
    $('text').value = item ? item.text : '';
    $('space').checked = item ? item.space : true;
    $('delete').style.visibility = item ? 'visible' : 'hidden';
    setStatus('');
    renderList();
    renderPreview();
  }

  function setStatus(text, kind) {
    $('status').textContent = text;
    $('status').className = 'status ' + (kind || '');
  }

  function insert(text, selectFrom, selectTo) {
    const ta = $('text');
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(text, s, e, 'end');
    if (selectFrom != null) ta.setSelectionRange(s + selectFrom, s + selectTo);
    ta.focus();
    renderPreview();
  }

  function save() {
    const item = { prefix: $('prefix').value.trim(), description: $('desc').value.trim(), text: $('text').value, space: $('space').checked };
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(item.prefix)) return setStatus('The shortcut must start with a letter and contain only letters, numbers or _.', 'err');
    if (!item.text.trim()) return setStatus('Type what the shortcut expands to.', 'err');
    if (item.prefix !== current && items.some(i => i.prefix === item.prefix)) return setStatus('"' + item.prefix + '" already exists.', 'err');
    setStatus('Saving…');
    vscode.postMessage({ type: 'save', item, originalPrefix: current });
  }

  $('list').addEventListener('click', e => {
    const li = e.target.closest('li');
    if (li) load(items.find(i => i.prefix === li.dataset.p));
  });
  $('search').addEventListener('input', e => { filter = e.target.value; renderList(); });
  $('new').addEventListener('click', () => { load(null); $('prefix').focus(); });
  $('text').addEventListener('input', renderPreview);
  $('text').addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); insert('\\t'); }
  });
  $('addPh').addEventListener('click', () => insert('{name}', 1, 5));
  $('addCur').addEventListener('click', () => insert('{cursor}'));
  $('save').addEventListener('click', save);
  $('cancel').addEventListener('click', () => load(items.find(i => i.prefix === current) || null));
  $('delete').addEventListener('click', () => current && vscode.postMessage({ type: 'delete', prefix: current }));
  $('json').addEventListener('click', () => vscode.postMessage({ type: 'openJson' }));
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'data') {
      items = msg.items;
      const keep = msg.select !== undefined ? msg.select : current;
      const item = items.find(i => i.prefix === keep);
      if (item) load(item); else if (!current || msg.select === null) load(items[0] || null); else renderList();
      if (msg.status) setStatus(msg.status, 'ok');
    } else if (msg.type === 'error') setStatus(msg.message, 'err');
  });

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}

module.exports = { open, refreshIfOpen, _html: html };
