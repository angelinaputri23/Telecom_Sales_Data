# Telecom Sales Dashboard (weekly pcs, App vs POS, targets)

Three static pages, no build step — works on GitHub Pages.

| Page | What it shows |
|---|---|
| `index.html` | Weekly pcs per store, week-by-week store comparison table, carrier mix |
| `channel.html` | App vs POS per week, App share, index chart (needs App data) |
| `target.html` | Minimum / Target / Stretch per week and for the next 4 weeks, per store |

## Publish on GitHub
1. Create a repo, upload every file in this folder (keep them in the root).
2. Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<user>.github.io/<repo>/`.

## Data sources
- **Live Google Sheet**: the sheet must be shared "Anyone with the link can view". The ↻ button re-reads it. Sheet ID and tab names are at the top of `shared.js` (`CFG`).
- **Upload Excel/CSV**: ⬆ button; the file uses the same report layout (one tab per store). The upload is kept in your browser until you press ↻.
- **Offline snapshot**: `snapshot.js` is used automatically if the live read fails.

## App sales
The current file contains one channel per store. To compare App vs POS add a tab per store named `<store> APP` (same layout), add the tab name to `CFG.tabs`, or upload a file with those tabs.

## Cleaning rules (odd week labels are fixed silently and logged in the browser console)
- Week labels longer than 9 days → treated as the 7 days ending on the end date (e.g. `2026/10/01 - 2026/11/07` → 11/01–11/07).
- A week label that repeats → the second block is shifted +7 days.
- Weeks that are not 7 days long are compared as pcs per 7 days; unfinished weeks are excluded from targets.
- Tabs with identical numbers in every week are noted as likely placeholder data and counted once in "All stores".
- Pcs = net quantity (sales − returns); `合計` total rows are ignored and recomputed.

## Target method
Suggested target = weighted average of last 4 full weeks · Minimum = 25th percentile of last 8 weeks · Stretch = max(75th percentile, target +10%) · month = 4 weeks. The % box raises/lowers the suggested target and stretch.

### Your own target (editable)
In `target.html` every store row has a **Your target** box. Type a number (pcs per week) and the page recalculates everything against it: next-4-weeks total, how many of the last 4 weeks hit it, and the week-by-week results. It is saved in the browser (localStorage). Empty box = suggested target is used. Buttons: *Copy suggested → my targets*, *Clear my targets*.

### Change vs previous week
The table shows last week against the week before it (pcs and %), per store. The bottom table lists the last 12 finished weeks (newest first), each with its change vs the previous week and its difference vs the target.

### Raise / Keep / Lower advice
Looks at the last 4 finished weeks against the target in use:
- **Raise**: 3–4 weeks hit the target and the 4-week average is ≥5% above it (suggestion ≈ average × 1.05)
- **Lower**: 0–1 weeks hit it and the average is ≥5% below it (suggestion ≈ average)
- otherwise **Keep**

### Dates
Weeks are shown as `25 Oct – 31 Oct` (year only appears if it is not the current year). Exports keep ISO dates (`2026-10-25`) so spreadsheets can sort them.

Export: ⬇ CSV (current table) or ⬇ Excel (all tables) on every page.
