import { distance } from 'fastest-levenshtein';

// Levenshtein distance wrapper
export function levenshteinDistance(a: string, b: string): number {
    return distance(a, b);
}

// Similarity score between 0 and 1
export function similarity(a: string, b: string): number {
    const d = distance(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen > 0 ? 1 - d / maxLen : 1;
}
