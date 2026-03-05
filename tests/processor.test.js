const {
  processContent,
  applyReverseReplacementHistory,
} = require('../lib/processor');

describe('repo-anon processor', () => {
  test('should anonymize content', () => {
    const phrases = { company: 'anon' };
    const content = 'my company is here';
    const expected = 'my anon is here';
    const result = processContent(content, phrases);
    expect(result).toBe(expected);
  });

  test('should deanonymize content', () => {
    const phrases = { company: 'anon' };
    const content = 'my anon is here';
    const expected = 'my company is here';
    const result = processContent(content, phrases, true);
    expect(result).toBe(expected);
  });

  test('should replace inside words by default', () => {
    const phrases = { th: 'BB' };
    const content = 'th with other';
    const expected = 'BB wiBB oBBer';
    const result = processContent(content, phrases);
    expect(result).toBe(expected);
  });

  test('should only replace standalone words when wordReplace is true', () => {
    const phrases = {
      ck: {
        placeholder: 'bb',
        wordReplace: true,
      },
    };
    const content = 'ck back sack (ck) ck.';
    const expected = 'bb back sack (bb) bb.';
    const result = processContent(content, phrases);
    expect(result).toBe(expected);
  });

  test('should only deanonymize standalone placeholders when wordReplace is true', () => {
    const phrases = {
      ck: {
        placeholder: 'bb',
        wordReplace: true,
      },
    };
    const content = 'bb babb stubb (bb) bb.';
    const expected = 'ck babb stubb (ck) ck.';
    const result = processContent(content, phrases, true);
    expect(result).toBe(expected);
  });

  test('should return null if no change', () => {
    const phrases = { company: 'anon' };
    const content = 'nothing here';
    const result = processContent(content, phrases);
    expect(result).toBeNull();
  });

  test('should track ordered replacements during anonymize', () => {
    const phrases = {
      company: 'ANON_COMPANY',
      project: 'ANON_PROJECT',
    };
    const content = 'company project company';

    const result = processContent(content, phrases, false, { trackHistory: true });

    expect(result.content).toBe('ANON_COMPANY ANON_PROJECT ANON_COMPANY');
    expect(result.replacements).toEqual([
      {
        search: 'company',
        replace: 'ANON_COMPANY',
        wordReplace: false,
        count: 2,
      },
      {
        search: 'project',
        replace: 'ANON_PROJECT',
        wordReplace: false,
        count: 1,
      },
    ]);
  });

  test('should replay replacement history in reverse using recorded counts', () => {
    const content = 'ANON_COMPANY x ANON_COMPANY ANON_COMPANY';
    const replacements = [
      {
        search: 'company',
        replace: 'ANON_COMPANY',
        wordReplace: false,
        count: 2,
      },
    ];

    const restored = applyReverseReplacementHistory(content, replacements);

    expect(restored).toBe('company x company ANON_COMPANY');
  });

  test('should support additional deanonymization after history replay', () => {
    const phrases = { company: 'ANON_COMPANY' };
    const content = 'ANON_COMPANY x ANON_COMPANY ANON_COMPANY';
    const replacements = [
      {
        search: 'company',
        replace: 'ANON_COMPANY',
        wordReplace: false,
        count: 2,
      },
    ];

    const restoredFromHistory = applyReverseReplacementHistory(content, replacements);
    const fullyRestored = processContent(restoredFromHistory, phrases, true);

    expect(fullyRestored).toBe('company x company company');
  });
});
