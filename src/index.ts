import { AimaiOptions, SearchResult, NormalizationOptions } from './types';
import { normalize } from './japanese/normalizer';
import { similarity } from './core/fuzzy';
import { getReading } from './japanese/tokenizer';
import { romajiToHiragana } from './utils';
import { Tokenizer, IpadicFeatures } from 'kuromoji'; // Import kuromoji types

// Define a type for processed keys
type ProcessedKey<T> = { name: keyof T; weight: number };

export default class Aimai<T = string> {
    private list: T[];
    private opts: Required<Omit<AimaiOptions<T>, 'keys' | 'tokenizer' | 'normalizationOptions'>> & {
        normalizationOptions: Required<NormalizationOptions>;
        tokenizer?: Tokenizer<IpadicFeatures>; // Use specific Kuromoji type
        keys: ProcessedKey<T>[]; // Use processed keys type
    };
    private normalizedList: { text: string; reading: Promise<string> }[];

    constructor(list: T[], options?: AimaiOptions<T>) {
        this.list = list;

        // --- Process Options ---
        const defaultOptions: Required<Omit<AimaiOptions<any>, 'keys' | 'tokenizer' | 'normalizationOptions'>> & { normalizationOptions: Required<NormalizationOptions> } = {
            threshold: 0.6,
            limit: Infinity, // Default to no limit
            includeScore: true,
            includeMatches: false,
            useKanaNormalization: true,
            useRomajiSearch: true,
            normalizationOptions: { // Default normalization options
                normalizeLongVowel: true,
                expandIterationMark: true,
            },
        };

        const mergedOptions = { ...defaultOptions, ...options };

        // Process keys: Ensure keys are in { name: string, weight: number } format
        let processedKeys: ProcessedKey<T>[] = [];
        if (mergedOptions.keys) {
            processedKeys = (mergedOptions.keys as any[]).map(key => {
                if (typeof key === 'string') {
                    return { name: key as keyof T, weight: 1 };
                }
                return key as ProcessedKey<T>;
            });
        }

        this.opts = {
            ...mergedOptions,
            keys: processedKeys,
            tokenizer: options?.tokenizer, // Store the custom tokenizer if provided
            normalizationOptions: { // Ensure normalizationOptions is fully populated
                ...defaultOptions.normalizationOptions,
                ...options?.normalizationOptions,
            },
        };

        // --- Preprocess List ---
        this.normalizedList = list.map(item => {
            const rawText = this.extractText(item);
            const readingPromise = getReading(rawText, this.opts.tokenizer); // Pass tokenizer
            const normalizedText = this.normalizeText(rawText);
            return { text: normalizedText, reading: readingPromise };
        });
    }

    // Helper to extract text based on keys or direct string
    private extractText(item: T): string {
        if (typeof item === 'string') {
            return item;
        }
        if (this.opts.keys.length > 0) {
            return this.opts.keys
                .map(key => (item as any)[key.name])
                .filter(v => typeof v === 'string')
                .join(' '); // Join values from different keys with a space
        }
        return String(item); // Fallback to string conversion
    }

    // Helper to normalize text based on options
    private normalizeText(text: string): string {
        let s = text;
        // Romaji to Hiragana conversion happens *before* normalization
        if (this.opts.useRomajiSearch) {
            s = romajiToHiragana(s);
        }
        // Kana and other normalization
        if (this.opts.useKanaNormalization) {
            s = normalize(s, this.opts.normalizationOptions); // Pass normalization options
        } else {
            s = s.toLowerCase(); // Basic lowercase if normalization is off
        }
        return s;
    }

    async search(query: string): Promise<SearchResult<T>[]> {
        const normalizedQuery = this.normalizeText(query);
        const readingQueryPromise = getReading(query, this.opts.tokenizer); // Pass tokenizer

        const results: SearchResult<T>[] = [];
        const readingQuery = await readingQueryPromise; // Get query reading once

        for (let i = 0; i < this.list.length; i++) {
            const targetData = this.normalizedList[i];
            const readingTarget = await targetData.reading; // Await precomputed reading

            // Calculate similarity scores
            const scoreText = similarity(normalizedQuery, targetData.text);
            const scoreReading = similarity(readingQuery, normalize(readingTarget, this.opts.normalizationOptions)); // Normalize reading based on options

            // Combine scores (simple max for now, could be weighted later)
            const score = Math.max(scoreText, scoreReading);

            if (score >= this.opts.threshold) {
                const result: SearchResult<T> = {
                    item: this.list[i],
                    refIndex: i,
                    score: this.opts.includeScore ? score : 0, // Include score conditionally
                };
                // Add matches if requested (placeholder for F3.1)
                // if (this.opts.includeMatches) {
                //     result.matches = calculateMatches(normalizedQuery, targetData.text, readingQuery, readingTarget);
                // }
                results.push(result);
            }
        }

        // Sort results:
        // 1. Prioritize items that exactly match the original query string.
        // 2. Then sort by descending score.
        // 3. Finally, sort by original index for stability.
        results.sort((a, b) => {
            const aIsOriginalExact = String(this.list[a.refIndex]) === query;
            const bIsOriginalExact = String(this.list[b.refIndex]) === query;

            if (aIsOriginalExact && !bIsOriginalExact) return -1; // a (exact) comes first
            if (!aIsOriginalExact && bIsOriginalExact) return 1;  // b (exact) comes first

            // If both are exact or both are not, sort by score then index
            return b.score - a.score || a.refIndex - b.refIndex;
        });

        // Apply limit
        if (this.opts.limit < results.length) {
            results.splice(this.opts.limit);
        }

        // Remove score if not requested (do this after sorting and limiting)
        if (!this.opts.includeScore) {
            results.forEach(r => delete (r as any).score); // Use delete or map to new objects
        }

        return results;
    }
}
