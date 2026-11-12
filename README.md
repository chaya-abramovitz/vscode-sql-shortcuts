# SQL Shortcuts

T-SQL shortcuts for VS Code. In a `.sql` file, type a shortcut and press **Tab** or **Space**:

```
ssf   →   SELECT *
          FROM |
```

The cursor (`|`) lands right where you type next, with nothing to delete. When a shortcut has more than one spot to fill in, press Tab to move to the next one.

## Install

1. **Download the installer:** [**sql-shortcuts.vsix**](https://github.com/chaya-abramovitz/vscode-sql-shortcuts/releases/latest/download/sql-shortcuts.vsix)
   It goes to your Downloads folder. If the browser asks whether to keep the file, choose **Keep**.
   (On the Releases page, this is the file listed under *Assets*. You don't need the *Source code* files.)
2. In VS Code, press **Ctrl+Shift+X** to open Extensions.
3. Click **⋯** at the top of the Extensions panel, then **Install from VSIX…**
4. Pick **sql-shortcuts.vsix** in your Downloads folder.
5. Open any `.sql` file, type `ssf`, and press **Tab**.

**To update:** download the file again and repeat steps 2–4. Your own shortcuts are kept.
**To uninstall:** Extensions → *SQL Shortcuts* → **Uninstall**.

## Shortcuts

Shortcuts work in upper or lower case. A few that are also everyday SQL words (`is go use at ex rn cte ct dt pk fk j`) expand only on Tab, not Space.

Can't remember one? Right-click in a SQL file → **Insert Shortcut…** and search.

<!-- table:start -->
**Select**

| Shortcut | Gives you |
|---|---|
| `ssf` | SELECT * FROM |
| `sf` | SELECT columns FROM |
| `st1` | SELECT TOP 1 * FROM |
| `st10` | SELECT TOP 10 * FROM |
| `st100` | SELECT TOP 100 * FROM |
| `st1000` | SELECT TOP 1000 * FROM |
| `st` | SELECT TOP n columns FROM |
| `sd` | SELECT DISTINCT ... FROM |
| `scf` | SELECT COUNT(*) FROM |
| `sw` | SELECT * FROM ... WHERE |
| `sso` | SELECT * FROM ... ORDER BY |
| `scg` | Count rows per group |
| `dupes` | Find duplicate values |

**Filter**

| Shortcut | Gives you |
|---|---|
| `w2` | WHERE |
| `wi` | WHERE ... IN (...) |
| `wlk` | WHERE ... LIKE '%...%' |
| `wb` | WHERE ... BETWEEN ... AND ... |
| `wn` | WHERE ... IS NULL |
| `wnn` | WHERE ... IS NOT NULL |
| `exs` | EXISTS (SELECT 1 FROM ...) |
| `nexs` | NOT EXISTS (SELECT 1 FROM ...) |

**Join and combine**

| Shortcut | Gives you |
|---|---|
| `j` | JOIN ... ON |
| `ij` | INNER JOIN ... ON |
| `lj` | LEFT JOIN ... ON |
| `rj` | RIGHT JOIN ... ON |
| `fj` | FULL OUTER JOIN ... ON |
| `cj` | CROSS JOIN |
| `ca` | CROSS APPLY (...) |
| `oa` | OUTER APPLY (...) |
| `un` | UNION |
| `ua` | UNION ALL |

**Sort, group, page**

| Shortcut | Gives you |
|---|---|
| `ob` | ORDER BY |
| `obd` | ORDER BY ... DESC |
| `gb` | GROUP BY |
| `hv` | HAVING |
| `ofs` | OFFSET ... FETCH NEXT (paging) |

**Change data**

| Shortcut | Gives you |
|---|---|
| `ii` | INSERT INTO ... VALUES |
| `is` | INSERT INTO ... SELECT |
| `ssi` | SELECT ... INTO #temp |
| `up` | UPDATE ... SET ... WHERE |
| `upj` | UPDATE with a JOIN |
| `df` | DELETE FROM ... WHERE |
| `mrg` | MERGE (insert or update) |
| `tt` | TRUNCATE TABLE |
| `oc` | OUTPUT inserted.* (see changed rows) |

**Tables and indexes**

| Shortcut | Gives you |
|---|---|
| `ct` | CREATE TABLE |
| `ctt` | CREATE TABLE #temp |
| `dtv` | DECLARE @table variable |
| `at` | ALTER TABLE ... ADD column |
| `alc` | ALTER TABLE ... ALTER COLUMN |
| `drc` | ALTER TABLE ... DROP COLUMN |
| `pk` | Add PRIMARY KEY constraint |
| `fk` | Add FOREIGN KEY constraint |
| `dfc` | Add DEFAULT constraint |
| `ci` | CREATE INDEX |
| `dt` | DROP TABLE IF EXISTS |
| `dv` | DROP VIEW IF EXISTS |
| `dp` | DROP PROCEDURE IF EXISTS |
| `dfn` | DROP FUNCTION IF EXISTS |
| `csc` | CREATE SCHEMA |

**Views, procedures, functions**

| Shortcut | Gives you |
|---|---|
| `cv` | CREATE OR ALTER VIEW |
| `cp` | CREATE OR ALTER PROCEDURE |
| `cf` | CREATE OR ALTER scalar FUNCTION |
| `ctf` | CREATE OR ALTER inline table FUNCTION |
| `ctr` | CREATE OR ALTER TRIGGER |
| `ex` | EXEC procedure |

**Query helpers**

| Shortcut | Gives you |
|---|---|
| `cte` | WITH cte AS (...) |
| `rn` | ROW_NUMBER() OVER (...) |
| `rk` | RANK() OVER (...) |
| `drk` | DENSE_RANK() OVER (...) |
| `lg` | LAG() OVER (...) |
| `ld` | LEAD() OVER (...) |
| `rt` | Running total: SUM() OVER (...) |
| `cw` | CASE WHEN ... END |
| `pvt` | PIVOT |

**Functions**

| Shortcut | Gives you |
|---|---|
| `isn` | ISNULL(..., ...) |
| `coa` | COALESCE(..., ...) |
| `iif` | IIF(condition, yes, no) |
| `cst` | CAST(... AS ...) |
| `tcs` | TRY_CAST(... AS ...) |
| `cvt` | CONVERT(type, value, style) |
| `gd` | GETDATE() |
| `dta` | DATEADD(...) |
| `dtd` | DATEDIFF(...) |
| `eom` | EOMONTH(...) |
| `fmt` | FORMAT(value, 'format') |
| `sagg` | STRING_AGG(..., ', ') |
| `spl` | STRING_SPLIT(..., ',') |
| `nid` | NEWID() |
| `sci` | SCOPE_IDENTITY() |

**Control flow and transactions**

| Shortcut | Gives you |
|---|---|
| `dc` | DECLARE @variable |
| `ie` | IF EXISTS (...) BEGIN ... END |
| `ine` | IF NOT EXISTS (...) BEGIN ... END |
| `ife` | IF ... ELSE |
| `be` | BEGIN ... END |
| `wl` | WHILE loop |
| `cur` | Cursor loop |
| `pr` | PRINT |
| `thr` | THROW an error |
| `wt` | WAITFOR DELAY |
| `tc` | TRY ... CATCH with transaction |
| `bt` | BEGIN TRANSACTION |
| `cmt` | COMMIT TRANSACTION |
| `rbt` | ROLLBACK TRANSACTION |
| `sno` | SET NOCOUNT ON |
| `sxa` | SET XACT_ABORT ON |
| `sio` | SET STATISTICS IO, TIME ON |
| `nl` | WITH (NOLOCK) |

**JSON and XML**

| Shortcut | Gives you |
|---|---|
| `jsn` | FOR JSON PATH |
| `oj` | OPENJSON(...) WITH (...) |
| `xmlp` | Comma list with FOR XML PATH |

**Explore the database**

| Shortcut | Gives you |
|---|---|
| `fc` | Find a column in all tables |
| `ftb` | Find a table by name |
| `fp` | Find text in procedures, views, functions |
| `rc` | Row counts for all tables |
| `cols` | Columns of a table |
| `sph` | sp_help |
| `spt` | sp_helptext (show object code) |
| `spi` | sp_helpindex |
| `spw` | sp_who2 |
| `go` | GO |
| `use` | USE database |
<!-- table:end -->

## Add, edit or remove shortcuts

Click **Shortcuts** in the status bar at the bottom of VS Code, or the key icon at the top right of a SQL file.

- **+ New**, **Duplicate** and **Delete** manage the list. **Save** (Ctrl+S) applies the change immediately.
- In *Expands to*, type the SQL. Put `{}` where you want to type something, and `{cursor}` where the cursor should end up. The preview shows the result.
- To type the same value in two places, put the same number in both, e.g. `{1}`.
- Untick *Expand on Space* for shortcuts you also type as normal words.
- **Import** and **Export** share shortcuts as a JSON file.

## Settings

In the shortcut editor, click the **gear** next to **+ New**, or run **SQL Shortcuts: Settings** from the Command Palette. Changes apply right away, and a preview shows how `ssf` and `up` will expand.

| Setting | Choices | Default |
|---|---|---|
| Expand when I press | Tab, Space, or both | both |
| Keyword case | `SELECT` (UPPERCASE), `select` (lowercase), or match how you typed the shortcut (`SSF` → `SELECT`, `ssf` → `select`) | UPPERCASE |
| Layout | each clause on its own line, or short queries on one line (`SELECT * FROM`) | own line |
| Semicolons | end statements with `;` or not (MERGE and THROW always keep theirs) | on |
| Suggestion pop-up | also list shortcuts in VS Code's suggestions | on |
| Status bar button | show **Shortcuts** at the bottom while a SQL file is open | on |

Two more are only in VS Code's Settings (search "SQL Shortcuts"): `sqlShortcuts.spaceExcludes` (shortcuts that expand only on Tab; easier to change with each shortcut's checkbox) and `sqlShortcuts.shortcutsFile` (keep your shortcuts file somewhere else, e.g. OneDrive).

## Build from source

```
npx @vscode/vsce package
code --install-extension sql-shortcuts-<version>.vsix
```

After changing `snippets/tsql.json`, run `node scripts/shortcut-table.js` and paste its output between the table markers above.
