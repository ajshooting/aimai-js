// Add main types for Aimai usage
export interface NormalizationOptions {
    /** 長音符の揺れを吸収するか (例: 「サーバー」vs「サーバ」) */
    normalizeLongVowel?: boolean;
    /** 繰り返し記号を展開するか (例: 「々」→「人人」) */
    expandIterationMark?: boolean;
}

export interface AimaiOptions<T = any> {
    threshold?: number; // 0 to 1 similarity threshold
    limit?: number; // max number of results
    includeScore?: boolean;
    includeMatches?: boolean; // F3.1 (ハイライト用)
    useKanaNormalization?: boolean; // F2.1 (ひらがな正規化全体)
    normalizationOptions?: NormalizationOptions; // F2.1 (詳細な正規化オプション)
    useRomajiSearch?: boolean; // F3.2
    keys?: (keyof T | { name: keyof T; weight: number })[]; // F1.2, F4.1 (重み付け)
    tokenizer?: any; // F4.2 (カスタム Kuromoji.js インスタンス)
}

export interface SearchResult<T> {
    item: T;
    score: number;
    refIndex: number;
    matches?: any; // placeholder for future match info (F1.3, F3.1)
}
