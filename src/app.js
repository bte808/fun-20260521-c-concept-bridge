import { DEMO_NOTES, analyzeNotes, sourceRef, toFlashcardCsv, toMarkdown } from "./concept-engine.js";

const notesInput = document.querySelector("#notes-input");
const titleInput = document.querySelector("#title-input");
const analyzeButton = document.querySelector("#analyze-button");
const demoButton = document.querySelector("#demo-button");
const clearButton = document.querySelector("#clear-button");
const copyMarkdownButton = document.querySelector("#copy-markdown");
const downloadMarkdownButton = document.querySelector("#download-markdown");
const downloadCsvButton = document.querySelector("#download-csv");
const downloadJsonButton = document.querySelector("#download-json");
const downloadSvgButton = document.querySelector("#download-svg");
const statusLine = document.querySelector("#status-line");
const conceptList = document.querySelector("#concept-list");
const relationList = document.querySelector("#relation-list");
const promptList = document.querySelector("#prompt-list");
const gapList = document.querySelector("#gap-list");
const sourceList = document.querySelector("#source-list");
const mapCanvas = document.querySelector("#map-canvas");
const emptyState = document.querySelector("#empty-state");

let currentAnalysis = null;

function setStatus(message) {
  statusLine.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text, maxLength = 18) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    if ((line + " " + word).trim().length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  });
  if (line) {
    lines.push(line);
  }

  return lines.slice(0, 3);
}

function renderConcepts(analysis) {
  conceptList.innerHTML = "";
  analysis.concepts.forEach((concept) => {
    const item = document.createElement("li");
    item.className = "concept-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(concept.term)}</strong>
        <span>score ${concept.score}</span>
        <span class="source-badge">${sourceRef(concept.evidenceIndex)}</span>
      </div>
      <p>${escapeHtml(concept.evidence)}</p>
    `;
    conceptList.appendChild(item);
  });
}

function renderRelations(analysis) {
  relationList.innerHTML = "";
  if (analysis.relations.length === 0) {
    relationList.innerHTML = '<li class="muted-row">No relationships yet. Add notes with two or more repeated key terms in the same sentence.</li>';
    return;
  }

  analysis.relations.forEach((relation) => {
    const item = document.createElement("li");
    item.className = "relation-item";
    item.innerHTML = `
      <div class="relation-line">
        <strong>${escapeHtml(relation.sourceTerm)}</strong>
        <span>${escapeHtml(relation.label)}</span>
        <strong>${escapeHtml(relation.targetTerm)}</strong>
        <span class="source-badge">${sourceRef(relation.evidenceIndex)}</span>
      </div>
      <p>${escapeHtml(relation.evidence)}</p>
    `;
    relationList.appendChild(item);
  });
}

function renderPrompts(analysis) {
  promptList.innerHTML = "";
  analysis.prompts.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "prompt-item";
    row.innerHTML = `
      <span>${index + 1}</span>
      <div>
        <strong>${escapeHtml(item.prompt)}</strong>
        <span class="source-badge">${escapeHtml(item.sourceRef || "Source")}</span>
        <p>${escapeHtml(item.check)}</p>
      </div>
    `;
    promptList.appendChild(row);
  });
}

function renderGaps(analysis) {
  gapList.innerHTML = "";
  const gaps = analysis.gaps.length ? analysis.gaps : ["No obvious structural gaps detected by the heuristic."];
  gaps.forEach((gap) => {
    const item = document.createElement("li");
    item.textContent = gap;
    gapList.appendChild(item);
  });
}

function renderSources(analysis) {
  sourceList.innerHTML = "";
  analysis.sourceSentences.forEach((sentence) => {
    const item = document.createElement("li");
    item.className = "source-item";
    item.innerHTML = `
      <strong>${escapeHtml(sentence.id)}</strong>
      <p>${escapeHtml(sentence.text)}</p>
    `;
    sourceList.appendChild(item);
  });
}

function nodePosition(index, total) {
  if (total === 1) {
    return { x: 360, y: 235 };
  }
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  const x = 360 + Math.cos(angle) * 240;
  const y = 235 + Math.sin(angle) * 150;
  return { x, y };
}

function renderMap(analysis) {
  if (analysis.concepts.length === 0) {
    mapCanvas.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  const positions = new Map(analysis.concepts.map((concept, index) => [concept.id, nodePosition(index, analysis.concepts.length)]));

  const edges = analysis.relations.map((relation) => {
    const source = positions.get(relation.source);
    const target = positions.get(relation.target);
    if (!source || !target) {
      return "";
    }
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    return `
      <line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" class="edge" />
      <text x="${midX}" y="${midY}" class="edge-label">${escapeHtml(relation.label)}</text>
    `;
  }).join("");

  const nodes = analysis.concepts.map((concept) => {
    const position = positions.get(concept.id);
    const lines = wrapText(concept.term);
    const label = lines.map((line, index) => (
      `<tspan x="${position.x}" dy="${index === 0 ? 0 : 17}">${escapeHtml(line)}</tspan>`
    )).join("");
    return `
      <g class="node" transform="translate(${position.x} ${position.y})">
        <circle r="52"></circle>
        <text text-anchor="middle" dominant-baseline="middle" y="${lines.length === 1 ? 0 : -9}">${label}</text>
      </g>
    `;
  }).join("");

  mapCanvas.innerHTML = `
    <svg viewBox="0 0 720 470" role="img" aria-label="Concept map preview">
      <rect x="0" y="0" width="720" height="470" class="map-bg"></rect>
      ${edges}
      ${nodes}
    </svg>
  `;
}

function renderAll(analysis) {
  renderConcepts(analysis);
  renderRelations(analysis);
  renderPrompts(analysis);
  renderGaps(analysis);
  renderSources(analysis);
  renderMap(analysis);
  setStatus(`${analysis.sentenceCount} source sentences, ${analysis.concepts.length} concepts, ${analysis.relations.length} links.`);
}

function runAnalysis() {
  const notes = notesInput.value.trim();
  if (!notes) {
    setStatus("Paste notes or load the demo before analyzing.");
    notesInput.focus();
    return;
  }
  currentAnalysis = analyzeNotes(notes);
  renderAll(currentAnalysis);
}

function ensureAnalysis() {
  if (!currentAnalysis) {
    runAnalysis();
  }
  return Boolean(currentAnalysis);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function filenameFromTitle(title, fallback) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || fallback;
}

function buildMarkdown() {
  return toMarkdown(currentAnalysis, titleInput.value.trim() || "Concept Bridge Review");
}

async function copyMarkdown() {
  if (!ensureAnalysis()) {
    return;
  }
  const markdown = buildMarkdown();

  try {
    await navigator.clipboard.writeText(markdown);
    setStatus("Markdown copied. Keep source checks attached when you reuse it.");
  } catch (error) {
    console.warn("Clipboard copy was blocked; downloading Markdown instead.", error);
    const filename = `${filenameFromTitle(titleInput.value.trim(), "concept-bridge-review")}.md`;
    download(filename, markdown, "text/markdown");
    setStatus("Clipboard was blocked, so Markdown downloaded instead.");
  }
}

function downloadMarkdown() {
  if (!ensureAnalysis()) {
    return;
  }
  const filename = `${filenameFromTitle(titleInput.value.trim(), "concept-bridge-review")}.md`;
  download(filename, buildMarkdown(), "text/markdown");
  setStatus("Markdown file downloaded.");
}

function downloadJson() {
  if (!ensureAnalysis()) {
    return;
  }
  download("concept-bridge-review.json", JSON.stringify(currentAnalysis, null, 2), "application/json");
  setStatus("JSON exported.");
}

function downloadCsv() {
  if (!ensureAnalysis()) {
    return;
  }
  const filename = `${filenameFromTitle(titleInput.value.trim(), "concept-bridge-review")}-flashcards.csv`;
  download(filename, toFlashcardCsv(currentAnalysis), "text/csv");
  setStatus("Flashcard CSV exported.");
}

function downloadSvg() {
  if (!ensureAnalysis()) {
    return;
  }
  const svg = mapCanvas.querySelector("svg");
  if (!svg) {
    setStatus("Analyze notes before exporting the SVG map.");
    return;
  }
  download("concept-bridge-map.svg", svg.outerHTML, "image/svg+xml");
  setStatus("SVG map exported.");
}

function resetToDemo() {
  notesInput.value = DEMO_NOTES;
  titleInput.value = "Retrieval Practice Concept Bridge";
  runAnalysis();
}

function clearWorkspace() {
  notesInput.value = "";
  currentAnalysis = null;
  conceptList.innerHTML = "";
  relationList.innerHTML = "";
  promptList.innerHTML = "";
  gapList.innerHTML = "";
  sourceList.innerHTML = "";
  mapCanvas.innerHTML = "";
  emptyState.hidden = false;
  setStatus("Workspace cleared.");
  notesInput.focus();
}

analyzeButton.addEventListener("click", runAnalysis);
demoButton.addEventListener("click", resetToDemo);
clearButton.addEventListener("click", clearWorkspace);
copyMarkdownButton.addEventListener("click", copyMarkdown);
downloadMarkdownButton.addEventListener("click", downloadMarkdown);
downloadCsvButton.addEventListener("click", downloadCsv);
downloadJsonButton.addEventListener("click", downloadJson);
downloadSvgButton.addEventListener("click", downloadSvg);

resetToDemo();
