import {
  RegExpMatcher,
  DataSet,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import { findPhoneNumbersInText } from "libphonenumber-js";

export interface BlocklistMatch {
  category: "profanity" | "explicit" | "dangerous" | "contact-info";
  matched: string;
}

export interface BlocklistResult {
  blocked: boolean;
  matches: BlocklistMatch[];
}

// Customise the english dataset: remove medical/educational terms that may
// appear legitimately in age-appropriate explanations. The sensitive topics
// system + validation model handle appropriateness of these terms.
const EDUCATIONAL_TERMS = ["penis", "vagina", "sex"];

const customDataset = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf((phrase) =>
    EDUCATIONAL_TERMS.includes(phrase.metadata?.originalWord ?? ""),
  );

const datasetBuild = customDataset.build();

const matcher = new RegExpMatcher({
  ...datasetBuild,
  ...englishRecommendedTransformers,
  // Extend the library's whitelist with additional false-positive terms
  whitelistedTerms: [
    ...(datasetBuild.whitelistedTerms ?? []),
    "cockpit",
    "cocktail",
    "cockatoo",
    "cockerel",
    "cocoa",
    "peacock",
  ],
});

// Dangerous content patterns — domain-specific, no library covers these
const DANGEROUS_PATTERNS: RegExp[] = [
  /\b(?:make|build|create|construct)\s+(?:a\s+)?bomb/i,
  /\bmethamphetamine\b/i,
  /\b(?:make|cook|produce|manufacture)\s+(?:meth|crack|heroin|fentanyl)/i,
  /\bsynthesize?\s+(?:drugs?|narcotics?)/i,
  /\bsuicide\s+method/i,
  /\bhow\s+to\s+(?:kill|murder)\b/i,
];

// URL and email patterns — simple and correct, no library needed
const URL_EMAIL_PATTERNS: RegExp[] = [
  /https?:\/\/\S+/i,
  /www\.\S+/i,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
];

const runPatterns = (
  text: string,
  patterns: RegExp[],
  category: BlocklistMatch["category"],
): BlocklistMatch[] => {
  const matches: BlocklistMatch[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      matches.push({ category, matched: match[0] });
    }
  }
  return matches;
};

export const scanOutput = (text: string): BlocklistResult => {
  const matches: BlocklistMatch[] = [];

  // Profanity + explicit content (obscenity library — handles leet-speak,
  // unicode confusables, and has built-in false-positive whitelists)
  const profanityMatches = matcher.getAllMatches(text);
  for (const m of profanityMatches) {
    const matched = text.slice(m.startIndex, m.endIndex + 1);
    matches.push({ category: "profanity", matched });
  }

  // Dangerous content (custom regex — domain-specific)
  matches.push(...runPatterns(text, DANGEROUS_PATTERNS, "dangerous"));

  // URLs and emails (custom regex)
  matches.push(...runPatterns(text, URL_EMAIL_PATTERNS, "contact-info"));

  // Phone numbers (libphonenumber-js — proper parsing, ignores postcodes
  // and scientific numbers that greedy regex would false-positive on)
  const phoneMatches = findPhoneNumbersInText(text, "GB");
  for (const phone of phoneMatches) {
    matches.push({
      category: "contact-info",
      matched: text.slice(phone.startsAt, phone.endsAt),
    });
  }

  return {
    blocked: matches.length > 0,
    matches,
  };
};
