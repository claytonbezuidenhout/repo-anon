const { processContent } = require('../lib/processor');

describe('repo-anon processor', () => {
    test('should anonymize content', () => {
        const phrases = { "company": "anon" };
        const content = "my company is here";
        const expected = "my anon is here";
        const result = processContent(content, phrases);
        expect(result).toBe(expected);
    });

    test('should deanonymize content', () => {
        const phrases = { "company": "anon" };
        const content = "my anon is here";
        const expected = "my company is here";
        // reverse = true
        const result = processContent(content, phrases, true);
        expect(result).toBe(expected);
    });

    test('should return null if no change', () => {
        const phrases = { "company": "anon" };
        const content = "nothing here";
        const result = processContent(content, phrases);
        expect(result).toBeNull();
    });
});
