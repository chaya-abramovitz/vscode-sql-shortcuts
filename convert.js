// Converts between VS Code snippet syntax and the friendly {name} syntax shown in the editor.
//   SELECT * FROM ${1:table} WHERE ${2:id} = ${2}$0   <->   SELECT * FROM {table} WHERE {id} = {id}{cursor}

function toFriendly(body) {
  const names = {}; // placeholder number -> name
  const used = new Set();
  const nameFor = (n, wanted) => {
    if (n === '0') return 'cursor';
    if (names[n]) return names[n];
    let name = (wanted || '').trim() || 'value';
    if (name === 'cursor') name = 'cursor_';
    let unique = name;
    for (let i = 2; used.has(unique); i++) unique = name + i;
    used.add(unique);
    names[n] = unique;
    return unique;
  };

  let t = body;
  // innermost first, so nested placeholders still come out readable
  for (let guard = 0; guard < 10; guard++) {
    const before = t;
    t = t.replace(/\$\{(\d+):((?:\\.|[^{}$\\])*)\}/g, (m, n, name) => '{' + nameFor(n, name.replace(/\\(.)/g, '$1')) + '}');
    t = t.replace(/\$\{(\d+)\}|\$(\d+)/g, (m, a, b) => '{' + nameFor(a || b, '') + '}');
    if (t === before) break;
  }
  return t.replace(/\\([$}\\])/g, '$1');
}

function toSnippet(text) {
  const nums = {};
  let next = 1;
  let out = '';
  let last = 0;
  const esc = s => s.replace(/[\\$]/g, m => '\\' + m);
  const re = /\{([^{}\n]+)\}/g;
  let m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    last = re.lastIndex;
    const name = m[1].trim();
    if (name.toLowerCase() === 'cursor') { out += '$0'; continue; }
    if (nums[name]) { out += '${' + nums[name] + '}'; continue; }
    nums[name] = next++;
    out += '${' + nums[name] + ':' + name.replace(/[\\$}]/g, c => '\\' + c) + '}';
  }
  out += esc(text.slice(last));
  return out;
}

module.exports = { toFriendly, toSnippet };
