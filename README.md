# SQL Shortcuts

T-SQL shortcuts for VS Code. In a `.sql` file, type a shortcut and press **Tab** or **Space**:

```
ssf  →  SELECT * FROM table
```

The cursor lands on `table`, ready to type. If a shortcut has several spots to fill in, Tab moves to the next one.

## Install

1. Download `sql-shortcuts-x.y.z.vsix` from [Releases](https://github.com/chaya-abramovitz/vscode-sql-shortcuts/releases).
2. In VS Code, open Extensions, click `...` → **Install from VSIX…**, and pick the file.

## Shortcuts

| Shortcut | Expands to |
|---|---|
| `ssf` | `SELECT * FROM` |
| `st100` / `st1000` | `SELECT TOP 100 * FROM` / `TOP 1000` |
| `st` / `sd` / `scf` | `SELECT TOP n` / `SELECT DISTINCT` / `SELECT COUNT(*) FROM` |
| `sw` / `w2` | `SELECT * FROM … WHERE` / `WHERE` |
| `ij` `lj` `rj` `fj` `cj` | INNER / LEFT / RIGHT / FULL / CROSS JOIN |
| `ca` `oa` | CROSS APPLY / OUTER APPLY |
| `ob` `obd` `gb` `hv` | ORDER BY / ORDER BY … DESC / GROUP BY / HAVING |
| `ii` `is` `ssi` | INSERT … VALUES / INSERT … SELECT / SELECT … INTO #temp |
| `up` `df` `mrg` `tt` | UPDATE / DELETE / MERGE / TRUNCATE |
| `ct` `ctt` `dtv` | CREATE TABLE / #temp table / table variable |
| `at` `dt` `ci` | ALTER TABLE ADD / DROP TABLE IF EXISTS / CREATE INDEX |
| `cv` `cp` `cf` `ctf` | CREATE OR ALTER view / procedure / function / table function |
| `ex` | EXEC procedure |
| `cte` `rn` `cw` | WITH … AS / ROW_NUMBER() OVER / CASE WHEN |
| `dc` `ie` `ine` `be` `wl` | DECLARE / IF EXISTS / IF NOT EXISTS / BEGIN … END / WHILE |
| `tc` `bt` `cmt` `rbt` | TRY … CATCH with transaction / BEGIN / COMMIT / ROLLBACK |
| `cur` | Cursor loop |
| `dupes` | Find duplicate rows |
| `nl` | `WITH (NOLOCK)` |
| `fc` `ftb` `fp` | Find a column / table / text in procedures |
| `rc` | Row counts for all tables |
| `sph` `spw` | sp_help / sp_who2 |
| `go` `use` | GO / USE database |

Shortcuts work in upper or lower case. `is go use at ex rn cte ct dt` expand only on Tab, because they are also everyday SQL words.

## Add, edit or remove shortcuts

Click **⚡ Shortcuts** in the status bar, or the ⚡ icon at the top right of a SQL file. In the editor:

- **+ New**, **Duplicate** and **Delete** manage the list. **Save** (Ctrl+S) applies changes immediately.
- In *Expands to*, write spots to fill in as `{name}` and the final cursor position as `{cursor}`. The preview shows the result.
- Untick *Expand on Space* for shortcuts you also type as normal words.
- **Import** / **Export** share shortcuts as a JSON file.

Can't remember a shortcut? Right-click in a SQL file → **Insert Shortcut…** to search them all.

## Commands

All under **SQL Shortcuts:** in the Command Palette (Ctrl+Shift+P): Edit Shortcuts, Insert Shortcut, Import, Export, Restore Default Shortcuts, Edit Shortcuts as JSON.

## Settings

| Setting | Default | |
|---|---|---|
| `sqlShortcuts.expandOnSpace` | `true` | Expand on Space as well as Tab |
| `sqlShortcuts.spaceExcludes` | `is go use …` | Shortcuts that expand only on Tab |
| `sqlShortcuts.shortcutsFile` | *(empty)* | Keep your shortcuts file somewhere else, e.g. OneDrive |

## Build from source

```
npx @vscode/vsce package
code --install-extension sql-shortcuts-1.6.0.vsix
```
