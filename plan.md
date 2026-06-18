# Flowscape SPA — Plan & Architecture

An intuitive single-page app for **Water Logic / Flowscape** thinking (Edward de Bono).
Concepts live in [`Reference.md`](./Reference.md); this file is the build plan and architecture.

## Goal
Ponder a problem domain two ways at once — a **list of one-liner nodes** and a **directed graph** — kept in sync, where weighted "leads TO" paths reveal collector points and stable repeating loops.

## Design decisions (confirmed)
1. **Path model** — each node has **at most one STRONG out-link** (the favored "leads TO" that drives the flow sequence + loops) plus **any number of NORMAL out-links** (alternative paths; drawn but ignored by sequencing).
2. **Graph** — hand-rolled interactive **SVG** (round draggable nodes, right-click menus, theming). No graph library, no build step.
3. **Persistence** — client-side **localStorage** only. Pure static SPA, open `index.html` directly. (Bun/SQLite deferred.)
4. **List order** — node **labels are permanent** (A stays A). List **rows re-order** by walking strong paths from the **entry node**; the stable **loop** is grouped/highlighted; unreached nodes follow in label order.
5. **Six Thinking Hats** — per-node hat **tags** (colored fill + legend, right-click to assign) **and** hat-colored accent **palettes** in the theme menu.

## Files
| File | Role |
|------|------|
| `src/index.html` | App shell: toolbar (Flowscape switcher, New/Rename/Delete/Example/Reset, panel toggles, strong-path + palette + light/dark), List panel, SVG Graph panel, legend, context-menu + modal containers. |
| `src/styles.css` | All theming via CSS custom properties. `data-mode` (light/dark) controls surfaces; `data-palette` controls accents. Six-Hats + classic palettes; node/edge/legend/menu/modal styling. |
| `src/app.js` | Data model, localStorage persistence, list view, SVG graph view, interactions, flow-sequence algorithm. Vanilla JS, single IIFE. |
| `build.js` | Inlines `src/styles.css` + `src/app.js` into `src/index.html` → `app/index.html` (single-file build). |
| `app/index.html` | **Generated** single-file SPA (do not edit). |

## Data model
```js
Flowscape {
  id, name, createdAt, updatedAt,
  entryId,
  theme: { mode:'light'|'dark', palette, strongStyle:'flow'|'arrow'|'classic' },
  view:  { z, x, y },                            // pan/zoom of the graph (per Flowscape)
  nodes: [ { id, label, text, x, y, hat? } ],   // label A,B,…,Z,AA…; hat = white|yellow|black|red|green|blue
  edges: [ { id, from, to, strong } ]
}
// Invariant: at most one edge with strong:true per `from` node.
```
Persisted as `{ flowscapes:[…], currentId, ui:{ showList, showGraph } }` under localStorage key `flowscapes.v1`.

## Core algorithm — flow sequence & loop detection (`app.js`)
Because each node has ≤1 strong out-link, the strong-path walk is deterministic:
1. From `entryId`, follow the strong out-link, collecting `order[]` until a node repeats (→ loop) or has no strong out-link (→ sink).
2. If a node repeats, mark `order[loopStart..]` as the **stable loop**.
3. Remaining unvisited nodes are appended as **peripheral** (label order).
The list renders the sequence (loop highlighted) then peripheral; the graph styles loop nodes/edges and flags the highest in-degree node (≥3) as a **collector**.

## Two-way sync
A single in-memory `current` Flowscape is the source of truth. Any edit (list or graph) mutates it, then `render()` redraws both panels and `save()` persists. Small graphs (~10–26 nodes) re-render cheaply; drag is `requestAnimationFrame`-batched.

## Interactions
- **List:** add one-liner, double-click to edit, ★ set entry, ⋯ menu, loop rows grouped + pill-tagged, hat-colored dots.
- **Graph:** drag nodes; double-click to edit; normal edges thin; entry ring; loop accent; collector tint; hat-colored fills. Strong-path mark is selectable — **Classic ‖** (de Bono double-slash, default), **Flow** (animated current; only loop edges flow), or **Arrow** (plain end arrowhead).
- **Zoom / pan:** wheel (gentle step + 70 ms cooldown, zooms toward cursor) or **＋ / − / ⤢** controls (⤢ fits all). View saved per Flowscape.
- **Right-click:** node → set entry / edit / add path / hat picker / clear strong / delete · edge → toggle strong-normal / delete · canvas → add node here.
- **Theme:** light/dark toggle, palette menu (Six Hats + Classic), and Strong-path style selector. Stored per Flowscape.
- **Panels:** **List / Graph** toggles hide either panel (one always stays open); hiding the graph centers the list as a focused edit column.
- **Flowscapes:** create / rename / delete / switch named Problem-Domain views; **Example** menu loads worked cases (Noisy Neighbors, Office Admin Retire, Absenteeism — reused in place, no duplicates); **Reset** clears all saved data.

## Run & verify
- Single-file: open `app/index.html` directly. From source: `python3 -m http.server 8765` → `http://localhost:8765/src/index.html`. Rebuild the single file with `node build.js`.
- Smoke test: load **Example** → list reads A→C→H→F with **F-G-E** loop highlighted, C flagged collector; right-click to add a *normal* path (sequence unchanged) and toggle an edge strong/normal (loop updates live); tag nodes with hats; toggle dark + switch palette; reload → state persists.

## Deferred / out of scope
Bun server, SQLite, export/import, Mermaid snapshot view, multi-user, hat-based filtering of the graph.
