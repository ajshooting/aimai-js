import Aimai from '../src/index';

// Create dummy data for testing
const dummyStringList: string[] = [
    '東京',
    'とうきょう',
    'トウキョウ',
    '京都',
];

// Create dummy data for object testing
interface Book {
    title: string;
    author: string;
}
const dummyBooks: Book[] = [
    { title: '走れメロス', author: '太宰治' },
    { title: '人間失格', author: '太宰治' },
    { title: 'こころ', author: '夏目漱石' },
];

describe('Aimai Integration Tests (with Raw Data)', () => {
    it('should create an instance with string array data and perform a basic search', async () => {
        const aimai = new Aimai(dummyStringList);
        const results = await aimai.search('とうきょう');
        expect(results.length).toBeGreaterThanOrEqual(3); // Tokyo, とうきょう, トウキョウ should match
        // Check if the top result is one of the expected items
        expect(['東京', 'とうきょう', 'トウキョウ']).toContain(results[0].item);
        // Score should be close to 1 for exact match
        expect(results[0].score).toBeGreaterThan(0.8);
    });

    it('should handle romaji search query', async () => {
        const aimai = new Aimai(dummyStringList, { useRomajiSearch: true });
        const results = await aimai.search('tokyo');
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(['東京', 'とうきょう', 'トウキョウ']).toContain(results[0].item);
    });

    it('should work with object arrays using keys option', async () => {
        const aimaiBooks = new Aimai(dummyBooks, { keys: ['title', 'author'] });
        const results = await aimaiBooks.search('だざい'); // Search by author
        expect(results.length).toBe(2);
        expect(results[0].item.author).toBe('太宰治');
        expect(results[1].item.author).toBe('太宰治');
    });

    it('should work with object arrays without keys (search all string fields)', async () => {
        const aimaiBooks = new Aimai(dummyBooks);
        const results = await aimaiBooks.search('メロス');
        expect(results.length).toBe(1);
        expect(results[0].item.title).toBe('走れメロス');
    });

    it('should respect the limit option', async () => {
        const aimai = new Aimai(dummyStringList, { limit: 1 });
        const results = await aimai.search('とうきょう');
        expect(results.length).toBe(1);
    });

    it('should exclude score if includeScore is false', async () => {
        const aimai = new Aimai(dummyStringList, { includeScore: false });
        const results = await aimai.search('とうきょう');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].score).toBeUndefined();
    });

    it('should handle empty list gracefully', async () => {
        const aimai = new Aimai([]);
        const results = await aimai.search('test');
        expect(results).toEqual([]);
    });

    it('should handle search query not matching anything', async () => {
        const aimai = new Aimai(dummyStringList);
        const results = await aimai.search('さっぽろ');
        expect(results).toEqual([]);
    });

    it('should prioritize exact original match in sorting', async () => {
        const data: string[] = [
            'テストデータ',
            'テスト',
            'データ',
        ];
        const aimai = new Aimai(data);
        const results = await aimai.search('テストデータ'); // Exact match query

        // Expect 'テストデータ' to be the first result
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].item).toBe('テストデータ');
    });

    it('should work with static create method', async () => {
        const aimai = await Aimai.create(dummyStringList);
        const results = await aimai.search('とうきょう');
        expect(results.length).toBeGreaterThanOrEqual(3);
        expect(['東京', 'とうきょう', 'トウキョウ']).toContain(results[0].item);
    });
});
