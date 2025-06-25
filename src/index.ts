import { SearchResult, NormalizationOptions, IndexedItem } from './types';
import { normalize } from './japanese/normalizer';
import { similarity } from './core/fuzzy';
import { getReading } from './japanese/tokenizer';
import { romajiToHiragana } from './utils';
import { Tokenizer, IpadicFeatures } from 'kuromoji';

export interface AimaiOptions<T = any> {
    threshold?: number;
    limit?: number;
    includeScore?: boolean;
    includeMatches?: boolean;
    useKanaNormalization?: boolean;
    normalizationOptions?: NormalizationOptions;
    useRomajiSearch?: boolean;
    keys?: (keyof T)[] | string[]; // For object arrays: which keys to search
    tokenizer?: Tokenizer<IpadicFeatures>;
}

export default class Aimai<T = any> {
    private indexedList: IndexedItem<T>[];
    private opts: Required<Omit<AimaiOptions<T>, 'tokenizer' | 'normalizationOptions' | 'includeMatches' | 'keys'>> & {
        normalizationOptions: Required<NormalizationOptions>;
        tokenizer?: Tokenizer<IpadicFeatures>;
        includeMatches: boolean;
        keys: string[];
    };

    /**
     * Create Aimai instance with pre-indexed data (recommended for performance)
     * @param indexedData Pre-processed indexed data
     * @param options Search options
     */
    constructor(indexedData: IndexedItem<T>[], options?: AimaiOptions<T>);

    /**
     * Create Aimai instance with raw data (will show performance warning for large datasets)
     * @param rawData Raw data array
     * @param options Search options
     * @deprecated Use Aimai.create() for better performance with raw data
     */
    constructor(rawData: T[], options?: AimaiOptions<T>);

    constructor(data: T[] | IndexedItem<T>[], options?: AimaiOptions<T>) {
        // Set default options
        const defaultOptions = {
            threshold: 0.6,
            limit: Infinity,
            includeScore: true,
            includeMatches: false,
            useKanaNormalization: true,
            useRomajiSearch: true,
            keys: [],
            normalizationOptions: {
                normalizeLongVowel: true,
                expandIterationMark: true,
            },
        };

        const mergedOptions = { ...defaultOptions, ...options };

        this.opts = {
            threshold: mergedOptions.threshold,
            limit: mergedOptions.limit,
            includeScore: mergedOptions.includeScore,
            includeMatches: mergedOptions.includeMatches,
            useKanaNormalization: mergedOptions.useKanaNormalization,
            useRomajiSearch: mergedOptions.useRomajiSearch,
            keys: Array.isArray(mergedOptions.keys) ? mergedOptions.keys as string[] : [],
            tokenizer: options?.tokenizer,
            normalizationOptions: {
                ...defaultOptions.normalizationOptions,
                ...(options?.normalizationOptions || {}),
            },
        };

        // Check if data is already indexed
        if (this.isIndexedData(data)) {
            this.indexedList = data;
        } else {
            // Show deprecation warning for raw data usage
            const rawData = data as T[];
            if (rawData.length > 50) {
                console.warn('⚠️  Aimai: Large dataset detected. Using raw data with constructor is deprecated.');
                console.warn('   Recommended: Use Aimai.create() or Aimai.createIndex() for better performance.');
                console.warn(`   Current dataset size: ${rawData.length} items`);
            }

            // For backward compatibility, still support raw data but discourage it
            this.indexedList = [];
            this.rawData = rawData;
        }
    }

    private rawData?: T[];

    /**
     * Create Aimai instance with automatic indexing (recommended for raw data)
     * @param data Raw data array
     * @param options Search options
     * @returns Promise<Aimai<T>>
     */
    static async create<T>(data: T[], options?: AimaiOptions<T>): Promise<Aimai<T>> {
        console.log(`🔄 Indexing ${data.length} items for optimal search performance...`);
        const startTime = Date.now();

        const indexedData = await Aimai.createIndex(data, options);
        const instance = new Aimai(indexedData, options);

        const indexTime = Date.now() - startTime;
        console.log(`✅ Indexing completed in ${indexTime}ms. Ready for fast searches!`);

        return instance;
    }

    /**
     * Create indexed data without instantiating Aimai (useful for pre-processing)
     * @param data Raw data array
     * @param options Processing options
     * @returns Promise<IndexedItem<T>[]>
     */
    static async createIndex<T>(data: T[], options?: AimaiOptions<T>): Promise<IndexedItem<T>[]> {
        const tempInstance = new Aimai<T>([], options);
        return await tempInstance.processRawData(data);
    }

    /**
     * Load pre-saved indexed data from file
     * @param filePath Path to saved indexed data JSON file
     * @param options Search options
     * @returns Promise<Aimai<T>>
     */
    static async loadFromFile<T>(filePath: string, options?: AimaiOptions<T>): Promise<Aimai<T>> {
        const fs = await import('fs/promises');
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        return new Aimai<T>(data, options);
    }

    /**
     * Save indexed data to file for future use
     * @param filePath Path to save indexed data
     */
    async saveToFile(filePath: string): Promise<void> {
        const fs = await import('fs/promises');
        await fs.writeFile(filePath, JSON.stringify(this.indexedList, null, 2));
        console.log(`💾 Indexed data saved to ${filePath}`);
    }

    private isIndexedData(data: T[] | IndexedItem<T>[]): data is IndexedItem<T>[] {
        return data.length > 0 &&
            typeof (data[0] as any).original !== 'undefined' &&
            typeof (data[0] as any).normalized === 'string' &&
            typeof (data[0] as any).reading === 'string';
    }

    private async ensureIndexed(): Promise<void> {
        if (this.indexedList.length > 0) return;

        if (this.rawData) {
            console.log('⚠️  Performing on-demand indexing. This may be slow for large datasets.');
            this.indexedList = await this.processRawData(this.rawData);
            this.rawData = undefined; // Clear raw data after indexing
        }
    }

    private async processRawData(data: T[]): Promise<IndexedItem<T>[]> {
        const indexedList: IndexedItem<T>[] = [];

        for (const item of data) {
            const text = this.extractText(item);
            const normalizedText = this.normalizeText(text);
            const reading = await getReading(text, this.opts.tokenizer);
            const normalizedReading = normalize(reading, this.opts.normalizationOptions);

            indexedList.push({
                original: item,
                normalized: normalizedText,
                reading: normalizedReading,
            });
        }

        return indexedList;
    }

    private extractText(item: T): string {
        if (typeof item === 'string') {
            return item;
        }

        if (typeof item === 'object' && item !== null) {
            // If keys are specified, search those keys
            if (this.opts.keys.length > 0) {
                const texts: string[] = [];
                for (const key of this.opts.keys) {
                    const value = (item as any)[key];
                    if (typeof value === 'string') {
                        texts.push(value);
                    }
                }
                return texts.join(' ');
            }

            // If no keys specified, join all string values
            const stringValues = Object.values(item).filter(v => typeof v === 'string');
            return stringValues.join(' ');
        }

        return String(item);
    }

    private normalizeText(text: string): string {
        let s = text;

        // Apply kana normalization first
        if (this.opts.useKanaNormalization) {
            s = normalize(s, this.opts.normalizationOptions);
        } else {
            s = s.toLowerCase();
        }

        return s;
    }

    private normalizeQuery(query: string): string {
        let s = query;

        // For queries, apply romaji conversion first
        if (this.opts.useRomajiSearch) {
            s = romajiToHiragana(s);
        }

        // Then apply kana normalization
        if (this.opts.useKanaNormalization) {
            s = normalize(s, this.opts.normalizationOptions);
        } else {
            s = s.toLowerCase();
        }

        return s;
    }

    async search(query: string): Promise<SearchResult<T>[]> {
        // Validate query
        if (!query || query.trim().length === 0) {
            return [];
        }

        // Ensure data is indexed
        await this.ensureIndexed();

        if (this.indexedList.length === 0) {
            console.warn('No data to search. Please provide data to the constructor.');
            return [];
        }

        const normalizedQuery = this.normalizeQuery(query);

        // For romaji queries, also get the reading of the converted query
        let queryForReading = query;
        if (this.opts.useRomajiSearch) {
            queryForReading = romajiToHiragana(query);
        }

        const readingQuery = await getReading(queryForReading, this.opts.tokenizer);
        const normalizedReadingQuery = normalize(readingQuery, this.opts.normalizationOptions);

        const results: SearchResult<T>[] = [];

        for (let i = 0; i < this.indexedList.length; i++) {
            const targetData = this.indexedList[i];

            // Calculate similarity scores
            const scoreTextLevenshtein = similarity(normalizedQuery, targetData.normalized);
            const scoreReadingLevenshtein = similarity(normalizedReadingQuery, targetData.reading);

            // Check for substring inclusion
            const includesText = targetData.normalized.includes(normalizedQuery);
            const includesReading = targetData.reading.includes(normalizedReadingQuery);

            // Assign higher score if substring is found
            const substringScore = 0.85;
            const scoreText = includesText ? Math.max(scoreTextLevenshtein, substringScore) : scoreTextLevenshtein;
            const scoreReading = includesReading ? Math.max(scoreReadingLevenshtein, substringScore) : scoreReadingLevenshtein;

            // Combine scores
            const score = Math.max(scoreText, scoreReading);

            if (score >= this.opts.threshold) {
                const result: SearchResult<T> = {
                    item: targetData.original,
                    refIndex: i,
                    score: this.opts.includeScore ? score : 0,
                };
                results.push(result);
            }
        }

        // Sort results
        results.sort((a, b) => {
            const getComparableString = (item: T): string => {
                if (typeof item === 'string') return item;
                try {
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
