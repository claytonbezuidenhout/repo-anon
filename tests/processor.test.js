const fs = require('fs');
const Anonymizer = require('../lib/processor');

jest.mock('fs');

describe('Anonymizer', () => {
  const mockConfig = {
    mappings: {
      'Acme Corp': 'COMPANY_A',
      'John Doe': 'USER_1',
      'secret-key-123': 'SECRET_KEY'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor and loadConfig', () => {
    it('should load config from default path if it exists', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      
      const anonymizer = new Anonymizer();
      expect(anonymizer.mappings).toEqual(mockConfig.mappings);
      expect(anonymizer.ignore).toEqual([]);
    });

    it('should load ignore patterns from config file', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        ...mockConfig,
        ignore: ['./.*', '**/*.log']
      }));

      const anonymizer = new Anonymizer();
      expect(anonymizer.ignore).toEqual(['./.*', '**/*.log']);
    });

    it('should use fallback path if default path does not exist', () => {
      fs.existsSync.mockImplementation((p) => p.includes('fallback'));
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      
      // We need to trigger the fallback logic. 
      // The code checks if configPath exists, if not it tries fallbackPath.
      fs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
      
      const anonymizer = new Anonymizer('missing.json');
      expect(anonymizer.mappings).toEqual(mockConfig.mappings);
    });

    it('should handle empty or missing config file', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('');
      
      const anonymizer = new Anonymizer();
      expect(anonymizer.mappings).toEqual({});
      expect(anonymizer.ignore).toEqual([]);
    });

    it('should handle invalid JSON in config file', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const anonymizer = new Anonymizer();
      expect(anonymizer.mappings).toEqual({});
      expect(anonymizer.ignore).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('anonymize', () => {
    let anonymizer;

    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      anonymizer = new Anonymizer();
    });

    it('should return same text if null or empty', () => {
      expect(anonymizer.anonymize(null)).toBeNull();
      expect(anonymizer.anonymize('')).toBe('');
    });

    it('should replace phrases with placeholders', () => {
      const input = 'Welcome to Acme Corp, John Doe!';
      const expected = 'Welcome to COMPANY_A, USER_1!';
      expect(anonymizer.anonymize(input)).toBe(expected);
    });

    it('should handle overlapping phrases by length (longest first)', () => {
      anonymizer.mappings = {
        'Acme': 'SHORT',
        'Acme Corp': 'LONG'
      };
      const input = 'Welcome to Acme Corp';
      expect(anonymizer.anonymize(input)).toBe('Welcome to LONG');
    });

    it('should escape regex special characters in phrases', () => {
      anonymizer.mappings = {
        'user.name': 'USER_NAME'
      };
      const input = 'The user.name is here';
      expect(anonymizer.anonymize(input)).toBe('The USER_NAME is here');
    });
  });

  describe('deanonymize', () => {
    let anonymizer;

    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      anonymizer = new Anonymizer();
    });

    it('should return same text if null or empty', () => {
      expect(anonymizer.deanonymize(null)).toBeNull();
      expect(anonymizer.deanonymize('')).toBe('');
    });

    it('should replace placeholders with original phrases', () => {
      const input = 'Welcome to COMPANY_A, USER_1!';
      const expected = 'Welcome to Acme Corp, John Doe!';
      expect(anonymizer.deanonymize(input)).toBe(expected);
    });

    it('should handle overlapping placeholders by length', () => {
      anonymizer.mappings = {
        'Original': 'PLACEHOLDER',
        'Something Else': 'PLACEHOLDER_LONG'
      };
      const input = 'Testing PLACEHOLDER_LONG and PLACEHOLDER';
      const expected = 'Testing Something Else and Original';
      expect(anonymizer.deanonymize(input)).toBe(expected);
    });
  });
});
