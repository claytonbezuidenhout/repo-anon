#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Anonymizer = require('../lib/processor');

const helpMessage = `
Anonymization Tool - CLI

Usage:
  node repo-anon.js <action> [input] [options]

Actions:
  anonymize: The action to perform (obscure phrases).
  deanonymize: The action to perform (unobscure phrases).

Arguments:
  input: The literal text to process OR a file path.

Options:
  -f, --file <path>: Explicitly specify a single file path to process.
  -d, --dir <path>: Process all files in a directory.
  -p, --pattern <glob>: Filter files by pattern (e.g., "*.txt", "**/*.js").
  -o, --out-dir <path>: Save processed files here (instead of stdout/overwrite).
  -r, --recursive: Process directories recursively (default with --dir).
  -c, --config <path>: Path to the .phrases.json file (default: .phrases.json).
  --overwrite: Overwrite existing files (only with -d or -f).

Examples:
  node repo-anon.js anonymize -d ./src -p "**/*.js" -o ./anon_src -r
  node repo-anon.js anonymize "Meeting with Acme Corp"
  cat document.txt | node repo-anon.js anonymize
`;

async function readFromStdin() {
  if (process.stdin.isTTY) return null;
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const lines = [];
  for await (const line of rl) lines.push(line);
  return lines.join('\n');
}

function isExistingFile(p) {
  try { return fs.existsSync(p) && fs.lstatSync(p).isFile(); } catch { return false; }
}

function isExistingDir(p) {
  try { return fs.existsSync(p) && fs.lstatSync(p).isDirectory(); } catch { return false; }
}

// Minimal glob-to-regex converter for pattern matching
function globToRegex(glob) {
  if (!glob) return null;
  // Convert glob to regex:
  // 1. Escape regex special characters (except * which we handle)
  let re = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape . + ^ $ { } ( ) | [ ] \
    .replace(/\*\*/g, '___DOUBLE_STAR___')
    .replace(/\*/g, '[^\\/]*')
    .replace(/___DOUBLE_STAR___/g, '.*');
  return new RegExp(`^${re}$`);
}

function shouldMatchPattern(patternRegex, candidatePath, baseName) {
  if (!patternRegex) return false;

  return patternRegex.test(candidatePath)
    || patternRegex.test(`./${candidatePath}`)
    || patternRegex.test(baseName)
    || patternRegex.test(`./${baseName}`);
}

function shouldIgnore(relativePath, ignoreRegexes = []) {
  const baseName = path.posix.basename(relativePath);
  return ignoreRegexes.some((ignoreRegex) => shouldMatchPattern(ignoreRegex, relativePath, baseName));
}

function walkSync(dir, fileList = [], recursive = true, rootDir = dir, ignoreRegexes = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    if (shouldIgnore(relativePath, ignoreRegexes)) {
      continue;
    }

    if (fs.statSync(filePath).isDirectory()) {
      if (recursive) walkSync(filePath, fileList, recursive, rootDir, ignoreRegexes);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.includes('-h') || args.includes('--help')) {
    console.log(helpMessage);
    return;
  }

  const action = args[0].toLowerCase();
  if (action !== 'anonymize' && action !== 'deanonymize') {
    console.log(`Error: Unknown action: ${action}\n${helpMessage}`);
    return;
  }

  // Parse simple flags
  let explicitFilePath = null;
  let explicitDirPath = null;
  let configPath = '.phrases.json';
  let outDir = null;
  let pattern = null;
  let recursive = false;
  let overwrite = false;
  let inputArg = null;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-f' || arg === '--file') {
      explicitFilePath = args[++i];
    } else if (arg === '-d' || arg === '--dir') {
      explicitDirPath = args[++i];
    } else if (arg === '-c' || arg === '--config') {
      configPath = args[++i];
    } else if (arg === '-o' || arg === '--out-dir') {
      outDir = args[++i];
    } else if (arg === '-p' || arg === '--pattern') {
      pattern = args[++i];
    } else if (arg === '-r' || arg === '--recursive') {
      recursive = true;
    } else if (arg === '--overwrite') {
      overwrite = true;
    } else if (!inputArg) {
      inputArg = arg;
    }
  }

  const anonymizer = new Anonymizer(configPath);
  const patternRegex = globToRegex(pattern);
  const ignoreRegexes = (anonymizer.ignore || []).map(globToRegex).filter(Boolean);

  // Determine what to process
  if (explicitDirPath || (inputArg && isExistingDir(inputArg))) {
    const dirToProcess = explicitDirPath || inputArg;
    const files = walkSync(dirToProcess, [], recursive || !!explicitDirPath, dirToProcess, ignoreRegexes);
    
    for (const filePath of files) {
      // Relative path for pattern matching and out-dir structure
      const relativePath = path.relative(dirToProcess, filePath).replace(/\\/g, '/');
      
      if (patternRegex && !shouldMatchPattern(patternRegex, relativePath, path.basename(filePath))) {
        continue;
      }

      const text = fs.readFileSync(filePath, 'utf8');
      const result = action === 'anonymize' ? anonymizer.anonymize(text) : anonymizer.deanonymize(text);

      if (outDir) {
        const targetPath = path.join(outDir, relativePath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, result, 'utf8');
      } else if (overwrite) {
        fs.writeFileSync(filePath, result, 'utf8');
      } else {
        console.log(`--- File: ${filePath} ---`);
        process.stdout.write(result + '\n');
      }
    }
  } else {
    // Single file or direct text or stdin
    let text;
    let isFile = false;
    let targetPath = explicitFilePath;

    if (explicitFilePath) {
      if (isExistingFile(explicitFilePath)) {
        text = fs.readFileSync(explicitFilePath, 'utf8');
        isFile = true;
      } else {
        console.error(`Error: File not found at ${explicitFilePath}`);
        return;
      }
    } else if (inputArg && inputArg !== '-') {
      if (isExistingFile(inputArg)) {
        text = fs.readFileSync(inputArg, 'utf8');
        isFile = true;
        targetPath = inputArg;
      } else {
        text = inputArg;
      }
    } else {
      text = await readFromStdin();
      if (text === null) {
        console.log('Error: No input provided and stdin is a terminal.\n' + helpMessage);
        return;
      }
    }

    const result = action === 'anonymize' ? anonymizer.anonymize(text) : anonymizer.deanonymize(text);

    if (isFile && outDir) {
      const fileName = path.basename(targetPath);
      const fullOutDir = path.resolve(process.cwd(), outDir);
      fs.mkdirSync(fullOutDir, { recursive: true });
      fs.writeFileSync(path.join(fullOutDir, fileName), result, 'utf8');
    } else if (isFile && overwrite) {
      fs.writeFileSync(targetPath, result, 'utf8');
    } else {
      process.stdout.write(result + '\n');
    }
  }
}

module.exports = { run };

if (require.main === module) {
  run().catch(err => {
    console.error(`An unexpected error occurred: ${err.message}`);
    process.exit(1);
  });
}
