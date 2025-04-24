import Aimai from '../src/index';
import { IndexedItem } from '../src/types'; // Import the type

// Create dummy indexed data for testing
const dummyIndexedList: IndexedItem<string>[] = [
    { original: '東京', normalized: 'とうきょう', reading: 'とうきょう' }, // Assuming normalization results
    { original: 'とうきょう', normalized: 'とうきょう', reading: 'とうきょう' },
    { original: 'トウキョウ', normalized: 'とうきょう', reading: 'とうきょう' },
    { original: '京都', normalized: 'きょうと', reading: 'きょうと' },
];

// Create dummy indexed data for object testing
interface Book {
    title: string;
    author: string;
}
const dummyIndexedBooks: IndexedItem<Book>[] = [
    { original: { title: '走れメロス', author: '太宰治' }, normalized: 'はしれめろす だざいおさむ', reading: 'はしれめろす だざいおさむ' },
    { original: { title: '人間失格', author: '太宰治' }, normalized: 'にんげんしっかく だざいおさむ', reading: 'にんげんしっかく だざいおさむ' },
    { original: { title: 'こころ', author: '夏目漱石' }, normalized: 'こころ なつめそうせき', reading: 'こころ なつめそうせき' },
];


describe('Aimai Integration Tests (with Pre-indexed Data)', () => {
    it('should create an instance with indexed data and perform a basic search', async () => {
        const aimai = new Aimai(dummyIndexedList); // Pass indexed data
        const results = await aimai.search('とうきょう');
        expect(results.length).toBeGreaterThanOrEqual(3); // Tokyo, とうきょう, トウキョウ should match
        // Check if the top result is one of the expected items
        expect(['東京', 'とうきょう', 'トウキョウ']).toContain(results[0].item);
        // Exact match might have score 1 depending on normalization/reading match
        expect(results[0].score).toBeCloseTo(1);
    });

    it('should handle romaji search query', async () => {
        const aimai = new Aimai(dummyIndexedList, { useRomajiSearch: true });
        const results = await aimai.search('tokyo');
        expect(results.length).toBeGreaterThanOrEqual(3);
        expect(['東京', 'とうきょう', 'トウキョウ']).toContain(results[0].item);
    });

    it('should work with indexed object arrays', async () => {
        const aimaiBooks = new Aimai(dummyIndexedBooks);
        const results = await aimaiBooks.search('だざい'); // Search by reading of author
        expect(results.length).toBe(2);
        expect(results[0].item.author).toBe('太宰治');
        expect(results[1].item.author).toBe('太宰治');
    });

    it('should respect the limit option', async () => {
        const aimai = new Aimai(dummyIndexedList, { limit: 1 });
        const results = await aimai.search('とうきょう');
        expect(results.length).toBe(1);
    });

    it('should exclude score if includeScore is false', async () => {
        const aimai = new Aimai(dummyIndexedList, { includeScore: false });
        const results = await aimai.search('とうきょう');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].score).toBeUndefined();
    });

    it('should handle empty indexed list gracefully', async () => {
        const aimai = new Aimai([]);
        const results = await aimai.search('test');
        expect(results).toEqual([]);
    });

    it('should handle search query not matching anything', async () => {
        const aimai = new Aimai(dummyIndexedList);
        const results = await aimai.search('さっぽろ');
        expect(results).toEqual([]);
    });

    it('should prioritize exact original match in sorting', async () => {
        const data: IndexedItem<string>[] = [
            { original: 'テストデータ', normalized: 'てすとでーた', reading: 'てすとでーた' },
            { original: 'テスト', normalized: 'てすと', reading: 'てすと' }, // Higher score for 'テスト' query
            { original: 'データ', normalized: 'でーた', reading: 'でーた' },
        ]; // Fixed missing closing bracket
        const aimai = new Aimai(data);
        const results = await aimai.search('テストデータ'); // Exact match query

        // Expect 'テストデータ' to be the first result, even if 'テスト' might have a good score
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].item).toBe('テストデータ');
    });

    // Add more tests for threshold, sorting, edge cases etc.
});
