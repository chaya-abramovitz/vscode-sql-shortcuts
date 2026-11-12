const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const editorPanel = require('./editorPanel');
const { toFriendly, toSnippet } = require('./convert');

const LANGS = ['sql', 'mssql'];
let shortcuts = new Map(); // prefix -> { body, description }
let rawJson = {};          // the file's entries, in file order
let filePath = '';
let watcher;

// ---------- the shortcuts file ----------

function defaultsPath(context) {
  return path.join(context.extensionPath, 'snippets', 'tsql.json');
}

function resolveFilePath(context) {
  const custom = vscode.workspace.getConfiguration('sqlShortcuts').get('shortcutsFile', '').trim();
  if (custom) return custom;
  return path.join(context.globalStorageUri.fsPath, 'shortcuts.json');
}

function ensureFile(context) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.copyFileSync(defaultsPath(context), filePath);
}

function load(showMessage) {
  let json;
  try {
    // allow // comments and trailing commas like VS Code's own snippet files
    const text = fs.readFileSync(filePath, 'utf8')
      .replace(/^﻿/, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/,(\s*[}\]])/g, '$1');
    json = JSON.parse(text);
  } catch (err) {
    vscode.window.showErrorMessage(`SQL Shortcuts: couldn't read ${path.basename(filePath)} (${err.message}). Keeping the previous shortcuts.`);
    return;
  }
  const next = new Map();
  for (const [name, s] of Object.entries(json)) {
    if (!s || !s.body) continue;
    const prefixes = Array.isArray(s.prefix) ? s.prefix : [s.prefix || name];
    const body = Array.isArray(s.body) ? s.body.join('\n') : String(s.body);
    for (const p of prefixes) next.set(String(p), { body, description: s.description || name });
  }
  shortcuts = next;
  rawJson = json;
  editorPanel.refreshIfOpen();
  if (showMessage) vscode.window.setStatusBarMessage(`SQL Shortcuts: ${shortcuts.size} shortcuts loaded`, 3000);
}

// ---------- used by the visual editor ----------

function writeFile(json) {
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  load(false);
}

function getItems() {
  const excludes = vscode.workspace.getConfiguration('sqlShortcuts').get('spaceExcludes', []);
  const items = [];
  for (const [prefix, s] of shortcuts) {
    items.push({ prefix, description: s.description, text: toFriendly(s.body), space: !excludes.includes(prefix) });
  }
  return items.sort((a, b) => a.prefix.localeCompare(b.prefix));
}

async function setSpace(prefix, space, oldPrefix) {
  const cfg = vscode.workspace.getConfiguration('sqlShortcuts');
  let list = cfg.get('spaceExcludes', []).filter(p => p !== prefix && p !== oldPrefix);
  if (!space) list.push(prefix);
  const before = cfg.get('spaceExcludes', []);
  if (JSON.stringify([...before].sort()) !== JSON.stringify([...list].sort())) {
    await cfg.update('spaceExcludes', list, vscode.ConfigurationTarget.Global);
  }
}

// key in the file for a given prefix (entries may be named differently from their prefix)
function keyFor(prefix) {
  return Object.keys(rawJson).find(k => {
    const p = rawJson[k] && (rawJson[k].prefix || k);
    return Array.isArray(p) ? p.includes(prefix) : p === prefix;
  });
}

async function saveItem(item, originalPrefix) {
  const body = toSnippet(item.text.replace(/\r\n/g, '\n'));
  const entry = { prefix: item.prefix, description: item.description || item.prefix, body: body.includes('\n') ? body.split('\n') : body };
  const json = {};
  const oldKey = originalPrefix ? keyFor(originalPrefix) : undefined;
  if (!originalPrefix || originalPrefix !== item.prefix) {
    if (shortcuts.has(item.prefix)) return `"${item.prefix}" already exists.`;
  }
  // keep the file's order; replace in place when editing, append when new
  for (const [k, v] of Object.entries(rawJson)) {
    if (k === oldKey) json[item.prefix] = entry;
    else if (k !== item.prefix) json[k] = v;
  }
  if (!oldKey) json[item.prefix] = entry;
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

function watch(context) {
  if (watcher) watcher.dispose();
  watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(path.dirname(filePath)), path.basename(filePath))
  );
  watcher.onDidChange(() => load(true));
  watcher.onDidCreate(() => load(true));
  context.subscriptions.push(watcher);
}

function init(context) {
  filePath = resolveFilePath(context);
  ensureFile(context);
  load(false);
  watch(context);
}

// ---------- expanding ----------

// Rough check: is the cursor inside a '--' comment or an open 'string'?
function inStringOrComment(text) {
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") inString = !inString;
    else if (!inString && c === '-' && text[i + 1] === '-') return true;
  }
  return inString;
}

async function fallback(trigger) {
  if (trigger === 'space') return vscode.commands.executeCommand('type', { text: ' ' });
  // Tab: accept the open suggestion if the list is showing, otherwise a normal tab
  if (trigger === 'tabSuggest') return vscode.commands.executeCommand('acceptSelectedSuggestion');
  return vscode.commands.executeCommand('tab');
}

async function expand(args) {
  const trigger = (args && args.trigger) || 'tab';
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.selections.length !== 1 || !ed.selection.isEmpty) return fallback(trigger);

  const cfg = vscode.workspace.getConfiguration('sqlShortcuts');
  if (trigger === 'space' && !cfg.get('expandOnSpace', true)) return fallback(trigger);

  const pos = ed.selection.active;
  const before = ed.document.lineAt(pos.line).text.slice(0, pos.character);

  // Whole word right before the cursor, not part of @var, #temp, schema.name or [name]
  const m = /(^|[^\w@#.$\[])([A-Za-z]\w*)$/.exec(before);
  const word = m && m[2];
  const s = word && shortcuts.get(word);
  if (
    !s ||
    (trigger === 'space' && cfg.get('spaceExcludes', []).includes(word)) ||
    inStringOrComment(before.slice(0, before.length - word.length))
  ) {
    return fallback(trigger);
  }

  await vscode.commands.executeCommand('hideSuggestWidget');
  const range = new vscode.Range(pos.translate(0, -word.length), pos);
  await ed.insertSnippet(new vscode.SnippetString(s.body), range);
}

// Shows the shortcuts in the suggestion list too
const completionProvider = {
  provideCompletionItems() {
    const items = [];
    for (const [prefix, s] of shortcuts) {
      const item = new vscode.CompletionItem({ label: prefix, description: s.description }, vscode.CompletionItemKind.Snippet);
      item.insertText = new vscode.SnippetString(s.body);
      item.documentation = new vscode.MarkdownString().appendCodeblock(s.body.replace(/\$\{\d+:?([^}]*)\}|\$\d+/g, '$1'), 'sql');
      item.sortText = '0' + prefix;
      items.push(item);
    }
    return items;
  }
};

// ---------- activate ----------

function activate(context) {
  init(context);

  // Visible "Shortcuts" button in the bottom status bar while a SQL file is open
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
  statusItem.text = '$(zap) Shortcuts';
  statusItem.tooltip = 'SQL Shortcuts: add, edit or remove shortcuts';
  statusItem.command = 'sqlShortcuts.edit';
  const updateStatus = () => {
    const ed = vscode.window.activeTextEditor;
    if (ed && LANGS.includes(ed.document.languageId)) statusItem.show();
    else statusItem.hide();
  };
  updateStatus();
  context.subscriptions.push(
    statusItem,
    vscode.window.onDidChangeActiveTextEditor(updateStatus),
    vscode.workspace.onDidOpenTextDocument(updateStatus)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sqlShortcuts.expand', expand),
    vscode.commands.registerCommand('sqlShortcuts.spaceExpand', () => expand({ trigger: 'space' })),

    vscode.commands.registerCommand('sqlShortcuts.edit', () => {
      ensureFile(context);
      editorPanel.open(context, { getItems, save: saveItem, remove: removeItem, openJson });
    }),

    vscode.commands.registerCommand('sqlShortcuts.editJson', () => {
      ensureFile(context);
      return openJson();
    }),

    vscode.commands.registerCommand('sqlShortcuts.reload', () => load(true)),

    vscode.commands.registerCommand('sqlShortcuts.reset', async () => {
      const ok = await vscode.window.showWarningMessage(
        'Replace your shortcuts file with the default shortcuts? Your own changes will be lost.', { modal: true }, 'Reset');
      if (ok !== 'Reset') return;
      fs.copyFileSync(defaultsPath(context), filePath);
      load(true);
    }),

    // Saving the file in VS Code reloads instantly (the watcher also catches outside edits)
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (path.resolve(doc.uri.fsPath).toLowerCase() === path.resolve(filePath).toLowerCase()) load(true);
    }),

    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('sqlShortcuts.shortcutsFile')) init(context);
      else if (e.affectsConfiguration('sqlShortcuts.spaceExcludes')) editorPanel.refreshIfOpen();
    }),

    vscode.languages.registerCompletionItemProvider(LANGS.map(language => ({ language })), completionProvider)
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
