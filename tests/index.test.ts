import Aimai from '../src/index';

describe('Aimai Integration Tests', () => {
    it('should create an instance and perform a basic search', async () => {
        const list = ['東京', 'とうきょう', 'トウキョウ'];
        const aimai = new Aimai(list);
        const results = await aimai.search('とうきょう');
        expect(results.length).toBeGreaterThan(0);
        // Add more specific assertions based on expected behavior
        expect(results[0].item).toBe('とうきょう');
        expect(results[0].score).toBe(1);
    });

    // Add more integration tests here
});
