// Applies the user's style settings to a shortcut's snippet body just before it is inserted.
// Shortcuts are stored in one canonical style (UPPERCASE keywords, one clause per line, with semicolons).
//
//   keywordCase: 'upper' | 'lower' | 'match'  ('match' follows the case of the typed shortcut: SSF -> upper)
//   layout:      'multiLine' | 'compact'       ('compact' puts short queries on one line)
//   semicolons:  true | false

const KEYWORDS = new Set(`
ADD AFTER ALL ALTER AND APPLY AS ASC BEGIN BETWEEN BY CASE CAST CATCH CLOSE COALESCE COLUMN COMMIT CONSTRAINT CONVERT
COUNT CREATE CROSS CURSOR DATEADD DATEDIFF DEALLOCATE DECLARE DEFAULT DELAY DELETE DENSE_RANK DESC DISTINCT DROP ELSE
END EOMONTH EXEC EXISTS FAST_FORWARD FETCH FOR FOREIGN FORMAT FROM FULL FUNCTION GETDATE GO GROUP HAVING IDENTITY IF IIF
IN INDEX INNER INSERT INT INTO IO IS ISNULL JOIN JSON KEY LAG LEAD LEFT LIKE LOCAL MATCHED MERGE NEWID NEXT NOCOUNT NOLOCK
NONCLUSTERED NOT NULL OFFSET ON ONLY OPEN OPENJSON OR ORDER OUTER OUTPUT OVER PARTITION PATH PIVOT PRECEDING PRIMARY PRINT
PROCEDURE RANK REFERENCES RETURN RETURNS RIGHT ROLLBACK ROW_NUMBER ROWS SCHEMA SCOPE_IDENTITY SELECT SET STATISTICS
STRING_AGG STRING_SPLIT STUFF SUM TABLE TARGET THEN THROW TIME TOP TRANSACTION TRIGGER TRUNCATE TRY TRY_CAST UNBOUNDED UNION
UPDATE USE USING VALUES VIEW WAITFOR WHEN WHERE WHILE WITH XACT_ABORT XML`.trim().split(/\s+/));

// Splits a snippet body into pieces that may be reformatted (text) and pieces that must stay as they are
// (snippet stops like $1 or ${2:name}, 'string literals', -- comments).
const PROTECTED = /\$\{\d+(?::(?:\\.|[^{}$\\])*)?\}|\$\d+|'(?:[^']|'')*'|--[^\n]*/g;

function mapText(body, fn) {
  let out = '';
  let last = 0;
  for (const m of body.matchAll(PROTECTED)) {
    out += fn(body.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + fn(body.slice(last));
}

function applyCase(body, mode, typed) {
  // 'match' with nothing typed (e.g. picked from a list) stays uppercase
  const upper = mode === 'upper' || (mode === 'match' && (!typed || (typed === typed.toUpperCase() && /[A-Z]/.test(typed))));
  if (upper && mode !== 'lower') return body; // stored bodies are already uppercase
  // keywords only; skip words after . @ or # (column names, variables, temp tables)
  return mapText(body, text => text.replace(/(^|[^\w.@#])([A-Za-z_]+)\b/g, (m, pre, word) =>
    KEYWORDS.has(word.toUpperCase()) ? pre + word.toLowerCase() : m));
}

// A "short query" is a few short, unindented lines without blocks; those can sit on one line.
function isShortQuery(body) {
  const lines = body.split('\n');
  if (lines.length < 2 || lines.length > 5 || body.length > 100) return false;
  return lines.every(l => l && !/^\s/.test(l) && !/^(BEGIN|END|GO|AS|ELSE)\b/i.test(l.replace(/\$\d+|\$\{[^}]*\}/g, '').trim()));
}

function applyLayout(body, layout) {
  if (layout !== 'compact' || !isShortQuery(body)) return body;
  return body.split('\n').join(' ');
}

function applySemicolons(body, keep) {
  if (keep !== false) return body;
  // MERGE must end with a semicolon, and the statement before THROW must too
  if (/^\s*MERGE\b|\bTHROW\b/i.test(body)) return body;
  // a ; at the end of a line (optionally followed by the final cursor stop)
  return mapText(body, text => text.replace(/;(?=\s*(\n|$))/g, '')).replace(/;(\$0)(?=\n|$)/g, '$1');
}

function formatBody(body, opts = {}, typed = '') {
  let b = applyLayout(body, opts.layout);
  b = applySemicolons(b, opts.semicolons);
  b = applyCase(b, opts.keywordCase || 'upper', typed);
  return b;
}

module.exports = { formatBody, isShortQuery };
