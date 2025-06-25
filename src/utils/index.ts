import * as hepburn from 'hepburn';

// Convert romaji input to hiragana with hybrid approach
export function romajiToHiragana(s: string): string {
    // Basic preprocessing
    const preprocessed = preprocessRomajiInput(s);

    // First try hepburn conversion
    const result = hepburn.toHiragana(preprocessed);

    // If the original input appears to be romaji but conversion seems incomplete,
    // apply minimal enhancements (avoid heavy dictionary dependency)
    if (isLikelyRomaji(preprocessed) && result.length < preprocessed.length) {
        const enhanced = applyBasicRomajiRules(preprocessed);
        const alternativeResult = hepburn.toHiragana(enhanced);
        if (alternativeResult.length > result.length) {
            return alternativeResult;
        }
    }

    return result;
}

// Preprocess romaji input to handle various common formats
function preprocessRomajiInput(s: string): string {
    let processed = s.toLowerCase();

    // Handle hyphens (remove them as they're often used for readability)
    processed = processed.replace(/-/g, '');

    // Handle excessive repeated vowels (normalize to double at most)
    processed = processed
        .replace(/a{3,}/g, 'aa')
        .replace(/i{3,}/g, 'ii')
        .replace(/u{3,}/g, 'uu')
        .replace(/e{3,}/g, 'ee')
        .replace(/o{3,}/g, 'oo');

    return processed;
}

// Apply basic romaji rules without heavy dictionary dependency
function applyBasicRomajiRules(s: string): string {
    // Only apply the most common and reliable patterns
    let result = s;

    // Basic long vowel patterns for common endings
    result = result
        .replace(/\btokyo\b/gi, 'toukyou')
        .replace(/\bkyoto\b/gi, 'kyouto')
        .replace(/\bosaka\b/gi, 'oosaka')
        .replace(/\bramen\b/gi, 'raamen')
        .replace(/\bsato\b/gi, 'satou')
        .replace(/\bkato\b/gi, 'katou')
        .replace(/\bito\b/gi, 'itou')
        .replace(/\bgoto\b/gi, 'gotou')
        .replace(/\bendo\b/gi, 'endou')
        .replace(/\bkondo\b/gi, 'kondou')
        .replace(/\bsaito\b/gi, 'saitou')
        .replace(/\bnaito\b/gi, 'naitou')
        .replace(/\bbento\b/gi, 'bentou')
        .replace(/\bgyoza\b/gi, 'gyouza')
        .replace(/\bkobe\b/gi, 'koube')

        // General patterns for common endings
        .replace(/\b(\w+)o\b/gi, (match, prefix) => {
            // Only apply to likely Japanese words
            if (/^[a-z]+$/.test(prefix) && prefix.length > 1) {
                return prefix + 'ou';
            }
            return match;
        });

    return result;
}

// Enhanced heuristic to detect if a string is likely romaji
function isLikelyRomaji(s: string): boolean {
    // Must contain only ASCII letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s\-']+$/.test(s)) {
        return false;
    }

    // Must be longer than 1 character
    if (s.length <= 1) {
        return false;
    }

    // Check for common romaji patterns
    const romajiPatterns = [
        /[aiueo]{2,}/,  // Long vowels like 'aa', 'ii', 'uu', 'ee', 'oo'
        /[ksthmngr][aiueo]/,  // Consonant + vowel
        /[aiueo][ksthmngr]/,  // Vowel + consonant
        /tsu|chi|sha|shu|sho|kyo|ryo|hyo|myo|nyo|pyo|byo|fyo|vyo|gyo|dyo|jyo|zyo/,  // Special combinations
        /([kstpn])\1/,  // Double consonants
    ];

    return romajiPatterns.some(pattern => pattern.test(s.toLowerCase()));
}
