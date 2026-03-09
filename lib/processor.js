const fs = require('fs');
const path = require('path');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class Anonymizer {
  constructor(configPath = '.phrases.json') {
    // Normalize path for Windows compatibility
    this.configPath = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        // Fallback: check if the file is in the same directory as this script
        const fallbackPath = path.resolve(__dirname, path.basename(this.configPath));
        if (fs.existsSync(fallbackPath)) {
          this.configPath = fallbackPath;
        } else {
          this.mappings = {};
          return;
        }
      }
      const rawData = fs.readFileSync(this.configPath, 'utf8');
      if (!rawData.trim()) {
        this.mappings = {};
        return;
      }
      const data = JSON.parse(rawData);
      this.mappings = data.mappings || {};
    } catch (err) {
      console.error(`Warning: Could not load config from ${this.configPath}: ${err.message}`);
      this.mappings = {};
    }
  }

  anonymize(text) {
    if (!text) return text;
    let result = text;
    
    // Sort keys by length descending to match longest phrases first
    const sortedKeys = Object.keys(this.mappings).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
      const escapedKey = escapeRegExp(key);
      const regex = new RegExp(escapedKey, 'g');
      result = result.replace(regex, this.mappings[key]);
    }
    
    return result;
  }

  deanonymize(text) {
    if (!text) return text;
    let result = text;
    
    // Reverse mappings: placeholder -> original
    const reverseMappings = Object.entries(this.mappings).reduce((acc, [key, value]) => {
      acc[value] = key;
      return acc;
    }, {});
    
    // Sort values (placeholders) by length descending
    const sortedPlaceholders = Object.keys(reverseMappings).sort((a, b) => b.length - a.length);
    
    for (const placeholder of sortedPlaceholders) {
      const escapedPlaceholder = escapeRegExp(placeholder);
      const regex = new RegExp(escapedPlaceholder, 'g');
      result = result.replace(regex, reverseMappings[placeholder]);
    }
    
    return result;
  }
}

module.exports = Anonymizer;
