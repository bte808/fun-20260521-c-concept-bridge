import assert from "node:assert/strict";
import { DEMO_NOTES, analyzeNotes, sourceRef, splitSentences, toFlashcardCsv, toMarkdown } from "../src/concept-engine.js";

const sentences = splitSentences(DEMO_NOTES);
assert.ok(sentences.length >= 5, "demo should provide enough source sentences");

const analysis = analyzeNotes(DEMO_NOTES);
assert.equal(analysis.sentenceCount, sentences.length);
assert.equal(analysis.sourceSentences.length, analysis.sentenceCount);
assert.equal(sourceRef(0), "S1");
assert.ok(analysis.concepts.length >= 6, "analysis should extract useful concepts");
assert.ok(analysis.relations.length >= 2, "analysis should build concept links");
assert.ok(analysis.prompts.length >= 4, "analysis should produce recall prompts");

const conceptTerms = analysis.concepts.map((concept) => concept.term.toLowerCase()).join(" ");
assert.match(conceptTerms, /retrieval|practice|concept|map/);

for (const concept of analysis.concepts) {
  assert.ok(concept.evidence.length > 20, "concepts must retain source evidence");
  assert.ok(Number.isInteger(concept.evidenceIndex), "concepts should carry a source sentence index");
}

for (const relation of analysis.relations) {
  assert.ok(relation.sourceTerm);
  assert.ok(relation.targetTerm);
  assert.ok(relation.evidence.includes(relation.sourceTerm.split(" ")[0].toLowerCase()) || relation.evidence.length > 20);
  assert.ok(Number.isInteger(relation.evidenceIndex), "relations should carry a source sentence index");
}

for (const prompt of analysis.prompts) {
  assert.match(prompt.sourceRef, /^S\d+$/);
}

const shortAnalysis = analyzeNotes("Term alpha is linked to term beta.");
assert.ok(shortAnalysis.gaps.length > 0, "tiny notes should warn about gaps");

const markdown = toMarkdown(analysis, "Demo Review");
assert.match(markdown, /^# Demo Review/);
assert.match(markdown, /Local heuristic output/);
assert.match(markdown, /## Recall Prompts/);
assert.match(markdown, /## Source Sentences/);
assert.match(markdown, /\(S\d+\)/);

const csv = toFlashcardCsv(analysis);
assert.match(csv, /^Front,Back,Type/);
assert.match(csv, /Define|Explain/);

const escapedCsv = toFlashcardCsv({
  prompts: [
    {
      type: "link",
      prompt: 'Explain "Alpha, Beta"',
      check: "Line one\nLine two"
    }
  ]
});
assert.match(escapedCsv, /"Explain ""Alpha, Beta"""/);
assert.match(escapedCsv, /"Line one\nLine two"/);

console.log("Concept engine checks passed.");
