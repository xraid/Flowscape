# Flowscape — Water Logic SPA

An intuitive single-page app for **Water Logic / Flowscape** thinking (Edward de Bono).
Map a problem domain as a **list of one-liner nodes** and a synced **directed graph**; weighted
"leads TO" paths reveal collector points and stable repeating loops. Nodes can be tagged with
de Bono's **Six Thinking Hats**.

- Concepts & method → [`Reference.md`](./Reference.md)
- Build plan & architecture → [`plan.md`](./plan.md)

## Run

**Single-file build** — open `app/index.html` directly (no server needed):

```bash
open app/index.html
```

**From source** (the editable version in `src/`):

```bash
python3 -m http.server 8765      # then visit http://localhost:8765/src/index.html
```

**Rebuild** the single file after editing `src/`:

```bash
node build.js                    # inlines src/styles.css + src/app.js → app/index.html
```

Everything is saved in your browser's **localStorage** (key `flowscapes.v1`).

## Toolbar buttons

| Control | What it does |
|---------|--------------|
| **Flowscape dropdown** | Switch between saved Flowscapes (Problem-Domain views). |
| **New** | Create a new, empty Flowscape. |
| **Rename** | Rename the current Flowscape. |
| **Delete** | Delete the current Flowscape. |
| **Example** | Opens a menu of worked examples — **Noisy Neighbors**, **Office Admin Retire**, **Absenteeism from Work**. Each reuses its existing copy (never piles up duplicates). |
| **Reset** | Clear **all** saved Flowscapes from this browser and reload with a fresh example (asks for confirmation). |
| **Export** | Download all Flowscapes as a dated `.json` file (full localStorage snapshot). |
| **Import** | Load a previously exported `.json` — merges new Flowscapes in (duplicates by ID are skipped). |
| **Strong path** | How favored (strong) paths are drawn: **Classic ‖** (de Bono's double-slash, default), **Flow ▸▸** (animated current — only the stable loop flows), or **Arrow ▸** (plain end arrowhead). Saved per Flowscape. |
| **Palette** | Color theme: **Six Hats** palettes or **Classic**. Drives the strong-path & loop accent colors. |
| **List / Graph** | Show or hide each panel (the visible one expands to fill). Hiding the graph centers the list as a focused, wider edit column. At least one stays open. |
| **🌙 / ☀️** | Toggle light / dark mode. |

Theme choice is stored per Flowscape.

## Working in the app

**List panel**
- Type a one-liner and press **Enter** (or **＋**) to add a node (labeled A, B, C…; labels are permanent).
- **Double-click** a row's text to edit it.
- **Incoming chips** (left of each row) — one chip per node that points TO this node. Strong incoming paths are accent-colored. **Click** a chip to open its edge menu (toggle strong/normal or delete).
- **★** sets that node as the **entry** — the list then re-orders by following strong paths from it.
- **⋯** opens the node menu.
- Rows in the stable **loop** are grouped and tagged.

**Graph panel**
- **Zoom:** mouse wheel (zooms toward the cursor) or the **＋ / − / ⤢** controls (⤢ fits all nodes to view). Zoom level shows in the panel header and is saved per Flowscape.
- **Pan:** drag an empty area of the canvas.
- **Drag** nodes to reposition.
- **Double-click** a node to edit its text.
- **Strong** paths are thick with a double-slash mark (the favored "leads TO"); **normal** paths are thin alternatives.
- The **entry node** has a prominent double ring (inner filled circle + wider outer ring in accent color); loop nodes/edges are accented; the busiest node (collector) is tinted.
- A **legend** above the graph shows the six hats and their meanings.

**Right-click (context menus)**
- **Node** → Set as entry · Edit text · Add path TO… · pick a **Thinking hat** · Clear strong path · Delete.
- **Edge** → Make strong / normal · Delete path.
- **Canvas** → Add node here.

> Each node has at most **one strong** out-link (it drives the flow sequence and loops). Setting a new
> strong path automatically demotes the previous one to normal. Normal paths are drawn but do not affect
> the sequence.

## Six Thinking Hats

Tag any node with a hat to mark what *kind* of thinking it is:

| Hat | Meaning |
|-----|---------|
| ⚪ White | Facts / information |
| 🟡 Yellow | Value / optimism |
| ⚫ Black | Risk / caution |
| 🔴 Red | Feeling / intuition |
| 🟢 Green | Creativity / ideas |
| 🔵 Blue | Process / control |

## Backup, restore, and reset

Your Flowscapes live in `localStorage` (key `flowscapes.v1`).

- **Backup** — click **Export** in the toolbar to save a dated `.json` snapshot.
- **Restore / merge** — click **Import** and select a previously exported file. Existing Flowscapes are kept; only new IDs are added.
- **Reset all** — click **Reset** in the toolbar (asks for confirmation) to wipe everything and reload a fresh example. Back up first with Export if needed.
- **Delete one** — select it in the dropdown and click **Delete**.

## Files

| File | Role |
|------|------|
| `src/index.html` | App shell / markup. |
| `src/styles.css` | Theming (CSS custom properties), layout, components. |
| `src/app.js` | Model, persistence, list & SVG graph views, interactions, flow algorithm. |
| `build.js` | Inlines `src/` into the single-file `app/index.html`. |
| `app/index.html` | **Generated** single-file SPA — do not edit; rebuild from `src/`. |
| `Reference.md` | Distilled Water Logic / Flowscape reference. |
| `plan.md` | Build plan & architecture. |
| `In2In_Water_Logic_Final.pdf` | Source material. |
