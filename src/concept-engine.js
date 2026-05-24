const STOP_WORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "also",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "during",
  "each",
  "for",
  "from",
  "had",
  "has",
  "have",
  "having",
  "how",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "may",
  "more",
  "most",
  "must",
  "not",
  "of",
  "on",
  "or",
  "other",
  "our",
  "out",
  "over",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "this",
  "through",
  "to",
  "under",
  "up",
  "use",
  "used",
  "using",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "within",
  "without",
  "would",
  "you",
  "your"
]);

const RELATION_PATTERNS = [
  { label: "defines", terms: ["is a", "is an", "refers to", "means", "defined as"] },
  { label: "causes", terms: ["causes", "drives", "leads to", "produces", "results in"] },
  { label: "depends on", terms: ["depends on", "requires", "needs", "is controlled by"] },
  { label: "measures", terms: ["measures", "estimates", "tracks", "observes"] },
  { label: "improves", terms: ["improves", "increases", "raises", "strengthens"] },
  { label: "reduces", terms: ["reduces", "decreases", "lowers", "limits"] },
  { label: "contrasts with", terms: ["unlike", "whereas", "contrasts", "compared with"] },
  { label: "examples include", terms: ["for example", "such as", "including", "e.g."] }
];

export const DEMO_NOTES = `Demo study note: retrieval practice

Retrieval practice means trying to recall an idea before looking back at the source.
Spacing depends on time gaps between review attempts and helps expose weak memory links.
Interleaving contrasts with blocked practice because similar problem types are mixed during review.
A concept map connects terms with labeled relationships so a learner can explain why ideas belong together.
Evidence in a course note should stay attached to the sentence or page where the learner found it.
Open question: when does a worked example help more than a blank recall prompt?`;

export function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitSentences(text) {
  const clean = normalizeText(text);
  if (!clean) {
    return [];
  }

  return clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/^[-*]\s*/, "").trim())
    .filter((sentence) => sentence.length > 18);
}

function tokenize(sentence) {
  return sentence
    .toLowerCase()
    .replace(/['']/g, "")
    .match(/[a-z][a-z0-9-]{2,}/g) || [];
}

function phraseKey(words) {
  return words.join(" ");
}

function titleCase(phrase) {
  return phrase.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function scorePhrase(words, sentenceIndex) {
  const lengthBonus = words.length === 1 ? 1 : words.length === 2 ? 1.65 : 1.9;
  const earlyBonus = Math.max(0.2, 1 - sentenceIndex * 0.04);
  const specificity = words.some((word) => word.includes("-")) ? 0.25 : 0;
  return lengthBonus + earlyBonus + specificity;
}

export function extractConcepts(sentences, limit = 9) {
  const scores = new Map();
  const evidence = new Map();

  sentences.forEach((sentence, sentenceIndex) => {
    const words = tokenize(sentence).filter((word) => !STOP_WORDS.has(word));
    const seenInSentence = new Set();

    for (let size = 1; size <= 3; size += 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        const grams = words.slice(index, index + size);
        if (grams.some((word) => STOP_WORDS.has(word))) {
          continue;
        }
        const key = phraseKey(grams);
        if (key.length < 4 || seenInSentence.has(key)) {
          continue;
        }
        seenInSentence.add(key);
        scores.set(key, (scores.get(key) || 0) + scorePhrase(grams, sentenceIndex));
        if (!evidence.has(key)) {
          evidence.set(key, sentence);
        }
      }
    }
  });

  const entries = [...scores.entries()]
    .filter(([phrase]) => ![...scores.keys()].some((other) => other !== phrase && other.includes(phrase) && scores.get(other) >= scores.get(phrase)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return entries.map(([phrase, score], index) => ({
    id: `c${index + 1}`,
    term: titleCase(phrase),
    key: phrase,
    score: Number(score.toFixed(2)),
    evidence: evidence.get(phrase)
  }));
}

function sentenceContains(sentence, concept) {
  const lower = sentence.toLowerCase();
  return concept.key.split(" ").every((word) => lower.includes(word));
}

function detectRelationLabel(sentence) {
  const lower = sentence.toLowerCase();
  const match = RELATION_PATTERNS.find((pattern) => pattern.terms.some((term) => lower.includes(term)));
  return match ? match.label : "appears with";
}

export function buildRelations(sentences, concepts, limit = 10) {
  const relationMap = new Map();

  sentences.forEach((sentence) => {
    const present = concepts.filter((concept) => sentenceContains(sentence, concept));
    for (let i = 0; i < present.length; i += 1) {
      for (let j = i + 1; j < present.length; j += 1) {
        const source = present[i];
        const target = present[j];
        const key = [source.id, target.id].sort().join(":");
        if (!relationMap.has(key)) {
          relationMap.set(key, {
            source: source.id,
            target: target.id,
            sourceTerm: source.term,
            targetTerm: target.term,
            label: detectRelationLabel(sentence),
            evidence: sentence
          });
        }
      }
    }
  });

  return [...relationMap.values()].slice(0, limit);
}

export function makeRecallPrompts(concepts, relations) {
  const relationPrompts = relations.slice(0, 4).map((relation) => ({
    type: "link",
    prompt: `Explain why "${relation.sourceTerm}" ${relation.label} "${relation.targetTerm}".`,
    check: relation.evidence
  }));

  const conceptPrompts = concepts.slice(0, Math.max(0, 6 - relationPrompts.length)).map((concept) => ({
    type: "concept",
    prompt: `Define "${concept.term}" from memory, then compare your answer with the source sentence.`,
    check: concept.evidence
  }));

  return [...relationPrompts, ...conceptPrompts];
}

export function assessGaps(sentences, concepts, relations) {
  const warnings = [];
  if (sentences.length < 4) {
    warnings.push("Add a few more source sentences so the map is not based on a tiny fragment.");
  }
  if (concepts.length < 5) {
    warnings.push("Few reusable concepts were detected; add headings, key terms, or definitions.");
  }
  if (relations.length < 3) {
    warnings.push("Relationships are sparse; add sentences that connect ideas with verbs such as causes, depends on, contrasts with, or measures.");
  }

  const coveredConcepts = new Set(relations.flatMap((relation) => [relation.source, relation.target]));
  const isolated = concepts.filter((concept) => !coveredConcepts.has(concept.id)).slice(0, 3);
  if (isolated.length > 0) {
    warnings.push(`Isolated concepts need links: ${isolated.map((concept) => concept.term).join(", ")}.`);
  }

  return warnings;
}

export function analyzeNotes(text, options = {}) {
  const sentences = splitSentences(text);
  const concepts = extractConcepts(sentences, options.conceptLimit || 9);
  const relations = buildRelations(sentences, concepts, options.relationLimit || 10);
  const prompts = makeRecallPrompts(concepts, relations);
  const gaps = assessGaps(sentences, concepts, relations);

  return {
    sourceLength: normalizeText(text).length,
    sentenceCount: sentences.length,
    concepts,
    relations,
    prompts,
    gaps,
    generatedAt: new Date().toISOString()
  };
}

export function toMarkdown(analysis, title = "Concept Bridge Review") {
  const lines = [
    `# ${title}`,
    "",
    "> Local heuristic output. Verify against your course material, paper, lab notebook, or textbook before using it as a conclusion.",
    "",
    "## Concepts"
  ];

  analysis.concepts.forEach((concept) => {
    lines.push(`- **${concept.term}**: ${concept.evidence}`);
  });

  lines.push("", "## Relationships");
  if (analysis.relations.length === 0) {
    lines.push("- No relationships detected yet.");
  } else {
    analysis.relations.forEach((relation) => {
      lines.push(`- **${relation.sourceTerm}** ${relation.label} **${relation.targetTerm}**`);
      lines.push(`  - Source sentence: ${relation.evidence}`);
    });
  }

  lines.push("", "## Recall Prompts");
  analysis.prompts.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.prompt}`);
    lines.push(`   - Check against: ${item.check}`);
  });

  lines.push("", "## Gap Check");
  if (analysis.gaps.length === 0) {
    lines.push("- No obvious structural gaps detected by the heuristic.");
  } else {
    analysis.gaps.forEach((gap) => lines.push(`- ${gap}`));
  }

  return lines.join("\n");
}

function csvCell(value) {
  const cell = String(value ?? "");
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function toFlashcardCsv(analysis) {
  const rows = [["Front", "Back", "Type"]];

  analysis.prompts.forEach((item) => {
    rows.push([item.prompt, item.check, item.type]);
  });

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
