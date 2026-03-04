const fs = require('fs');
const path = require('path');

const PHRASES_FILE = '.phrases';

function loadPhrases() {
  if (!fs.existsSync(PHRASES_FILE)) {
    throw new Error('No .phrases file found.');
  }
  return JSON.parse(fs.readFileSync(PHRASES_FILE, 'utf8'));
}

function processContent(content, phrases, reverse = false) {
  let changed = false;
  let newContent = content;

  for (const [original, placeholder] of Object.entries(phrases)) {
    const search = reverse ? placeholder : original;
    const replace = reverse ? original : placeholder;
    if (newContent.includes(search)) {
      newContent = newContent.split(search).join(replace);
      changed = true;
    }
  }
  return changed ? newContent : null;
}

async function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', '.phrases', 'package.json', 'package-lock.json', 'bin', 'tests', '.gitlab-ci.yml'].includes(file)) continue;
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
  walk(process.cwd(), (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = processContent(content, phrases);
    if (newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  });
}

async function deanonymize() {
  const phrases = loadPhrases();
  walk(process.cwd(), (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = processContent(content, phrases, true);
    if (newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  });
}

module.exports = { anonymize, deanonymize, processContent };
