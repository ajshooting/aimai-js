import { similarity, levenshteinDistance } from '../../src/core/fuzzy';

describe('Fuzzy Core Functions', () => {
    describe('levenshteinDistance', () => {
        it('should calculate correct Levenshtein distance', () => {
            expect(levenshteinDistance('abc', 'abc')).toBe(0);
            expect(levenshteinDistance('abc', 'abx')).toBe(1);
            expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
            expect(levenshteinDistance('', 'abc')).toBe(3);
            expect(levenshteinDistance('abc', '')).toBe(3);
            expect(levenshteinDistance('', '')).toBe(0);
        });
    });

    describe('similarity', () => {
        it('should return 1 for identical strings', () => {
            expect(similarity('hello', 'hello')).toBe(1);
            expect(similarity('', '')).toBe(1); // Handle empty strings
        });

        it('should return 0 for completely different strings of same length', () => {
            // Note: Similarity might not be exactly 0 due to the formula 1 - d/maxLen
            // Example: distance('abc', 'xyz') is 3, maxLen is 3. 1 - 3/3 = 0
            expect(similarity('abc', 'xyz')).toBe(0);
        });

        it('should return a value between 0 and 1 for partially similar strings', () => {
            const score1 = similarity('kitten', 'sitting'); // d=3, maxLen=7 => 1 - 3/7
            expect(score1).toBeCloseTo(1 - 3 / 7);
            expect(score1).toBeGreaterThan(0);
            expect(score1).toBeLessThan(1);

            const score2 = similarity('test', 'testing'); // d=3, maxLen=7 => 1 - 3/7
            expect(score2).toBeCloseTo(1 - 3 / 7);

            const score3 = similarity('apple', 'apply'); // d=1, maxLen=5 => 1 - 1/5
            expect(score3).toBeCloseTo(0.8);
        });

        it('should handle strings of different lengths', () => {
            const score = similarity('short', 'longerstring'); // d=10, maxLen=12 => 1 - 10/12
            expect(score).toBeCloseTo(1 - 10 / 12);
            expect(score).toBeGreaterThanOrEqual(0); // Ensure non-negative
            expect(score).toBeLessThan(1);
        });

        it('should handle empty string comparisons', () => {
            expect(similarity('abc', '')).toBe(0); // d=3, maxLen=3 => 1 - 3/3 = 0
            expect(similarity('', 'xyz')).toBe(0); // d=3, maxLen=3 => 1 - 3/3 = 0
        });
    });
});
