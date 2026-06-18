# Water Logic & Flowscape — Distilled Reference

Source: *Edward de Bono's Water Logic Overview*, presented by Dale S. Deardorff (McQuaig Group, 2006), 74 slides.

## 1. Rock Logic vs Water Logic
- **Rock Logic** = traditional Western logic. Based on **"IS"** — identity, truth, contradiction, absolutes. Static. (Rock + rock = two rocks.)
- **Water Logic** = based on **"TO"** — flow. *What does this flow TO / lead TO / add up TO?* Dynamic, context-dependent. (Water + water = water.)
- A truth is often a truth only in a certain **context**; change the context → the flow direction may change.
- Mathematics sits between the two, based on **"="**.

## 2. Perception
- Perception = how the brain organizes outer-world information. The mind sees only what it is prepared to see; opposing views can be held in parallel (no contradiction).
- **Logic Bubble** = the bubble of perceptions/values within which a person acts logically — behavior is inevitable & justified *for that person*.
- We can't step outside our perceptions, but we can build a **map** of them: a **Flowscape**.

## 3. Jellyfish model (the atomic unit)
- Simplest organization: a round **body** + one **tentacle/sting** = a single directed link.
- A sting connects into *another* jellyfish, never itself.
- A body receives *many* stings but emits *one* → **each node has exactly ONE outgoing link ("leads TO"), many incoming.**
- Arrow = direction of flow (not positive/negative).

## 4. Structures that emerge
- **Chain** — A→B→C draining toward an end.
- **Collector / Collection point** — node many links feed into (a central theme / "meaning").
- **Stable Repeating Loop** — cycle the system settles into.
- **De Bono's Theorem:** *From any input, any system with a finite number of states and a tiring factor will always reach a stable repeating loop.*
- A system can form **two+ loops**; if both active, one dominates → a **Shift of Attention**.

## 5. The Flowscape method (the algorithm)
1. **Base List** — a wide, stream-of-consciousness list of one-liners about the problem. Not analytical. Label A, B, C…. May mix concepts + specifics (concepts tend to become collectors).
2. **Assign flow** — for each item ask *"what does this lead TO?"* and connect it to the one item it most leads to. Be honest; don't contrive the result.
3. **First draft graph** — find the most-targeted letter, place it, connect everything flowing into it. Messy/crossing lines are normal.
4. **Final draft** — tidy layout; verify every letter is present and counted once (completeness matters more than perfect arrows).
5. **Read the structure** — identify Collector point(s), Chain(s), Stable Loop(s), Working points, Peripheral points.

## 6. Acting on a Flowscape (Intervention)
- **Strengthen a link**, **insert a new node (X)** into a loop, or **re-route a path** to change which stable loop forms → changes the outcome.
- Robust Flowscapes resist single-point changes.
- Intervention can **split** a Flowscape into separate loops (e.g., Culture Loop vs Economic Loop).

## 7. Favored paths (basis of "weights")
- Where a state *could* lead to more than one other, mark the **favored path** with a double-slash `//` at its start — "under these circumstances A is more likely succeeded by B than C."
- Context/conditions change → favored path (and the loop) shifts. ("Under conditions X, A always flows to B.")

## 8. Worked examples in the deck (single-out-link base lists)
- **Noisy Neighbors** → stable loop **F-G-E**, collector C, vital link H.
- **Office Admin Retire** → collectors B & I, chain H-C-F-G, loop B-E.
- **Gas Price War** → loops F-H (business) & G-D (marketing), collector G.
- **Absenteeism** → collectors B & A, chain C-E-G, loop B-D.
- **Juvenile Crime** → collector J, stable loop J-H-O; interventions: strengthen J→R, insert X, or split into Culture/Economic loops.

## 9. Concepts
- A **Concept** = generalized idea; acts as collector + connector. **Lumping** (join unrelated → new name) vs **Splitting** (one name → two concepts).
- Keep moving between **detail level** and **concept level** — basis of constructive thinking.

## 10. Attention Flow
- Perception is internal; **Attention Flow** is directed outward and can trigger new perceptions.
- Overall attention = several **exploratory loops**; tracks that return full-circle are most appealing.
- Tools like **NSEW** deliberately direct attention to broaden perception.

## 11. Six Thinking Hats (companion framework)
de Bono's parallel-thinking tool — each "hat" is one mode of thinking:
- **White** — facts / information ("just the facts").
- **Yellow** — value / optimism; probe for benefit.
- **Black** — risk / caution; spot difficulties (most powerful, easily overused).
- **Red** — feeling / intuition; emotions, hunches, likes & dislikes.
- **Green** — creativity; possibilities, alternatives, new ideas / perceptions.
- **Blue** — process / control; manages the thinking itself so the guidelines are observed.

In our app the hats serve double duty: they **tag nodes** (what *kind* of thinking each one-liner is) and they **seed accent palettes**.

---

## Mapping to OUR Flowscape SPA variation (from the brief — extends de Bono)
- **Nodes** = one-liner list items; round, labeled A, B, C… by list sequence.
- **Two views, one model:** editable **List** ⇄ editable **Graph**, kept in sync.
- **Two weight types per path:** *path weight* (normal) and *strong path weight* (= de Bono's favored / double-slash path). The strong path can be drawn as the **Classic ‖** double-slash (default), an animated **Flow** current (only the stable loop flows), or a plain **Arrow** (selectable).
- **Entry node:** any list item can be set as entry → re-sequences the flow following (strong) path weights; loops form from the weights. The entry node is visually distinct in the graph with a wide outer accent ring.
- **Incoming chips:** each list row shows the labels of nodes that point TO it on the left side. Clicking a chip opens an edge menu to toggle strong/normal or delete that incoming path.
- List order reflects the resolved flow; loops surface visually.
- **Right-click** → contextual modal at the click point to set weights on nodes/paths.
- **Light/dark** + color themes (start with blue/yellow).
- **Six Thinking Hats:** each node may be tagged with a hat (colored fill + legend; right-click to assign), and the theme menu also offers hat-colored accent palettes.
- **Export / Import:** the full localStorage store can be downloaded as a `.json` file and re-imported (merge by ID) for backup and transfer between browsers.

> **Divergence to confirm at planning time:** pure de Bono = exactly ONE outgoing "leads TO" per node. Our variation allows *multiple* outgoing paths distinguished by weight (normal vs strong), with the strong path driving the primary flow/sequence. This is a design decision for the SPA plan, not the distillation.
