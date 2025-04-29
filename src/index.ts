import { SearchResult, NormalizationOptions, IndexedItem } from './types';
import { normalize } from './japanese/normalizer';
import { similarity } from './core/fuzzy';
import { getReading } from './japanese/tokenizer';
import { romajiToHiragana } from './utils';
import { Tokenizer, IpadicFeatures } from 'kuromoji';

// --- Adjust AimaiOptions ---
export interface AimaiOptions<T = any> {
    threshold?: number;
    limit?: number;
    includeScore?: boolean;
    includeMatches?: boolean;
    useKanaNormalization?: boolean;
    normalizationOptions?: NormalizationOptions;
    useRomajiSearch?: boolean;
    tokenizer?: Tokenizer<IpadicFeatures>; // Keep if query reading is needed at search time
}

export default class Aimai<T = any> {
    private indexedList: IndexedItem<T>[];
    // Adjust opts type to reflect removed keys
    private opts: Required<Omit<AimaiOptions<T>, 'tokenizer' | 'normalizationOptions' | 'includeMatches'>> & {
        normalizationOptions: Required<NormalizationOptions>;
        tokenizer?: Tokenizer<IpadicFeatures>; // Keep tokenizer instance if needed for query reading
        includeMatches: boolean; // Keep includeMatches separate as it's not Required
    };

    // Constructor now accepts pre-indexed data
    constructor(indexedList: IndexedItem<T>[], options?: AimaiOptions<T>) {
        if (!Array.isArray(indexedList) || (indexedList.length > 0 && (!indexedList[0].hasOwnProperty('original') || !indexedList[0].hasOwnProperty('normalized') || !indexedList[0].hasOwnProperty('reading')))) {
            console.warn('Aimai constructor received potentially invalid indexed data. Expected IndexedItem<T>[]. Initializing with empty list.');
            this.indexedList = []; // Initialize as empty to avoid errors
        } else {
            this.indexedList = indexedList;
        }

        // --- Process Options (Simplified, removed keys) ---
        // Adjust defaultOptions type
        const defaultOptions: Required<Omit<AimaiOptions<any>, 'tokenizer' | 'normalizationOptions' | 'includeMatches'>> & { normalizationOptions: Required<NormalizationOptions>; includeMatches: boolean } = {
            threshold: 0.6,
            limit: Infinity,
            includeScore: true,
            includeMatches: false,
            useKanaNormalization: true,
            useRomajiSearch: true,
            normalizationOptions: {
                normalizeLongVowel: true,
                expandIterationMark: true,
            },
        };

        const mergedOptions = { ...defaultOptions, ...options }; // Merge provided options

        // Assign to this.opts, ensuring type compatibility
        this.opts = {
            threshold: mergedOptions.threshold,
            limit: mergedOptions.limit,
            includeScore: mergedOptions.includeScore,
            includeMatches: mergedOptions.includeMatches,
            useKanaNormalization: mergedOptions.useKanaNormalization,
            useRomajiSearch: mergedOptions.useRomajiSearch,
            tokenizer: options?.tokenizer,
            normalizationOptions: {
                ...defaultOptions.normalizationOptions,
                ...(options?.normalizationOptions || {}), // Merge normalization options safely
            },
        };
    }

    // Helper to normalize the *query* text based on options
    private normalizeQuery(text: string): string {
        let s = text;
        if (this.opts.useRomajiSearch) {
            s = romajiToHiragana(s);
        }
        if (this.opts.useKanaNormalization) {
            s = normalize(s, this.opts.normalizationOptions);
        } else {
            s = s.toLowerCase();
        }
        return s;
    }

    // Search method now uses pre-indexed data
    async search(query: string): Promise<SearchResult<T>[]> {
        const normalizedQuery = this.normalizeQuery(query);
        // Get query reading only if needed (e.g., if comparing against precomputed readings)
        // This still requires the tokenizer at search time if used.
        const readingQuery = await getReading(query, this.opts.tokenizer);
        const normalizedReadingQuery = normalize(readingQuery, this.opts.normalizationOptions); // Normalize query reading

        const results: SearchResult<T>[] = [];

        for (let i = 0; i < this.indexedList.length; i++) {
            const targetData = this.indexedList[i];

            // Calculate similarity scores using pre-calculated data
            // Compare normalized query with normalized text (Levenshtein based)
            const scoreTextLevenshtein = similarity(normalizedQuery, targetData.normalized);
            // Compare normalized query reading with pre-calculated normalized reading (Levenshtein based)
            const scoreReadingLevenshtein = similarity(normalizedReadingQuery, targetData.reading);

            // Check for substring inclusion
            const includesText = targetData.normalized.includes(normalizedQuery);
            const includesReading = targetData.reading.includes(normalizedReadingQuery);

            // Assign higher score if substring is found (adjust score as needed)
            // Use a score slightly below 1 for substring match to differentiate from perfect Levenshtein match
            const substringScore = 0.85;
            const scoreText = includesText ? Math.max(scoreTextLevenshtein, substringScore) : scoreTextLevenshtein;
            const scoreReading = includesReading ? Math.max(scoreReadingLevenshtein, substringScore) : scoreReadingLevenshtein;

            // Combine scores (simple max for now)
            const score = Math.max(scoreText, scoreReading);

            if (score >= this.opts.threshold) {
                const result: SearchResult<T> = {
                    item: targetData.original, // Return the original item
                    refIndex: i, // Keep original index relative to the input indexedList
                    score: this.opts.includeScore ? score : 0,
                };
                // Add matches if requested (placeholder)
                // if (this.opts.includeMatches) {
                //     result.matches = calculateMatches(normalizedQuery, targetData.normalized, normalizedReadingQuery, targetData.reading);
                // }
                results.push(result);
            }
        }

        // Sort results:
        // 1. Prioritize items whose *original* representation exactly matches the *original* query.
        // 2. Then sort by descending score.
        // 3. Finally, sort by original index for stability.
        results.sort((a, b) => {
            // Need a way to compare original item to original query.
            // This requires the original item structure to be predictable or stringifiable.
            // Using String() for a basic comparison. Adjust if needed.
            // Handle potential objects in original item
            const getComparableString = (item: T): string => {
                if (typeof item === 'string') return item;
                // Attempt a stable string representation for objects, might need refinement
                try {
                    // Sort keys for consistent stringification
                    const sortedItem = Object.keys(item as object).sort().reduce((obj, key) => {
                        (obj as any)[key] = (item as any)[key];
                        return obj;
                    }, {});
                    return JSON.stringify(sortedItem);
                } catch {
                    return String(item);
                }
            };
            const aOriginalString = getComparableString(a.item);
            const bOriginalString = getComparableString(b.item);

            const aIsOriginalExact = aOriginalString === query;
            const bIsOriginalExact = bOriginalString === query;

            if (aIsOriginalExact && !bIsOriginalExact) return -1;
            if (!aIsOriginalExact && bIsOriginalExact) return 1;

            // If scores are equal, prioritize substring matches over pure Levenshtein matches
            if (b.score === a.score) {
                const aTargetData = this.indexedList[a.refIndex];
                const bTargetData = this.indexedList[b.refIndex];
                const aIncludesText = aTargetData.normalized.includes(normalizedQuery);
                const aIncludesReading = aTargetData.reading.includes(normalizedReadingQuery);
                const bIncludesText = bTargetData.normalized.includes(normalizedQuery);
                const bIncludesReading = bTargetData.reading.includes(normalizedReadingQuery);
                const aIsSubstringMatch = aIncludesText || aIncludesReading;
                const bIsSubstringMatch = bIncludesText || bIncludesReading;

                if (aIsSubstringMatch && !bIsSubstringMatch) return -1;
                if (!aIsSubstringMatch && bIsSubstringMatch) return 1;
            }

            return b.score - a.score || a.refIndex - b.refIndex;
        });

        // Apply limit
        if (this.opts.limit < results.length) {
            results.splice(this.opts.limit);
        }

        // Remove score if not requested
        if (!this.opts.includeScore) {
            results.forEach(r => delete (r as any).score);
        }

        return results;
    }
}
