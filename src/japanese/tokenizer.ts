import kuromoji, { Tokenizer, IpadicFeatures } from 'kuromoji';

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;
let internalTokenizer: Tokenizer<IpadicFeatures> | null = null;

function getTokenizer(customTokenizer?: Tokenizer<IpadicFeatures>): Promise<Tokenizer<IpadicFeatures>> {
    if (customTokenizer) {
        return Promise.resolve(customTokenizer);
    }
    if (internalTokenizer) {
        return Promise.resolve(internalTokenizer);
    }
    if (!tokenizerPromise) {
        tokenizerPromise = new Promise((resolve, reject) => {
            kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
                if (err) {
                    tokenizerPromise = null; // Reset promise on error
                    reject(err);
                } else {
                    internalTokenizer = tokenizer;
                    resolve(tokenizer);
                }
            });
        });
    }
    return tokenizerPromise;
}

// Get reading (hiragana) for Japanese text
export async function getReading(text: string, customTokenizer?: Tokenizer<IpadicFeatures>): Promise<string> {
    const tokenizer = await getTokenizer(customTokenizer);
    const tokens = tokenizer.tokenize(text);
    return tokens
        .map(t => t.reading || t.surface_form) // Use reading if available, otherwise surface form
        .map(r => r?.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)) || '') // Convert katakana reading to hiragana
        .map(r => r.replace(/ー/g, 'ー')) // preserve long vowel for now (normalizer handles this later if enabled)
        .join('')
        .toLowerCase(); // Ensure lowercase for consistency before normalization
}
