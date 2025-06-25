import { normalize } from '../../src/japanese/normalizer';

describe('Japanese Normalizer', () => {
    it('should normalize katakana to hiragana', () => {
        expect(normalize('テスト')).toBe('てすと');
        expect(normalize('ヴァイオリン')).toBe('ゔぁいおりん'); // Handle ヴ
    });

    it('should normalize full-width alphanumeric to half-width', () => {
        expect(normalize('ＡＢＣ１２３')).toBe('abc123');
    });

    it('should normalize half-width katakana to hiragana', () => {
        expect(normalize('ﾃｽﾄ')).toBe('てすと');
    });

    it('should handle mixed characters', () => {
        expect(normalize('Ｔｅｓｔﾃｽﾄテスト')).toBe('testてすとてすと');
    });

    it('should normalize long vowels by default', () => {
        expect(normalize('サーバー')).toBe('さあばあ');
        expect(normalize('コンピューター')).toBe('こんぴゅあたあ');
    });

    it('should optionally disable long vowel normalization', () => {
        expect(normalize('サーバー', { normalizeLongVowel: false })).toBe('さーばー');
    });

    it('should expand iteration marks by default', () => {
        expect(normalize('人々')).toBe('人人');
        expect(normalize('様々')).toBe('様様');
    });

    it('should optionally disable iteration mark expansion', () => {
        expect(normalize('人々', { expandIterationMark: false })).toBe('人々');
    });

    // Add more tests for edge cases and other options
});
