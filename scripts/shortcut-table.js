// Prints the README's shortcut tables from snippets/tsql.json, grouped by topic.
// Run: node scripts/shortcut-table.js
const path = require('path');
const shortcuts = require(path.join(__dirname, '..', 'snippets', 'tsql.json'));

const groups = [
  ['Select', 'ssf sf st1 st10 st100 st1000 st sd scf sw sso scg dupes'],
  ['Filter', 'w2 wi wlk wb wn wnn exs nexs'],
  ['Join and combine', 'j ij lj rj fj cj ca oa un ua'],
  ['Sort, group, page', 'ob obd gb hv ofs'],
  ['Change data', 'ii is ssi up upj df mrg tt oc'],
  ['Tables and indexes', 'ct ctt dtv at alc drc pk fk dfc ci dt dv dp dfn csc'],
  ['Views, procedures, functions', 'cv cp cf ctf ctr ex'],
  ['Query helpers', 'cte rn rk drk lg ld rt cw pvt'],
  ['Functions', 'isn coa iif cst tcs cvt gd dta dtd eom fmt sagg spl nid sci'],
  ['Control flow and transactions', 'dc ie ine ife be wl cur pr thr wt tc bt cmt rbt sno sxa sio nl'],
  ['JSON and XML', 'jsn oj xmlp'],
  ['Explore the database', 'fc ftb fp rc cols sph spt spi spw go use']
];

const seen = new Set();
const lines = [];
for (const [title, list] of groups) {
  lines.push(`**${title}**`, '', '| Shortcut | Gives you |', '|---|---|');
  for (const p of list.split(' ')) {
    const s = shortcuts[p];
    if (!s) throw new Error('unknown shortcut ' + p);
    seen.add(p);
    lines.push(`| \`${p}\` | ${s.description.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
}
const missing = Object.keys(shortcuts).filter(k => !seen.has(k));
if (missing.length) throw new Error('not in any group: ' + missing.join(' '));
console.log(lines.join('\n').trim());
