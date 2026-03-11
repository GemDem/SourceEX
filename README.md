# SourceEX – Ressources externes

A userscript that lists **external resources** (scripts, stylesheets, images, XHR/fetch, etc.) loaded by each page you visit. It shows a small widget you can open to browse, filter by type, and export the data.

## Features

- **Per-URL tracking** — Each visited page is stored with its list of external resource URLs and types (script, link, img, fetch, etc.).
- **Category filters** — When a page is expanded, filter resources by type: **all**, **css**, **js**, **img**, **xhr**, **other**. Counts are shown per category.
- **Search / filter** — Filter the list of pages by text; the search value is kept when you switch tabs or navigate.
- **Clickable links** — Page URLs and resource URLs open in a new tab when clicked.
- **Export to CSV**
  - **Export all** — One CSV with all pages and their resources (columns: `page_url`, `resource_type`, `resource_url`).
  - **Per page** — An “Export” button on each row to download a CSV for that page only.
- **Draggable & resizable panel** — Move the widget (drag handle or title bar) and resize from either bottom corner; position and size are saved.
- **Refresh** — Re-scan the current page’s resources.
- **Clear** — Remove all stored data.
- **Minimal tab** — Option to hide the main “SourceEX” button and show a compact “SX” tab instead (state is saved).
- **Keyboard shortcuts**
  - **Ctrl+Shift+X** — Fully hide or show the widget (handy when the button is minimized).
- **Live updates** — While the panel is open, new resources loaded by the page are detected and the list updates automatically.

## Installation

1. Install a userscript manager (e.g. [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)).
2. Open `sourceex-widget.user.js` and let the extension install it, or copy the script into a new script in the manager.

## Usage

- Click the **SourceEX** button (top-right by default) to open the panel. If you use the minimal “SX” tab, click it instead.
- The list shows every stored page URL; click a row to expand and see its external resources.
- Use the **category buttons** (all, css, js, img, xhr, other) in an expanded row to filter resources by type.
- Use the search field to filter pages; the value is persisted across tabs and navigation.
- Use **Refresh** to update the current page’s list, **Export all** to download everything as CSV, and **Export** on a row to export that page only.
- Drag the handle (⋮⋮) or the title bar to move the widget; use the bottom-left or bottom-right corner to resize.

## Requirements

- A browser with a userscript manager (Tampermonkey, Violentmonkey, etc.).
- The script uses `GM.setValue` / `GM.getValue` for storage (position, size, panel state, search filter, button/minimal state, full hide state, and page data). It may use `GM_addElement` when available for injecting styles.

## License



Copyright 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
