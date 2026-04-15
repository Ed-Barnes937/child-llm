export interface BlocklistMatch {
  category: "profanity" | "explicit" | "dangerous" | "contact-info";
  matched: string;
}

export interface BlocklistResult {
  blocked: boolean;
  matches: BlocklistMatch[];
}

// Word-boundary patterns for terms that appear as substrings in innocent words.
// \b alone isn't enough — "ass" matches "assistant", "class", "pass".
// These use negative lookbehind/lookahead to avoid false positives.
const PROFANITY_PATTERNS: RegExp[] = [
  /\bfuck\w*/i,
  /\bshit(?!ake)\w*/i,
  /\bbullshit\w*/i,
  /\bcunt\w*/i,
  /\bdick(?!ens)\b/i,
  /\btwat\w*/i,
  /\bwanker\w*/i,
  /\bbitch\w*/i,
  /\bpiss(?!ton)\w*/i,
  /\bcock(?!pit|roach|atoo|erel|ade|ney)\b/i,
  /(?<![a-z])ass(?!ign|ist|ess|emble|ert|et|ume|ociat|ur|assin)/i,
  /\bbastard\w*/i,
  /\bdamn\b/i,
  /\bn[i1]+gg+[e3]*r/i,
  /\bfagg?ot\w*/i,
  /\bretard(?:ed)?\b/i,
  /\bspastic\b/i,
];

const EXPLICIT_PATTERNS: RegExp[] = [
  /\bpornograph\w*/i,
  /\bporn\b/i,
  /\bhentai\b/i,
  /\bxxx\b/i,
  /\borgasm\w*/i,
  /\bmasturbat\w*/i,
  /\beroti[ck]\w*/i,
];

const DANGEROUS_PATTERNS: RegExp[] = [
  /\b(?:make|build|create|construct)\s+(?:a\s+)?bomb/i,
  /\bmethamphetamine\b/i,
  /\b(?:make|cook|produce|manufacture)\s+(?:meth|crack|heroin|fentanyl)/i,
  /\bsynthesize?\s+(?:drugs?|narcotics?)/i,
  /\bsuicide\s+method/i,
  /\bhow\s+to\s+(?:kill|murder)\b/i,
];

const CONTACT_PATTERNS: RegExp[] = [
  /https?:\/\/\S+/i,
  /www\.\S+/i,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /(?:\+\d{1,3}[\s-]?|0)\(?\d{2,5}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b/,
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
  const matches: BlocklistMatch[] = [
    ...runPatterns(text, PROFANITY_PATTERNS, "profanity"),
    ...runPatterns(text, EXPLICIT_PATTERNS, "explicit"),
    ...runPatterns(text, DANGEROUS_PATTERNS, "dangerous"),
    ...runPatterns(text, CONTACT_PATTERNS, "contact-info"),
  ];

  return {
    blocked: matches.length > 0,
    matches,
  };
};
