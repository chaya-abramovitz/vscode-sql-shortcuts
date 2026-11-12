// Converts between VS Code snippet syntax (stored in the file) and the simpler syntax shown in the editor:
//
//   {}        an empty spot to fill in                 <->  $1
//   {1}       an empty spot used in several places     <->  $1 ... $1
//   {text}    a spot that starts with text selected    <->  ${1:text}
//   {cursor}  where the cursor ends up                 <->  $0
//
//   SELECT {2}, COUNT(*) FROM {} GROUP BY {2}{cursor}  <->  SELECT $2, COUNT(*) FROM $1 GROUP BY $2$0

const STOP = /\$\{(\d+):((?:\\.|[^{}$\\])*)\}|\$\{(\d+)\}|\$(\d+)/g;

function toFriendly(body) {
  // count uses of each unnamed stop, and collect names of named ones
  const uses = {};
  const names = {};
  for (const m of body.matchAll(STOP)) {
    const n = m[1] || m[3] || m[4];
    if (m[1] !== undefined) names[n] = m[2].replace(/\\(.)/g, '$1');
    else uses[n] = (uses[n] || 0) + 1;
  }
  const out = body.replace(STOP, (m, n1, text, n2, n3) => {
    const n = n1 || n2 || n3;
    if (n === '0') return '{cursor}';
    if (names[n] !== undefined && names[n] !== '') return '{' + names[n] + '}';
    return uses[n] > 1 ? '{' + n + '}' : '{}';
  });
  return out.replace(/\\([$}\\])/g, '$1');
}

function toSnippet(text) {
  const esc = s => s.replace(/[\\$]/g, c => '\\' + c);
  const re = /\{([^{}\n]*)\}/g;
  const tokens = [...text.matchAll(re)];

  // numbers written explicitly ({1}) are reserved; {} and {text} get the next free number in order
  const reserved = new Set(tokens.map(m => m[1].trim()).filter(t => /^[1-9]\d*$/.test(t)).map(Number));
  let next = 1;
  const nextFree = () => { while (reserved.has(next)) next++; return next++; };
  const named = {};

  let out = '';
  let last = 0;
  for (const m of tokens) {
    out += esc(text.slice(last, m.index));
    last = m.index + m[0].length;
    const t = m[1].trim();
    if (t.toLowerCase() === 'cursor') out += '$0';
    else if (t === '') out += '$' + nextFree();
    else if (/^[1-9]\d*$/.test(t)) out += '$' + t;
    else if (named[t]) out += '${' + named[t] + '}';
    else {
      named[t] = nextFree();
      out += '${' + named[t] + ':' + t.replace(/[\\$}]/g, c => '\\' + c) + '}';
    }
  }
  return out + esc(text.slice(last));
}

module.exports = { toFriendly, toSnippet };
