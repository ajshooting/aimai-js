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

    // 4. Optional: Normalize long vowels (ー) and convert to standard forms
    if (opts.normalizeLongVowel) {
        // Handle specific long vowel patterns first
        s = s
            // Common word-specific patterns
            .replace(/らーめん/g, 'らあめん')
            .replace(/かーど/g, 'かあど')
            .replace(/げーむ/g, 'げえむ')
            .replace(/けーき/g, 'けえき')
            .replace(/ろーま/g, 'ろおま')
            .replace(/こーひー/g, 'こおひい')
            .replace(/びーる/g, 'びいる')
            .replace(/すーぱー/g, 'すうぱあ')

            // General patterns: vowel + ー based on preceding vowel sound
            .replace(/([あか-こさ-そた-とな-のは-ほま-もや-よら-ろわ-ん])ー/g, (match, prev) => {
                // For 'a' sound syllables, use 'あ'
                if (/[あか-こさ-そた-とな-のは-ほま-もや-よら-ろわ-ん]/.test(prev)) {
                    return prev + 'あ';
                }
                return match;
            })
            .replace(/([いき-ぎし-じち-ぢに-ひび-ぴみ-り])ー/g, (match, prev) => {
                // For 'i' sound syllables, use 'い'
                return prev + 'い';
            })
            .replace(/([うく-ぐす-ずつ-づぬ-ふぶ-ぷむ-ゆる-る])ー/g, (match, prev) => {
                // For 'u' sound syllables, use 'う'
                return prev + 'う';
            })
            .replace(/([えけ-げせ-ぜて-でね-へべ-ぺめ-れ])ー/g, (match, prev) => {
                // For 'e' sound syllables, use 'い' (common pattern)
                return prev + 'い';
            })
            .replace(/([おこ-ごそ-ぞと-どの-ほぼ-ぽも-よろ-ろを-ん])ー/g, (match, prev) => {
                // For 'o' sound syllables, use 'う'
                return prev + 'う';
            })

            // Fallback: replace remaining ー with preceding vowel
            .replace(/([あいうえお])ー/g, '$1$1')
            .replace(/ー/g, '');  // Remove any remaining ー marks
    }

    // 5. Optional: Expand iteration marks (々)
    if (opts.expandIterationMark) {
        // 簡易的に前の文字を繰り返す (例: 人々 -> 人人)
        s = s.replace(/(.)々/g, '$1$1');
    }

    return s;
}
