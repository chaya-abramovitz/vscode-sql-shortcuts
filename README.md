# SQL Shortcuts

Redgate SQL Prompt style shortcuts for T-SQL in VS Code. In a `.sql` file, type a shortcut and press **Tab** (or pick it from the suggestion list). Press Tab again to jump between the placeholders.

| Shortcut | Expands to |
|---|---|
| `ssf` | `SELECT * FROM` |
| `st100` / `st1000` | `SELECT TOP 100 * FROM` / `TOP 1000` |
| `st` | `SELECT TOP n cols FROM` |
| `sd` | `SELECT DISTINCT` |
| `scf` | `SELECT COUNT(*) FROM` |
| `sw` | `SELECT * FROM ... WHERE` |
| `w2` | `WHERE` |
| `ij` `lj` `rj` `fj` `cj` | INNER / LEFT / RIGHT / FULL / CROSS JOIN |
| `ca` `oa` | CROSS APPLY / OUTER APPLY |
| `ob` `obd` `gb` `hv` | ORDER BY / ORDER BY DESC / GROUP BY / HAVING |
| `dupes` | Find duplicate rows |
| `ii` `is` `ssi` | INSERT VALUES / INSERT SELECT / SELECT INTO #temp |
| `up` `df` `mrg` `tt` | UPDATE / DELETE / MERGE / TRUNCATE |
| `ct` `ctt` `dtv` | CREATE TABLE / #temp table / table variable |
| `at` `dt` `ci` | ALTER TABLE ADD / DROP TABLE IF EXISTS / CREATE INDEX |
| `cv` `cp` `cf` `ctf` | CREATE OR ALTER view / procedure / function / table function |
| `ex` | EXEC procedure |
| `cte` `rn` `cw` | CTE / ROW_NUMBER() OVER / CASE WHEN |
| `dc` `ie` `ine` `be` `wl` | DECLARE / IF EXISTS / IF NOT EXISTS / BEGIN END / WHILE |
| `tc` `bt` `cmt` `rbt` | TRY CATCH with transaction / BEGIN / COMMIT / ROLLBACK |
| `cur` | Cursor loop |
| `nl` | `WITH (NOLOCK)` |
| `fc` `ftb` `fp` | Find column / table / text in procs |
| `rc` | Row counts for all tables |
| `sph` `spw` | sp_help / sp_who2 |
| `go` `use` | GO / USE database |

## Space to expand

Space expands a shortcut too, like Redgate. It only fires on a whole lowercase word that matches a shortcut, and not inside a string or `--` comment. These only expand on Tab, because they collide with normal SQL words or aliases: `is go use at ex rn cte ct dt`. Change that list in Settings → `sqlShortcuts.spaceExcludes`, or turn Space off with `sqlShortcuts.expandOnSpace`. Ctrl+Z undoes an expansion you didn't want.

## Editing your shortcuts in VS Code

Click the **snippet icon** at the top right of any `.sql` file (or Ctrl+Shift+P → **SQL Shortcuts: Edit Shortcuts**). A screen opens with every shortcut listed on the left:

- Click one to edit it, **+ New** to add one, **Delete** to remove one. Press **Save** (or Ctrl+S) and it works right away.
- In *Expands to*, write fill-in spots in curly braces, like `SELECT * FROM {table}`. After expanding, Tab jumps between them; the same name twice fills in both places. `{cursor}` is where the cursor ends. The preview shows how it'll look.
- Untick *Also expand when I press Space* for shortcuts that are also normal words.

Other commands: **Edit Shortcuts File (JSON)**, **Reload Shortcuts**, **Reset Shortcuts to Defaults**. To keep the file somewhere else (e.g. OneDrive), set `sqlShortcuts.shortcutsFile` to its full path.

`snippets/tsql.json` in this folder is only the starting set, copied the first time.
