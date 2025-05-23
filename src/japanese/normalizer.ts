import unorm from 'unorm';
import { NormalizationOptions } from '../types';

const defaultNormalizationOptions: Required<NormalizationOptions> = {
    normalizeLongVowel: true,
    expandIterationMark: true,
};

// Normalize Japanese text to hiragana and ascii
export function normalize(text: string, options?: NormalizationOptions): string {
    const opts = { ...defaultNormalizationOptions, ...options };

    // 1. Unicode NFKC normalization (主に全角英数記号->半角、半角カナ->全角カナ)
    let s = unorm.nfkc(text);

    // 2. Lowercase for ASCII letters
    s = s.toLowerCase();

    // 3. Convert Katakana to Hiragana (半角カナはNFKCで全角になっているはず)
    s = s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

    // 4. Optional: Normalize long vowels (ー)
    if (opts.normalizeLongVowel) {
        s = s.replace(/ー$/g, '');
    }

    // 5. Optional: Expand iteration marks (々)
    if (opts.expandIterationMark) {
        // 簡易的に前の文字を繰り返す (例: 人々 -> 人人)
        s = s.replace(/(.)々/g, '$1$1');
    }

    return s;
}
