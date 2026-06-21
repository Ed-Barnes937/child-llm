/**
 * R4 — decorrelated non-LLM statistical/lexical safety classifier
 * (Phase 6.5.2, ADR-0003 three-opinion output validation).
 *
 * The third, *non-correlated* opinion on an output. R5 (gpt-4.1-nano judge) and
 * R3 (Llama Guard) are both transformers and can miss the same adversarial
 * input together; this is a pure-JS lexical scorer, so it fails on genuinely
 * different inputs — which is the entire point of a decorrelated vote. No model,
 * no network, no Python sidecar: deterministic and sub-millisecond, so it also
 * runs inside the 6.5.3 eval harness as a CI-gating layer (R3 and R5 cannot —
 * they are non-deterministic and need an API key).
 *
 * ADR-0003 names this slot "fastText / pure lexical". A trained fastText model
 * would need a Python training pipeline and a model artefact (no off-the-shelf
 * child-safety model exists), neither of which the Node/Hono pipeline can host.
 * The pure-lexical implementation fills the same decorrelated-third-vote role
 * with a clean JS-only path.
 *
 * Scope: it deliberately covers the *semantic* harm categories the deterministic
 * R2 blocklist structurally cannot — self-harm euphemism and reproduction/sexual
 * framing, where the harm is in the phrasing rather than a bannable token. Weapon
 * /drug/contact-info detection stays with the blocklist (R2); duplicating it here
 * would buy correlation, not decorrelation.
 */

import { canonicaliseForScan } from "./canonicalise.js";

export interface LexicalResult {
  safe: boolean;
  /** Safety categories that scored over threshold. */
  categories: string[];
  reason: string;
}

interface Feature {
  pattern: RegExp;
  weight: number;
}

// Weighted lexical features per safety category. A category fires when its
// summed feature weight reaches THRESHOLD. Patterns run against a *lowercased
// canonicalised scan copy* (homoglyphs folded, zero-width stripped, emoji mapped
// to words, de-leeted), so obfuscated variants score the same as plain text.
const CATEGORY_FEATURES: Record<string, Feature[]> = {
  "self-harm": [
    // Direct act against oneself ("knife myself", "kill myself", "cut myself").
    {
      pattern:
        /\b(?:kill|hurt|harm|cut|knife|stab|end|burn|choke)\s+(?:myself|yourself|himself|herself|themselves|herself)\b/,
      weight: 1,
    },
    // Wanting to perform the act ("want to end it", "wanting to hurt myself").
    {
      pattern:
        /\bwant(?:ing)?\s+to\s+(?:kill|hurt|harm|cut|knife|stab|end|disappear|die)\b/,
      weight: 1,
    },
    // Euphemistic ideation that dodges the sensitive-topic keyword patterns.
    {
      pattern:
        /\b(?:don'?t|do\s+not|dont)\s+want\s+to\s+(?:be\s+here|live|exist|wake\s+up|go\s+on)\b/,
      weight: 1,
    },
    { pattern: /\bnot\s+want\s+to\s+be\s+here\s+anymore\b/, weight: 1 },
    { pattern: /\bend\s+(?:it\s+all|my\s+life)\b/, weight: 1 },
    { pattern: /\bno\s+(?:point|reason)\s+(?:in\s+)?living\b/, weight: 1 },
  ],
  "sexual-reproduction": [
    // "Where do babies come from" and its framed variants.
    {
      pattern: /\bwhere\s+do\s+(?:babies|baby)\b[\s\S]*\bcome\s+from\b/,
      weight: 1,
    },
    // Reproduction wrapped in a story ("how new little ones are created/made").
    {
      pattern:
        /\b(?:little\s+ones|babies|new\s+life|new\s+little\s+ones)\b[\s\S]{0,40}\b(?:created|made|come\s+from|are\s+born)\b/,
      weight: 1,
    },
    {
      pattern:
        /\bhow\s+(?:are|do)\s+(?:babies|little\s+ones)\b[\s\S]{0,30}\b(?:made|created|come)\b/,
      weight: 1,
    },
  ],
  "sexual-explicit": [
    { pattern: /\b(?:nsfw|x-?rated|porn(?:ographic|o)?)\b/, weight: 1 },
    { pattern: /18\+/, weight: 1 },
    {
      pattern:
        /\bshow\s+me\s+(?:some\s+)?(?:adult|sexual|explicit)\s+(?:content|pictures|images|videos)\b/,
      weight: 1,
    },
  ],
};

const THRESHOLD = 1;

/**
 * Classify a piece of text (an AI response in the pipeline, or a trick-set case
 * in the harness) against the decorrelated safety categories. Deterministic and
 * sub-millisecond. Fails open *only* on empty input — there is nothing to flag.
 */
export const classifyLexical = (text: string): LexicalResult => {
  const scan = canonicaliseForScan(text).toLowerCase();

  const categories: string[] = [];
  for (const [category, features] of Object.entries(CATEGORY_FEATURES)) {
    let score = 0;
    for (const { pattern, weight } of features) {
      if (pattern.test(scan)) score += weight;
    }
    if (score >= THRESHOLD) categories.push(category);
  }

  if (categories.length === 0) {
    return { safe: true, categories: [], reason: "Lexical classifier: clear" };
  }

  return {
    safe: false,
    categories,
    reason: `Lexical classifier flagged: ${categories.join(", ")}`,
  };
};
