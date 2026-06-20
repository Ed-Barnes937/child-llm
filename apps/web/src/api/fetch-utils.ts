/**
 * Throws a descriptive error if a fetch Response is not ok. Shared across the
 * API client modules so the `if (!res.ok) throw` pattern lives in one place.
 */
export const ensureOk = async (
  res: Response,
  context: string,
): Promise<void> => {
  if (!res.ok) {
    throw new Error(`${context} failed: ${res.status} ${res.statusText}`);
  }
};
