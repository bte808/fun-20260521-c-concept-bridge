# Concept Bridge

Concept Bridge is a tiny local academic helper that turns rough study notes into a concept map, recall prompts, and exportable review material.

It is built for one focused workflow:

1. Paste course notes, paper notes, or lab notes.
2. Generate candidate concepts, source-tied relationships, and recall prompts.
3. Copy Markdown or export JSON/SVG for a study deck, research journal, or class review sheet.

The tool runs fully in the browser. It does not call an AI service, cite papers, or infer truth. Every generated concept and relationship keeps a source sentence so you can verify it against the original material.
Source labels such as `S1` and `S2` now appear in the UI and Markdown export, so every concept, link, and recall prompt can be traced back to the exact source sentence ledger.

## Why This Is Useful

Concept maps are good for learning because they force you to name relationships, not just list terms. Concept Bridge makes the first draft fast, then keeps the output checkable. It is useful when a learner has a dense paragraph from a textbook, lecture, paper abstract, or lab note and wants a compact review scaffold.

## Good Use Cases

- Turning lecture notes into a concept map before an exam.
- Making active-recall prompts from a paper-reading note.
- Checking whether a research note has isolated ideas that need better links.
- Exporting a simple SVG map for a report draft or study sheet.

## Academic Caution

Concept Bridge is only a local heuristic assistant. It can miss important terms, over-rank repeated words, or suggest weak links when two ideas happen to appear in the same sentence. It must not be used as a citation source, evidence source, or replacement for a textbook, paper, instructor material, or lab record.

The built-in notes are demo text only.

## Inspiration

This project was inspired by recent public interest in local knowledge graphs, concept-map study workflows, and lightweight research helpers:

- GitTrend on 2026-05-21 highlighted local code knowledge graphs and academic research assistant workflows: <https://gittrend.io/>
- Open Knowledge Maps shows how visual maps can support exploratory literature discovery: <https://library.harvard.edu/services-tools/open-knowledge-maps>
- ConceptMesh frames concept maps as a way to learn complex topics through connected ideas: <https://conceptmesh.com/>

Concept Bridge borrows only the broad workflow idea of making study structure visible. The implementation, design, demo text, and code are original.

## Run Locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:5174
```

No build step, account, token, or private environment is required.

## Checks

```bash
npm run check
npm test
```

## Core Features

- Default demo note that works on first load.
- Heuristic concept extraction from pasted notes.
- Relationship detection with source sentences attached.
- Source sentence ledger with `S1`/`S2` labels in the UI and Markdown export.
- SVG concept map preview.
- Active-recall prompt generation.
- Gap warnings for thin notes, sparse links, or isolated concepts.
- Copy-to-clipboard Markdown export.
- Markdown file download when clipboard access is blocked.
- CSV flashcard export for recall prompts with source sentence refs.
- JSON and SVG downloads.
- Responsive layout for desktop and mobile screens.

## Future Extensions

- Manual concept pinning and relation editing.
- Better multilingual tokenization.
- Optional import from Markdown headings.
- Side-by-side source sentence highlighting.
