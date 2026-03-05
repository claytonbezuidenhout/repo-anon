const fs = require('fs');
const path = require('path');

const PHRASES_FILE = '.phrases';
const HISTORY_FILE = '.repo-anon-history.json';
const WORD_CHAR_CLASS = 'A-Za-z0-9_';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePhrases(phrases) {
  return Object.entries(phrases).map(([original, config]) => {
    if (typeof config === 'string') {
      return { original, placeholder: config, wordReplace: false };
    }

    return {
      original,
      placeholder: config.placeholder,
      wordReplace: config.wordReplace === true,
    };
  });
}

function loadPhrases() {
  if (!fs.existsSync(PHRASES_FILE)) {
    throw new Error('No .phrases file found.');
  }
  return JSON.parse(fs.readFileSync(PHRASES_FILE, 'utf8'));
}

function buildPattern(search, wordReplace) {
  const escapedSearch = escapeRegExp(search);
  return wordReplace
    ? new RegExp(`(^|[^${WORD_CHAR_CLASS}])(${escapedSearch})(?=[^${WORD_CHAR_CLASS}]|$)`, 'g')
    : new RegExp(escapedSearch, 'g');
}

function replaceWithCount(content, search, replace, wordReplace, maxReplacements = Number.POSITIVE_INFINITY) {
  if (!search || !replace || maxReplacements <= 0 || !content.includes(search)) {
    return { content, count: 0 };
  }

  const pattern = buildPattern(search, wordReplace);
  let count = 0;

  const updatedContent = wordReplace
    ? content.replace(pattern, (match, prefix) => {
      if (count >= maxReplacements) {
        return match;
      }
      count += 1;
      return `${prefix}${replace}`;
    })
    : content.replace(pattern, (match) => {
      if (count >= maxReplacements) {
        return match;
      }
      count += 1;
      return replace;
    });

  return { content: updatedContent, count };
}

function processContent(content, phrases, reverse = false, options = {}) {
  let changed = false;
  let newContent = content;
  const replacements = [];

  const entries = normalizePhrases(phrases).sort(
    (leftEntry, rightEntry) => {
      const left = reverse ? leftEntry.placeholder : leftEntry.original;
      const right = reverse ? rightEntry.placeholder : rightEntry.original;
      return right.length - left.length;
    }
  );

  for (const { original, placeholder, wordReplace } of entries) {
    const search = reverse ? placeholder : original;
    const replace = reverse ? original : placeholder;
    const result = replaceWithCount(newContent, search, replace, wordReplace);

    if (result.count > 0) {
      newContent = result.content;
      changed = true;
      if (options.trackHistory === true) {
        replacements.push({
          search,
          replace,
          wordReplace,
          count: result.count,
        });
      }
    }
  }

  if (!changed) {
    return null;
  }

  if (options.trackHistory === true) {
    return { content: newContent, replacements };
  }

  return newContent;
}

function applyReverseReplacementHistory(content, replacements = []) {
  let changed = false;
  let newContent = content;

  for (let index = replacements.length - 1; index >= 0; index -= 1) {
    const event = replacements[index];
    const result = replaceWithCount(
      newContent,
      event.replace,
      event.search,
      event.wordReplace,
      event.count
    );

    if (result.count > 0) {
      newContent = result.content;
      changed = true;
    }
  }

  return changed ? newContent : null;
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  return raw && typeof raw === 'object' ? raw : null;
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

async function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', '.phrases', HISTORY_FILE, 'package.json', 'package-lock.json', 'bin', 'tests', '.gitlab-ci.yml'].includes(file)) continue;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      await walk(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}

async function anonymize() {
  const phrases = loadPhrases();
  const history = {
    version: 1,
    createdAt: new Date().toISOString(),
    files: {},
  };

  walk(process.cwd(), (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = processContent(content, phrases, false, { trackHistory: true });

    if (result) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      history.files[filePath] = result.replacements;
      console.log(`Updated: ${filePath}`);
    }
  });

  saveHistory(history);
  console.log(`Saved replacement history to: ${HISTORY_FILE}`);
}

async function deanonymize() {
  const phrases = loadPhrases();
  const history = loadHistory();

  walk(process.cwd(), (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');

    let newContent = null;
    if (history && history.files && Array.isArray(history.files[filePath])) {
      newContent = applyReverseReplacementHistory(content, history.files[filePath]);
    }

    const fallbackInput = newContent || content;
    const fallbackContent = processContent(fallbackInput, phrases, true);

    const finalContent = fallbackContent || newContent;
    if (finalContent) {
      fs.writeFileSync(filePath, finalContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  });
}

module.exports = {
  anonymize,
  deanonymize,
  processContent,
  replaceWithCount,
  applyReverseReplacementHistory,
  HISTORY_FILE,
};
