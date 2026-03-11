# SourceEX – Ressources externes

A userscript that lists **external resources** (scripts, stylesheets, images, etc.) loaded by each page you visit. It shows a small widget you can open to browse and export the data.

## Features

- **Per-URL tracking** — Each visited page is stored with its list of external resource URLs and types (script, link, img, etc.).
- **Search / filter** — Filter the list of pages by text; the search value is kept when you switch tabs or navigate.
- **Clickable links** — Page URLs and resource URLs open in a new tab when clicked.
- **Export to CSV**
  - **Export all** — One CSV with all pages and their resources (columns: `page_url`, `resource_type`, `resource_url`).
  - **Per page** — An “Export” button on each row to download a CSV for that page only.
- **Draggable & resizable panel** — Move the widget and resize it; position and size are saved.
- **Refresh** — Re-scan the current page’s resources.
- **Clear** — Remove all stored data.

## Installation

1. Install a userscript manager (e.g. [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)).
2. Open `sourceex-widget.user.js` and let the extension install it, or copy the script into a new script in the manager.

## Usage

- Click the **SourceEX** button (top-right by default) to open the panel.
- The list shows every stored page URL; click a row to expand and see its external resources.
- Use the search field to filter pages; type to filter, the value is persisted across tabs/navigation.
- Use **Refresh** to update the current page’s list, **Export all** to download everything as CSV, **Export** on a row to export that page only.
- Drag the handle (⋮⋮) to move the widget; use the corner handles to resize.

## Requirements

- A browser with a userscript manager (Tampermonkey, Violentmonkey, etc.).
- The script uses `GM.setValue` / `GM.getValue` for storage (position, size, panel state, search filter, and page data).

## License

See the project’s repository for license information.
