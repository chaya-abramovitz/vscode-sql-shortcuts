// The visual shortcut editor: a webview with the shortcut list on the left and, on the right,
// either the edit form or the Settings page.
// The extension passes a `host` with getItems, save, remove, openJson, importShortcuts, exportShortcuts,
// getSettings and setSetting.

const vscode = require('vscode');
const crypto = require('crypto');

let panel;
let refresh;

function open(context, host, view = 'edit') {
  if (panel) {
    panel.reveal();
    post({ type: 'show', view });
    return;
  }
  panel = vscode.window.createWebviewPanel('sqlShortcutsEditor', 'SQL Shortcuts', vscode.ViewColumn.Active, {
    enableScripts: true,
    retainContextWhenHidden: true
  });
  panel.iconPath = {
    light: vscode.Uri.joinPath(context.extensionUri, 'media', 'key-light.svg'),
    dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'key-dark.svg')
  };
  panel.webview.html = html(crypto.randomBytes(16).toString('hex'));

  refresh = (select, status) => post({ type: 'data', items: host.getItems(), settings: host.getSettings(), select, status });

  panel.webview.onDidReceiveMessage(async msg => {
    try {
      switch (msg.type) {
        case 'ready':
          refresh();
          if (view !== 'edit') post({ type: 'show', view });
          break;
        case 'setSetting':
          await host.setSetting(msg.key, msg.value); // the config change triggers a refresh
          break;
        case 'save': {
          const err = await host.save(msg.item, msg.originalPrefix);
          if (err) post({ type: 'error', message: err });
          else refresh(msg.item.prefix, 'Saved. Ready to use.');
          break;
        }
        case 'delete': {
          const ok = await vscode.window.showWarningMessage(`Delete the shortcut "${msg.prefix}"?`, { modal: true }, 'Delete');
          if (ok === 'Delete') {
            await host.remove(msg.prefix);
            refresh(null, `Deleted "${msg.prefix}".`);
          }
          break;
        }
        case 'openJson': host.openJson(); break;
        case 'import': await host.importShortcuts(); break;
        case 'export': await host.exportShortcuts(); break;
      }
    } catch (e) {
      post({ type: 'error', message: e.message });
    }
  }, null, context.subscriptions);

  panel.onDidDispose(() => { panel = undefined; refresh = undefined; }, null, context.subscriptions);
}

function post(msg) {
  if (panel) panel.webview.postMessage(msg);
}

// Called when the shortcuts change outside the panel.
function refreshIfOpen() {
  if (refresh) refresh();
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
  .side-foot { padding: 10px 12px; display: flex; gap: 14px; border-top: 1px solid var(--vscode-panel-border, #8884); }
  input, textarea {
    font: inherit; color: var(--vscode-input-foreground); background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; padding: 5px 8px; width: 100%;
  }
  input:focus, textarea:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
  textarea {
    font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size);
    min-height: 180px; resize: vertical; tab-size: 4; line-height: 1.5;
  }
  button {
    font: inherit; border: none; border-radius: 2px; padding: 5px 12px; cursor: pointer; white-space: nowrap;
    color: var(--vscode-button-foreground); background: var(--vscode-button-background);
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button:disabled { opacity: .5; cursor: default; }
  button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
  button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button.danger { background: transparent; color: var(--vscode-errorForeground); border: 1px solid currentColor; }
  button.link { background: none; color: var(--vscode-textLink-foreground); padding: 0; }
  button.link:hover { text-decoration: underline; background: none; }
  [hidden] { display: none !important; }
  .count { padding: 0 12px 6px; opacity: .7; font-size: .9em; }
  ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
  li { padding: 6px 12px; cursor: pointer; display: flex; gap: 10px; align-items: baseline; }
  li:hover { background: var(--vscode-list-hoverBackground); }
  li.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  li .p { font-family: var(--vscode-editor-font-family); font-weight: 600; min-width: 56px; }
  li .d { opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty { padding: 12px; opacity: .7; }
  main { flex: 1; overflow-y: auto; padding: 20px 28px; }
  .form { max-width: 760px; display: flex; flex-direction: column; gap: 16px; }
  h1 { font-size: 1.4em; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vscode-editorWarning-foreground, #cca700); display: none; }
  .dirty .dot { display: inline-block; }
  label { display: block; font-weight: 600; margin-bottom: 5px; }
  .row { display: flex; gap: 16px; }
  .row > div:first-child { width: 160px; flex: none; }
  .row > div:last-child { flex: 1; }
  .hint { opacity: .75; font-size: .9em; margin-top: 5px; line-height: 1.5; }
  .warn { color: var(--vscode-editorWarning-foreground, #cca700); font-size: .9em; margin-top: 6px; line-height: 1.5; }
  code {
    font-family: var(--vscode-editor-font-family);
    background: var(--vscode-textCodeBlock-background, #8882); border-radius: 3px; padding: 0 4px;
  }
  .tools { display: flex; gap: 8px; margin-top: 6px; }
  .preview {
    font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size);
    white-space: pre-wrap; padding: 10px 12px; border-radius: 3px; line-height: 1.5; min-height: 2.5em;
    background: var(--vscode-textCodeBlock-background, #8881); border: 1px solid var(--vscode-widget-border, #8883);
  }
  .ph { background: var(--vscode-editor-findMatchHighlightBackground, #ea05); border-radius: 2px; padding: 0 2px; }
  .ph.empty { display: inline-block; min-width: 1.6em; height: 1.1em; vertical-align: text-bottom; font-size: .75em; text-align: center; }
  .cur { display: inline-block; width: 2px; height: 1.1em; vertical-align: text-bottom; background: var(--vscode-editorCursor-foreground, currentColor); }
  .check { display: flex; gap: 8px; align-items: center; font-weight: normal; margin: 0; }
  .check input { width: auto; }
  .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .spacer { flex: 1; }
  .status { min-height: 1.4em; }
  .status.ok { color: var(--vscode-testing-iconPassed, #3a3); }
  .status.err { color: var(--vscode-errorForeground); }
  .confirm {
    gap: 8px; align-items: center; flex-wrap: wrap; padding: 10px 12px; border-radius: 3px; display: flex;
    background: var(--vscode-inputValidation-warningBackground, #5a4a00); border: 1px solid var(--vscode-inputValidation-warningBorder, #b89500);
  }
  .keys { opacity: .6; font-size: .85em; }
  .side-foot button.on { text-decoration: underline; }
  section { display: flex; flex-direction: column; gap: 8px; }
  section > .heading { font-weight: 600; }
  .opts { display: flex; gap: 20px; flex-wrap: wrap; }
  .opts.col { flex-direction: column; gap: 8px; }
  .opts .check { display: block; line-height: 1.9; padding-left: 24px; text-indent: -24px; }
  .opts .check input { width: 16px; margin: 0 8px 0 0; vertical-align: middle; }
  .check code { margin-left: 4px; white-space: nowrap; }
  .sample { display: grid; grid-template-columns: 64px 1fr; gap: 10px; align-items: start; }
  .sample .typed { font-family: var(--vscode-editor-font-family); padding-top: 10px; }
  @media (max-width: 640px) { body { flex-direction: column; } .side { width: auto; height: 40vh; border-right: none; } .row { flex-direction: column; } .row > div:first-child { width: auto; } }
</style>
</head>
<body>
  <aside class="side">
    <div class="side-head">
      <input id="search" placeholder="Search (Ctrl+F)" aria-label="Search shortcuts">
      <button id="new" title="Add a shortcut (Ctrl+N)">+ New</button>
    </div>
    <div class="count" id="count"></div>
    <ul id="list" tabindex="0" role="listbox" aria-label="Shortcuts"></ul>
    <div class="side-foot">
      <button class="link" id="settingsLink" title="Tab/Space, keyword case, layout and more">Settings</button>
      <button class="link" id="import" title="Add shortcuts from a JSON file">Import</button>
      <button class="link" id="export" title="Save all shortcuts to a JSON file">Export</button>
      <button class="link" id="json" title="Open the shortcuts file as JSON">Edit as JSON</button>
    </div>
  </aside>
  <main>
    <div class="form" id="editView">
      <h1 id="titleWrap"><span id="title">New shortcut</span><span class="dot" title="Unsaved changes"></span></h1>

      <div class="confirm" id="confirm" hidden>
        <span id="confirmText">You have unsaved changes.</span>
        <span class="spacer"></span>
        <button id="confirmSave">Save</button>
        <button class="secondary" id="confirmDiscard">Discard</button>
        <button class="secondary" id="confirmCancel">Keep editing</button>
      </div>

      <div class="row">
        <div>
          <label for="prefix">Shortcut</label>
          <input id="prefix" placeholder="e.g. ssf" spellcheck="false" autocomplete="off">
        </div>
        <div>
          <label for="desc">Description</label>
          <input id="desc" placeholder="e.g. SELECT * FROM">
        </div>
      </div>

      <div>
        <label for="text">Expands to</label>
        <textarea id="text" spellcheck="false" placeholder="SELECT *&#10;FROM {cursor}"></textarea>
        <div class="tools">
          <button class="secondary" id="addPh" title="Insert a spot to fill in">+ Fill-in spot</button>
          <button class="secondary" id="addCur" title="Where the cursor goes when you're done">+ Cursor position</button>
        </div>
        <div class="hint">
          <code>{}</code> is an empty spot to type in. Tab moves to the next one. <code>{cursor}</code> is where the cursor ends up.<br>
          Same value in two places? Use a number in both, e.g. <code>{1}</code>. <code>{text}</code> starts with that text selected.
        </div>
      </div>

      <div>
        <label>Preview</label>
        <div class="preview" id="preview"></div>
      </div>

      <div>
        <label class="check"><input type="checkbox" id="space"> Expand on Space as well as Tab</label>
        <div class="warn" id="wordWarn" hidden></div>
      </div>

      <div class="actions">
        <button id="save" title="Save (Ctrl+S)">Save</button>
        <button class="secondary" id="cancel">Discard changes</button>
        <button class="secondary" id="dup" title="Copy this shortcut into a new one">Duplicate</button>
        <span class="status" id="status" role="status"></span>
        <span class="spacer"></span>
        <button class="danger" id="delete">Delete</button>
      </div>
      <div class="keys">Ctrl+S save · Ctrl+N new · Ctrl+F search · ↑ ↓ move through the list</div>
    </div>

    <div class="form" id="settingsView" hidden>
      <h1>Settings</h1>

      <section>
        <div class="heading">Expand a shortcut when I press</div>
        <div class="opts">
          <label class="check"><input type="checkbox" data-key="expandOnTab"> Tab</label>
          <label class="check"><input type="checkbox" data-key="expandOnSpace"> Space</label>
        </div>
        <div class="warn" id="trigWarn" hidden>Neither is on, so typing a shortcut does nothing. You can still right-click → Insert Shortcut…</div>
      </section>

      <section>
        <div class="heading">Keyword case</div>
        <div class="opts col">
          <label class="check"><input type="radio" name="keywordCase" value="upper"> UPPERCASE <code>SELECT * FROM</code></label>
          <label class="check"><input type="radio" name="keywordCase" value="lower"> lowercase <code>select * from</code></label>
          <label class="check"><input type="radio" name="keywordCase" value="match"> Match how I type the shortcut: <code>SSF</code> → <code>SELECT</code>, <code>ssf</code> → <code>select</code></label>
        </div>
      </section>

      <section>
        <div class="heading">Layout</div>
        <div class="opts col">
          <label class="check"><input type="radio" name="layout" value="multiLine"> Each clause on its own line</label>
          <label class="check"><input type="radio" name="layout" value="compact"> Short queries on one line</label>
        </div>
      </section>

      <section>
        <div class="heading">Other</div>
        <div class="opts col">
          <label class="check"><input type="checkbox" data-key="semicolons"> End statements with a semicolon <code>;</code></label>
          <label class="check"><input type="checkbox" data-key="showInSuggestions"> Show shortcuts in VS Code's suggestion pop-up</label>
          <label class="check"><input type="checkbox" data-key="showStatusBar"> Show the Shortcuts button in the status bar</label>
        </div>
      </section>

      <section>
        <div class="heading">Preview</div>
        <div id="samples"></div>
      </section>

      <div class="hint">Changes apply right away. They're also in VS Code's Settings under "SQL Shortcuts".</div>
    </div>
  </main>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = id => document.getElementById(id);

  // Words often typed in SQL as keywords or aliases; expanding them on Space would get in the way.
  const SQL_WORDS = new Set(['a','b','c','t','x','id','t1','t2','as','at','by','go','if','in','is','of','on','or','to','add','all','and','any','asc','end','for','key','not','set','top','use','case','date','desc','drop','else','exec','from','into','join','left','like','name','null','over','then','type','when','with','cte','rn','dt','ct','ex','pk','fk']);

  let items = [];
  let current = null;    // prefix of the shortcut being edited; null for a new one
  let snapshot = '';     // form state when loaded, to detect unsaved changes
  let pending = null;    // action waiting on the unsaved-changes prompt
  let afterSave = null;  // action to run once a save started from that prompt succeeds
  let filter = '';
  let started = false;   // first list received

  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const formState = () => JSON.stringify([$('prefix').value, $('desc').value, $('text').value, $('space').checked]);
  const isDirty = () => formState() !== snapshot;

  function shown() {
    const f = filter.toLowerCase();
    return items.filter(i => !f || i.prefix.toLowerCase().includes(f) || (i.description || '').toLowerCase().includes(f) || i.text.toLowerCase().includes(f));
  }

  function renderList() {
    const list = shown();
    $('count').textContent = list.length === items.length ? items.length + ' shortcuts' : list.length + ' of ' + items.length;
    $('list').innerHTML = list.length
      ? list.map(i =>
          '<li role="option" data-p="' + esc(i.prefix) + '" class="' + (i.prefix === current ? 'active' : '') + '" aria-selected="' + (i.prefix === current) + '">' +
          '<span class="p">' + esc(i.prefix) + '</span><span class="d">' + esc(i.description || '') + '</span></li>').join('')
      : '<div class="empty">No shortcuts match.</div>';
    const active = $('list').querySelector('.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  // Shows {} spots, {text} spots and {cursor} from the editor syntax as highlighted HTML.
  function previewHtml(t) {
    let out = '', last = 0, m;
    const re = /\\{([^{}\\n]*)\\}/g;
    while ((m = re.exec(t))) {
      out += esc(t.slice(last, m.index));
      last = re.lastIndex;
      const tok = m[1].trim();
      if (tok.toLowerCase() === 'cursor') out += '<span class="cur" title="Cursor ends here"></span>';
      else if (tok === '' || /^[1-9]\\d*$/.test(tok)) out += '<span class="ph empty" title="Empty spot to fill in">' + esc(tok) + '</span>';
      else out += '<span class="ph">' + esc(tok) + '</span>';
    }
    return out + esc(t.slice(last));
  }

  function renderPreview() {
    $('preview').innerHTML = previewHtml($('text').value) || '<span style="opacity:.5">Type what the shortcut expands to.</span>';
  }

  // ----- Settings page -----
  let view = 'edit';

  function showView(name) {
    view = name;
    $('editView').hidden = name !== 'edit';
    $('settingsView').hidden = name !== 'settings';
    $('settingsLink').classList.toggle('on', name === 'settings');
  }

  function renderSettings(s) {
    if (!s) return;
    document.querySelectorAll('#settingsView [data-key]').forEach(el => { el.checked = !!s.values[el.dataset.key]; });
    document.querySelectorAll('#settingsView input[type=radio]').forEach(el => { el.checked = s.values[el.name] === el.value; });
    $('trigWarn').hidden = s.values.expandOnTab || s.values.expandOnSpace;
    $('samples').innerHTML = s.samples.map(x =>
      '<div class="sample"><span class="typed">' + esc(x.typed) + ' →</span><div class="preview">' + previewHtml(x.text) + '</div></div>').join('');
  }

  document.querySelectorAll('#settingsView input').forEach(el => el.addEventListener('change', () => {
    if (el.type === 'radio') vscode.postMessage({ type: 'setSetting', key: el.name, value: el.value });
    else vscode.postMessage({ type: 'setSetting', key: el.dataset.key, value: el.checked });
  }));
  $('settingsLink').addEventListener('click', () => showView(view === 'settings' ? 'edit' : 'settings'));

  function renderState() {
    const dirty = isDirty();
    $('titleWrap').classList.toggle('dirty', dirty);
    $('save').disabled = !dirty;
    $('cancel').disabled = !dirty;
    const p = $('prefix').value.trim().toLowerCase();
    const warn = $('space').checked && SQL_WORDS.has(p);
    $('wordWarn').hidden = !warn;
    if (warn) $('wordWarn').textContent = '"' + p + '" is also a common SQL word or alias, so typing it followed by a space will expand it. Consider unticking this.';
  }

  function load(item) {
    current = item ? item.prefix : null;
    $('title').textContent = item ? 'Edit shortcut' : 'New shortcut';
    $('prefix').value = item ? item.prefix : '';
    $('desc').value = item ? item.description || '' : '';
    $('text').value = item ? item.text : '';
    $('space').checked = item ? item.space : true;
    $('delete').hidden = !item;
    $('dup').hidden = !item;
    snapshot = formState();
    hideConfirm();
    setStatus('');
    renderList();
    renderPreview();
    renderState();
  }

  // Runs action now, or after asking what to do with unsaved changes.
  function guard(action) {
    if (!isDirty()) return action();
    pending = action;
    $('confirmText').textContent = 'You have unsaved changes' + (current ? ' to "' + current + '"' : '') + '.';
    $('confirm').hidden = false;
  }
  function hideConfirm() { pending = null; $('confirm').hidden = true; }

  function setStatus(text, kind) {
    $('status').textContent = text;
    $('status').className = 'status ' + (kind || '');
  }

  function insert(text, selectFrom, selectTo) {
    const ta = $('text');
    const s = ta.selectionStart;
    ta.setRangeText(text, s, ta.selectionEnd, 'end');
    if (selectFrom != null) ta.setSelectionRange(s + selectFrom, s + selectTo);
    ta.focus();
    renderPreview();
    renderState();
  }

  function save() {
    const item = { prefix: $('prefix').value.trim(), description: $('desc').value.trim(), text: $('text').value, space: $('space').checked };
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(item.prefix)) { setStatus('The shortcut must start with a letter and use only letters, numbers or _.', 'err'); $('prefix').focus(); return false; }
    if (!item.text.trim()) { setStatus('Type what the shortcut expands to.', 'err'); $('text').focus(); return false; }
    const lower = item.prefix.toLowerCase();
    if (lower !== (current || '').toLowerCase() && items.some(i => i.prefix.toLowerCase() === lower)) { setStatus('"' + item.prefix + '" already exists.', 'err'); $('prefix').focus(); return false; }
    setStatus('Saving…');
    vscode.postMessage({ type: 'save', item, originalPrefix: current });
    return true;
  }

  function newShortcut() { guard(() => { load(null); showView('edit'); $('prefix').focus(); }); }

  function moveSelection(delta) {
    const list = shown();
    if (!list.length) return;
    let i = list.findIndex(x => x.prefix === current);
    i = i < 0 ? 0 : Math.max(0, Math.min(list.length - 1, i + delta));
    if (list[i].prefix !== current) guard(() => load(list[i]));
  }

  function arrowKeys(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); moveSelection(e.key === 'ArrowDown' ? 1 : -1); }
  }

  // ----- events -----
  $('list').addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    if (li.dataset.p === current) showView('edit');
    else guard(() => { load(items.find(i => i.prefix === li.dataset.p)); showView('edit'); });
  });
  $('list').addEventListener('keydown', arrowKeys);
  $('search').addEventListener('input', e => { filter = e.target.value; renderList(); });
  $('search').addEventListener('keydown', e => {
    arrowKeys(e);
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = shown()[0];
      if (first && first.prefix !== current) guard(() => load(first));
    } else if (e.key === 'Escape' && filter) { filter = e.target.value = ''; renderList(); }
  });
  ['prefix', 'desc'].forEach(id => $(id).addEventListener('input', renderState));
  $('space').addEventListener('change', renderState);
  $('text').addEventListener('input', () => { renderPreview(); renderState(); });
  $('text').addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); insert('\\t'); }
  });
  $('new').addEventListener('click', newShortcut);
  $('addPh').addEventListener('click', () => insert('{}'));
  $('addCur').addEventListener('click', () => insert('{cursor}'));
  $('save').addEventListener('click', save);
  $('cancel').addEventListener('click', () => load(items.find(i => i.prefix === current) || null));
  $('dup').addEventListener('click', () => {
    const base = $('prefix').value.trim();
    let name = base + '2';
    for (let n = 3; items.some(i => i.prefix.toLowerCase() === name.toLowerCase()); n++) name = base + n;
    const copy = { desc: $('desc').value, text: $('text').value, space: $('space').checked };
    guard(() => {
      load(null);
      $('prefix').value = name; $('desc').value = copy.desc; $('text').value = copy.text; $('space').checked = copy.space;
      renderPreview(); renderState();
      $('prefix').focus(); $('prefix').select();
      setStatus('Copy made. Give it a new shortcut name and save.', 'ok');
    });
  });
  $('delete').addEventListener('click', () => current && vscode.postMessage({ type: 'delete', prefix: current }));
  $('confirmSave').addEventListener('click', () => { const next = pending; if (save()) { hideConfirm(); afterSave = next; } });
  $('confirmDiscard').addEventListener('click', () => { const next = pending; hideConfirm(); snapshot = formState(); if (next) next(); });
  $('confirmCancel').addEventListener('click', hideConfirm);
  $('import').addEventListener('click', () => vscode.postMessage({ type: 'import' }));
  $('export').addEventListener('click', () => vscode.postMessage({ type: 'export' }));
  $('json').addEventListener('click', () => vscode.postMessage({ type: 'openJson' }));

  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); if (isDirty()) save(); }
    else if (k === 'n') { e.preventDefault(); newShortcut(); }
    else if (k === 'f') { e.preventDefault(); $('search').focus(); $('search').select(); }
  });

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'show') {
      showView(msg.view);
    } else if (msg.type === 'data') {
      items = msg.items;
      renderSettings(msg.settings);
      if (msg.select !== undefined) {
        // reply to our own save or delete
        load(items.find(i => i.prefix === msg.select) || items[0] || null);
        if (msg.status) setStatus(msg.status, 'ok');
        if (afterSave) { const next = afterSave; afterSave = null; next(); }
      } else if (started && (isDirty() || current === null)) {
        renderList(); // changed elsewhere; keep what's in the form
      } else {
        load(items.find(i => i.prefix === current) || items[0] || null);
      }
      started = true;
    } else if (msg.type === 'error') {
      afterSave = null;
      setStatus(msg.message, 'err');
    }
  });

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}

module.exports = { open, refreshIfOpen, _html: html };
