// SQL Shortcuts: type an abbreviation in a SQL file (e.g. "ssf") and press Tab or Space
// to expand it (e.g. "SELECT * FROM table"). Shortcuts are stored in a JSON file in
// VS Code's snippet format and edited through the visual editor in editorPanel.js.

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const editorPanel = require('./editorPanel');
const { toFriendly, toSnippet } = require('./convert');
const { formatBody } = require('./format');

// ---------- Settings ----------

const SETTING_DEFAULTS = {
  expandOnTab: true,
  expandOnSpace: true,
  keywordCase: 'upper',
  layout: 'multiLine',
  semicolons: true,
  showInSuggestions: true,
  showStatusBar: true
};

function setting(key) {
  return vscode.workspace.getConfiguration('sqlShortcuts').get(key, SETTING_DEFAULTS[key]);
}

// The shortcut's body with the user's keyword case, layout and semicolon settings applied.
function styled(body, typed) {
  return formatBody(body, { keywordCase: setting('keywordCase'), layout: setting('layout'), semicolons: setting('semicolons') }, typed);
}

// Current settings plus example expansions, for the Settings page in the editor.
function getSettings() {
  const values = {};
  for (const key of Object.keys(SETTING_DEFAULTS)) values[key] = setting(key);
  const sample = (prefix, typed) => {
    const s = shortcuts.get(prefix);
    return s ? { typed, text: toFriendly(styled(s.body, typed)) } : null;
  };
  const samples = [sample('ssf', 'ssf'), sample('up', 'up')];
  if (values.keywordCase === 'match') samples.splice(1, 0, sample('ssf', 'SSF'));
  return { values, samples: samples.filter(Boolean) };
}

async function setSetting(key, value) {
  if (!(key in SETTING_DEFAULTS)) return;
  await vscode.workspace.getConfiguration('sqlShortcuts').update(key, value, vscode.ConfigurationTarget.Global);
}

const LANGS = ['sql', 'mssql'];

let shortcuts = new Map(); // lowercase prefix -> { prefix, body, description }
let rawJson = {};          // the file's entries as stored, in file order
let filePath = '';
let watcher;
let statusItem;

// ---------- Shortcuts file ----------

function defaultsPath(context) {
  return path.join(context.extensionPath, 'snippets', 'tsql.json');
}

function resolveFilePath(context) {
  const custom = vscode.workspace.getConfiguration('sqlShortcuts').get('shortcutsFile', '').trim();
  return custom || path.join(context.globalStorageUri.fsPath, 'shortcuts.json');
}

let createdFresh = false; // the shortcuts file was just copied from the current defaults

function ensureFile(context) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.copyFileSync(defaultsPath(context), filePath);
  createdFresh = true;
}

// Reads a snippet-format JSON file. Tolerates a BOM, // comment lines and trailing commas.
function readJsonFile(file) {
  const text = fs.readFileSync(file, 'utf8')
    .replace(/^﻿/, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1');
  const json = JSON.parse(text);
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('expected an object of shortcuts');
  return json;
}

// Flattens file entries into { prefix, body, description } (an entry may list several prefixes).
function entriesOf(json) {
  const out = [];
  for (const [name, s] of Object.entries(json)) {
    if (!s || !s.body) continue;
    const prefixes = Array.isArray(s.prefix) ? s.prefix : [s.prefix || name];
    const body = Array.isArray(s.body) ? s.body.join('\n') : String(s.body);
    for (const p of prefixes) out.push({ key: name, prefix: String(p), body, description: s.description || String(p) });
  }
  return out;
}

function load() {
  let json;
  try {
    json = readJsonFile(filePath);
  } catch (err) {
    vscode.window.showErrorMessage(`SQL Shortcuts: couldn't read ${path.basename(filePath)} (${err.message}). Keeping the previous shortcuts.`);
    return;
  }
  const next = new Map();
  for (const e of entriesOf(json)) next.set(e.prefix.toLowerCase(), e);
  shortcuts = next;
  rawJson = json;
  if (statusItem) statusItem.tooltip = `SQL Shortcuts: ${shortcuts.size} shortcuts. Click to add, edit or remove.`;
  editorPanel.refreshIfOpen();
}

function writeFile(json) {
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  load();
}

function watch(context) {
  if (watcher) watcher.dispose();
  watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(path.dirname(filePath)), path.basename(filePath))
  );
  watcher.onDidChange(load);
  watcher.onDidCreate(load);
  context.subscriptions.push(watcher);
}

function init(context) {
  filePath = resolveFilePath(context);
  ensureFile(context);
  load();
  watch(context);
}

// ---------- Editing (used by the visual editor and commands) ----------

function spaceExcludes() {
  return vscode.workspace.getConfiguration('sqlShortcuts').get('spaceExcludes', []).map(p => p.toLowerCase());
}

function getItems() {
  const excludes = spaceExcludes();
  return [...shortcuts.values()]
    .map(s => ({ prefix: s.prefix, description: s.description, text: toFriendly(s.body), space: !excludes.includes(s.prefix.toLowerCase()) }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));
}

async function setSpace(prefix, space, oldPrefix) {
  const cfg = vscode.workspace.getConfiguration('sqlShortcuts');
  const before = cfg.get('spaceExcludes', []);
  const drop = [prefix, oldPrefix].filter(Boolean).map(p => p.toLowerCase());
  const list = before.filter(p => !drop.includes(p.toLowerCase()));
  if (!space) list.push(prefix);
  if (JSON.stringify([...before].sort()) !== JSON.stringify([...list].sort())) {
    await cfg.update('spaceExcludes', list, vscode.ConfigurationTarget.Global);
  }
}

function keyFor(prefix) {
  const s = shortcuts.get(prefix.toLowerCase());
  return s && s.key;
}

function toEntry(item) {
  const body = toSnippet(item.text.replace(/\r\n/g, '\n'));
  return { prefix: item.prefix, description: item.description || item.prefix, body: body.includes('\n') ? body.split('\n') : body };
}

// Returns an error message, or null on success.
async function saveItem(item, originalPrefix) {
  const renamed = !originalPrefix || originalPrefix.toLowerCase() !== item.prefix.toLowerCase();
  if (renamed && shortcuts.has(item.prefix.toLowerCase())) return `"${item.prefix}" already exists.`;

  const oldKey = originalPrefix ? keyFor(originalPrefix) : undefined;
  const json = {};
  // keep the file's order: replace in place when editing, append when new
  for (const [k, v] of Object.entries(rawJson)) {
    if (k === oldKey) json[item.prefix] = toEntry(item);
    else if (k !== item.prefix) json[k] = v;
  }
  if (!oldKey) json[item.prefix] = toEntry(item);
  writeFile(json);
  await setSpace(item.prefix, item.space, originalPrefix);
  return null;
}

async function removeItem(prefix) {
  const key = keyFor(prefix);
  if (!key) return;
  const json = { ...rawJson };
  delete json[key];
  writeFile(json);
  await setSpace(prefix, true);
}

async function openJson() {
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

// Adds entries from another file. Asks what to do when a shortcut already exists.
async function mergeIn(incoming, sourceName) {
  const fresh = entriesOf(incoming);
  if (!fresh.length) {
    vscode.window.showWarningMessage(`SQL Shortcuts: no shortcuts found in ${sourceName}.`);
    return;
  }
  const clashes = fresh.filter(e => shortcuts.has(e.prefix.toLowerCase()));
  let replace = false;
  if (clashes.length) {
    const names = clashes.slice(0, 8).map(e => e.prefix).join(', ') + (clashes.length > 8 ? ', …' : '');
    const pick = await vscode.window.showWarningMessage(
      `${clashes.length} of these shortcuts already exist (${names}).`, { modal: true }, 'Replace mine', 'Keep mine');
    if (!pick) return;
    replace = pick === 'Replace mine';
  }
  const json = { ...rawJson };
  let added = 0, replaced = 0;
  for (const e of fresh) {
    const existingKey = keyFor(e.prefix);
    if (existingKey && !replace) continue;
    if (existingKey) { delete json[existingKey]; replaced++; } else added++;
    json[e.prefix] = { prefix: e.prefix, description: e.description, body: e.body.includes('\n') ? e.body.split('\n') : e.body };
  }
  writeFile(json);
  vscode.window.showInformationMessage(`SQL Shortcuts: added ${added}${replaced ? `, replaced ${replaced}` : ''}.`);
}

async function importShortcuts() {
  const picked = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'Shortcuts (JSON)': ['json', 'code-snippets'] }, title: 'Import SQL shortcuts' });
  if (!picked) return;
  let json;
  try {
    json = readJsonFile(picked[0].fsPath);
  } catch (err) {
    vscode.window.showErrorMessage(`SQL Shortcuts: couldn't read that file (${err.message}).`);
    return;
  }
  await mergeIn(json, path.basename(picked[0].fsPath));
}

async function exportShortcuts() {
  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(path.join(require('os').homedir(), 'sql-shortcuts.json')),
    filters: { 'Shortcuts (JSON)': ['json'] },
    title: 'Export SQL shortcuts'
  });
  if (!target) return;
  fs.writeFileSync(target.fsPath, JSON.stringify(rawJson, null, 2) + '\n', 'utf8');
  vscode.window.showInformationMessage(`SQL Shortcuts: exported ${shortcuts.size} shortcuts to ${path.basename(target.fsPath)}.`);
}

async function restoreDefaults(context) {
  const defaults = readJsonFile(defaultsPath(context));
  const missing = entriesOf(defaults).filter(e => !shortcuts.has(e.prefix.toLowerCase()));
  const pick = await vscode.window.showQuickPick([
    { label: 'Add back missing default shortcuts', description: missing.length ? `${missing.length} missing` : 'none missing', id: 'missing' },
    { label: 'Replace all shortcuts with the defaults', description: 'your own changes are lost', id: 'all' }
  ], { title: 'Restore default shortcuts' });
  if (!pick) return;
  if (pick.id === 'all') {
    const ok = await vscode.window.showWarningMessage('Replace all your shortcuts with the defaults? Your own changes will be lost.', { modal: true }, 'Replace all');
    if (ok !== 'Replace all') return;
    writeFile(defaults);
    vscode.window.showInformationMessage('SQL Shortcuts: restored the default shortcuts.');
    return;
  }
  if (!missing.length) {
    vscode.window.showInformationMessage('SQL Shortcuts: all default shortcuts are already there.');
    return;
  }
  const json = { ...rawJson };
  for (const e of missing) json[e.prefix] = defaults[e.key];
  writeFile(json);
  vscode.window.showInformationMessage(`SQL Shortcuts: added back ${missing.length} default shortcuts.`);
}

// When the bundled defaults change, update the user's file: replace entries the user never edited
// and add shortcuts that are new. Entries the user changed or deleted are left alone.
const DEFAULTS_VERSION = 3;
const PREVIOUS_DEFAULTS = { 1: 'defaults-v1.json', 2: 'defaults-v2.json' };

function upgradeDefaults(context) {
  const from = context.globalState.get('defaultsVersion', 1);
  if (from >= DEFAULTS_VERSION) return;
  context.globalState.update('defaultsVersion', DEFAULTS_VERSION);
  if (createdFresh) return; // the file already has the new defaults

  const old = readJsonFile(path.join(context.extensionPath, 'snippets', PREVIOUS_DEFAULTS[from]));
  const fresh = readJsonFile(defaultsPath(context));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const json = { ...rawJson };
  let updated = 0;
  const added = [];
  for (const [key, entry] of Object.entries(fresh)) {
    if (key in json) {
      if (old[key] && same(json[key], old[key]) && !same(json[key], entry)) { json[key] = entry; updated++; }
    } else if (!(key in old) && !shortcuts.has(String(entry.prefix).toLowerCase())) {
      json[key] = entry; added.push(entry.prefix);
    }
  }
  if (!updated && !added.length) return;
  writeFile(json);
  const parts = [];
  if (added.length) {
    const names = added.length <= 5 ? ': ' + added.join(', ') : '';
    parts.push(`${added.length} new ${added.length === 1 ? 'shortcut' : 'shortcuts'} added${names}`);
  }
  if (updated) parts.push(`${updated} ${updated === 1 ? 'shortcut' : 'shortcuts'} updated to the new style`);
  vscode.window
    .showInformationMessage(`SQL Shortcuts: ${parts.join('; ')}. Shortcuts you changed were kept.`, 'See all shortcuts')
    .then(pick => pick && vscode.commands.executeCommand('sqlShortcuts.edit'));
}

// ---------- Expanding ----------

// Rough check: is the end of `text` inside a -- comment or an open 'string'?
function inStringOrComment(text) {
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") inString = !inString;
    else if (!inString && c === '-' && text[i + 1] === '-') return true;
  }
  return inString;
}

// What the key would normally do when there is no shortcut to expand.
function fallback(trigger) {
  if (trigger === 'space') return vscode.commands.executeCommand('type', { text: ' ' });
  if (trigger === 'tabSuggest') return vscode.commands.executeCommand('acceptSelectedSuggestion');
  return vscode.commands.executeCommand('tab');
}

async function expand(args) {
  const trigger = (args && args.trigger) || 'tab';
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.selections.length !== 1 || !ed.selection.isEmpty) return fallback(trigger);
  if (!setting(trigger === 'space' ? 'expandOnSpace' : 'expandOnTab')) return fallback(trigger);

  const pos = ed.selection.active;
  const before = ed.document.lineAt(pos.line).text.slice(0, pos.character);

  // The whole word before the cursor, but not part of @var, #temp, schema.name or [name]
  const m = /(^|[^\w@#.$\[])([A-Za-z]\w*)$/.exec(before);
  const word = m && m[2];
  const s = word && shortcuts.get(word.toLowerCase());
  if (
    !s ||
    (trigger === 'space' && spaceExcludes().includes(word.toLowerCase())) ||
    inStringOrComment(before.slice(0, before.length - word.length))
  ) {
    return fallback(trigger);
  }

  await vscode.commands.executeCommand('hideSuggestWidget');
  await ed.insertSnippet(new vscode.SnippetString(styled(s.body, word)), new vscode.Range(pos.translate(0, -word.length), pos));
}

// Pick a shortcut from a searchable list and insert it at the cursor.
async function insertShortcut() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) {
    vscode.window.showInformationMessage('SQL Shortcuts: open a SQL file first.');
    return;
  }
  const items = getItems().map(i => ({
    label: i.prefix,
    description: i.description,
    detail: i.text.replace(/\{cursor\}/g, '').replace(/\s+/g, ' ').trim(),
    prefix: i.prefix
  }));
  const pick = await vscode.window.showQuickPick(items, { title: 'Insert SQL shortcut', placeHolder: 'Type to search by shortcut, description or SQL', matchOnDescription: true, matchOnDetail: true });
  if (!pick) return;
  await ed.insertSnippet(new vscode.SnippetString(styled(shortcuts.get(pick.prefix.toLowerCase()).body)));
}

// Also lists the shortcuts in VS Code's suggestion list.
const completionProvider = {
  provideCompletionItems(document, position) {
    if (!setting('showInSuggestions')) return [];
    const range = document.getWordRangeAtPosition(position);
    const typed = range ? document.getText(range) : '';
    return [...shortcuts.values()].map(s => {
      const body = styled(s.body, typed);
      const item = new vscode.CompletionItem({ label: s.prefix, description: s.description }, vscode.CompletionItemKind.Snippet);
      item.insertText = new vscode.SnippetString(body);
      item.documentation = new vscode.MarkdownString().appendCodeblock(toFriendly(body).replace(/\{(cursor|\d*)\}/g, ''), 'sql');
      item.sortText = '0' + s.prefix;
      return item;
    });
  }
};

// ---------- Activation ----------

function showWelcome(context) {
  if (context.globalState.get('welcomed')) return;
  context.globalState.update('welcomed', true);
  vscode.window
    .showInformationMessage('SQL Shortcuts is ready. In a .sql file, type ssf and press Tab or Space to get SELECT * FROM.', 'See all shortcuts')
    .then(pick => pick && vscode.commands.executeCommand('sqlShortcuts.edit'));
}

function activate(context) {
  init(context);
  upgradeDefaults(context);

  // "Shortcuts" button in the status bar while a SQL file is open
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
  statusItem.text = '$(keyboard) Shortcuts';
  statusItem.tooltip = `SQL Shortcuts: ${shortcuts.size} shortcuts. Click to add, edit or remove.`;
  statusItem.command = 'sqlShortcuts.edit';
  const updateStatus = () => {
    const ed = vscode.window.activeTextEditor;
    if (ed && LANGS.includes(ed.document.languageId) && setting('showStatusBar')) statusItem.show();
    else statusItem.hide();
  };
  updateStatus();

  const panelHost = { getItems, save: saveItem, remove: removeItem, openJson, importShortcuts, exportShortcuts, getSettings, setSetting };

  context.subscriptions.push(
    statusItem,
    vscode.window.onDidChangeActiveTextEditor(updateStatus),
    vscode.workspace.onDidOpenTextDocument(updateStatus),

    vscode.commands.registerCommand('sqlShortcuts.expand', expand),
    vscode.commands.registerCommand('sqlShortcuts.edit', () => {
      ensureFile(context);
      editorPanel.open(context, panelHost);
    }),
    vscode.commands.registerCommand('sqlShortcuts.settings', () => {
      ensureFile(context);
      editorPanel.open(context, panelHost, 'settings');
    }),
    vscode.commands.registerCommand('sqlShortcuts.insert', insertShortcut),
    vscode.commands.registerCommand('sqlShortcuts.editJson', () => {
      ensureFile(context);
      return openJson();
    }),
    vscode.commands.registerCommand('sqlShortcuts.import', importShortcuts),
    vscode.commands.registerCommand('sqlShortcuts.export', exportShortcuts),
    vscode.commands.registerCommand('sqlShortcuts.restoreDefaults', () => restoreDefaults(context)),

    // Saving the file inside VS Code reloads at once; the watcher catches edits made elsewhere.
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (path.resolve(doc.uri.fsPath).toLowerCase() === path.resolve(filePath).toLowerCase()) load();
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('sqlShortcuts.shortcutsFile')) init(context);
      else if (e.affectsConfiguration('sqlShortcuts')) {
        updateStatus();
        editorPanel.refreshIfOpen();
      }
    }),

    vscode.languages.registerCompletionItemProvider(LANGS.map(language => ({ language })), completionProvider)
  );

  showWelcome(context);
}

function deactivate() {}

module.exports = { activate, deactivate };
