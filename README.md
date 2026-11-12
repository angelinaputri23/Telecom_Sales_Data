# Xmart Telecom Dashboard

One `index.html` (no build, no dependencies) + `data/snapshot.json` (the Excel data as a backup).
Same look as the Xmart store dashboard. Six tabs:

1. **Weekly Sales** – cards sold each week, change vs the week before, best sellers
2. **Next Week Target** – suggested target, your own target, and whether it is realistic
3. **Branches** – branches side by side for any week
4. **Products** – which products sell more / less than the week before
5. **Data Check** – is the data complete and correct
6. **Lele vs POS** – online (Lele) orders vs branch (POS) sales: weekly, by branch, phone company and product, plus Lele extras (points vs cash, repeat customers, busiest day/hour)

Tick **Show explanations** (top right) to open every ℹ help box.

## Put it online (GitHub Pages)
1. Create a repo and upload `index.html` and the `data/` folder.
2. Settings → Pages → Branch `main` / root → Save.
3. Open `https://<username>.github.io/<repo>/`.

## Update the data (3 ways)
- **⟳ Refresh data** – reads the Google Sheet (needs: Share → Anyone with the link → Viewer). The Sheet ID is already in `CONFIG`. It also tries this by itself when the page opens.
- **⬆ Upload file** – pick the Excel file (.xlsx) from your computer. One sheet = one branch.
- If both fail, the built-in data (`data/snapshot.json`) is shown.

## How the target works (Tab 2)
1. Take the weeks you choose in **Based on** (e.g. the last 4 weeks) and look at how many cards were sold in each.
2. Average them (total ÷ number of weeks).
3. Add the **Extra growth %** (default 10%).
4. That is the **suggested target**. It is shown with all the numbers, so you can follow the calculation.

Type your own number in the blue **My target** box to replace the suggestion. The page then shows: cards needed per day, growth compared with last week, in how many of the last 4 weeks the target would have been reached, and a comment:
- **Looks easy** – reached in 3–4 of the last 4 weeks (you could aim higher)
- **Looks reasonable** – in between
- **Looks hard** – reached in 0–1 of the last 4 weeks (maybe lower it)

“Use suggested numbers for all” fills every box; “Clear my numbers” empties them. Your numbers are saved in your browser only.

## Settings (top of the script in `index.html`, `CONFIG`)
- `STORES` – sheet tab → branch name (add a line for a new branch)
- `FIX_OVERLAP` – a date range that overlaps earlier weeks is counted as the week right after the previous one
- `DEFAULT_WEEKS`, `DEFAULT_GROWTH` – starting values for the target
- `AUTO_LIVE` – read Google Sheets automatically on opening

## Things to know about the current data
- Dewei, Daxue, Hunei and Tainan have **exactly the same numbers** in every week (only Minghu differs). Probably one report was pasted into 4 tabs. The page warns about it and counts them once in “All branches” (untick the box to count all).
- The last date range in each tab, `2026/10/01 - 2026/11/07`, overlaps October. It is counted as 1–7 Nov.
- Daxue (811001 DT) and Hunei (829001 FN) were matched by postal code. Please confirm in `STORES`.
- All numbers are after returns. The first week (1–8 Aug) has 8 days and is scaled to 7 days in averages.

## Lele data
- Tab `LELE_Sales` (`CONFIG.LELE_TAB`) is read the same 3 ways (Google Sheet, upload, built-in). Orders are grouped into the same Sunday–Saturday weeks by order date.
- In `data/snapshot.json` customer names are removed and member IDs are hashed.
- The newest Excel file no longer has identical numbers in Dewei/Daxue/Hunei/Tainan, so the duplicate warning should disappear.
