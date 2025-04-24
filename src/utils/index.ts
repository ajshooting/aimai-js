import * as hepburn from 'hepburn';

// Convert romaji input to hiragana
export function romajiToHiragana(s: string): string {
    return hepburn.toHiragana(s);
}
