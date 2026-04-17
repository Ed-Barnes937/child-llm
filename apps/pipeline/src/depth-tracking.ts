/**
 * Conversation depth tracking for sensitive topics.
 *
 * Counts how many consecutive exchanges in a conversation touch sensitive
 * topics. After a threshold, returns a redirect response pointing the
 * child to their parent.
 */

import { detectSensitiveTopics } from "./sensitive-topics.js";

const DEFAULT_THRESHOLD = 3;

const REDIRECT_RESPONSE =
  "You've got some really great questions! I think your parent or a trusted grown-up would be the best person to explore this with you — they'll be able to have a proper conversation about it.";

export interface DepthTrackingResult {
  shouldRedirect: boolean;
  sensitiveCount: number;
  redirectResponse: string | null;
}

/**
 * Analyses conversation history to count consecutive sensitive exchanges
 * at the end of the conversation. Returns whether the threshold has been
 * reached and a redirect response should replace the LLM call.
 */
export const checkConversationDepth = (
  history: { role: string; content: string }[],
  currentMessage: string,
  threshold: number = DEFAULT_THRESHOLD,
): DepthTrackingResult => {
  // Check the current message first
  const currentResult = detectSensitiveTopics(currentMessage);
  if (!currentResult.isSensitive) {
    return { shouldRedirect: false, sensitiveCount: 0, redirectResponse: null };
  }

  // Count backwards through user messages to find consecutive sensitive ones
  let consecutiveSensitive = 1;

  // Walk backwards through history, only counting user messages.
  // Skip the last user message if it matches currentMessage — callers
  // may include the current message in the history array.
  const userMessages = history.filter((m) => m.role === "user");
  if (
    userMessages.length > 0 &&
    userMessages[userMessages.length - 1].content === currentMessage
  ) {
    userMessages.pop();
  }
  userMessages.reverse();

  for (const msg of userMessages) {
    const result = detectSensitiveTopics(msg.content);
    if (result.isSensitive) {
      consecutiveSensitive++;
    } else {
      break;
    }
  }

  const shouldRedirect = consecutiveSensitive >= threshold;

  return {
    shouldRedirect,
    sensitiveCount: consecutiveSensitive,
    redirectResponse: shouldRedirect ? REDIRECT_RESPONSE : null,
  };
};
