// ---------------------------------------------------------------------------
// String Utilities — Ported from web's utils/stringDiff.js
// ---------------------------------------------------------------------------

/**
 * Calculates the Levenshtein distance between two strings.
 * Minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one word into the other.
 */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Powerful offline fuzzy matcher — exact port from web.
 * Checks for direct substring inclusion, and if absent, uses Levenshtein distance
 * to pardon minor typos (e.g. 'dlo' matches 'dolo' with distance 1).
 */
export function isFuzzyMatch(
  sourceStr: string = '',
  searchStr: string = '',
  maxDistance: number = 2
): boolean {
  sourceStr = sourceStr.toLowerCase().trim();
  searchStr = searchStr.toLowerCase().trim();

  if (!searchStr) return true;
  if (!sourceStr) return false;

  // 1. Direct Include Check (Super Fast)
  if (sourceStr.includes(searchStr)) return true;

  // 2. Levenshtein Check (for typos like 'dlo' -> 'dolo')
  const words = sourceStr.split(/\s+/);
  for (const word of words) {
    if (Math.abs(word.length - searchStr.length) <= maxDistance + 1) {
      const dist = levenshtein(word.substring(0, searchStr.length), searchStr);
      if (dist <= maxDistance) return true;
    }
  }

  return false;
}
