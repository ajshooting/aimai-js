import { getReading } from '../../src/japanese/tokenizer'; // Adjust path

describe('Japanese Tokenizer (Kuromoji Wrapper)', () => {
    // Note: These tests depend on Kuromoji.js and its dictionary.
    // The first test might take longer due to dictionary loading.

    it('should get hiragana reading for Kanji text', async () => {
        const reading = await getReading('東京');
        expect(reading).toBe('とうきょう');
    });

    it('should get hiragana reading for Katakana text', async () => {
        const reading = await getReading('テスト');
        expect(reading).toBe('てすと');
    });

    it('should get hiragana reading for mixed text', async () => {
        const reading = await getReading('東京都渋谷区');
        expect(reading).toBe('とうきょうとしぶやく');
    });

    it('should handle text with no specific reading (like hiragana or symbols)', async () => {
        const reading = await getReading('あいうえお！');
        expect(reading).toBe('あいうえお！');
    });

    it('should handle Katakana readings correctly (convert to hiragana)', async () => {
        const reading = await getReading('コンピューター');
        expect(reading).toBe('こんぴゅーたー');
    });

    // Add tests for custom tokenizer instance if needed
});
