const fs = require('fs');
const path = require('path');
const Anonymizer = require('../lib/processor');
const { run } = require('../bin/repo-anon.js');

// Mock fs and Anonymizer
jest.mock('fs');
jest.mock('../lib/processor');

describe('CLI (bin/repo-anon.js)', () => {
  let originalArgv;
  let consoleLogSpy;
  let consoleErrorSpy;
  let stdoutWriteSpy;
  let exitSpy;

  beforeEach(() => {
    originalArgv = process.argv;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Default Anonymizer mock behavior
    Anonymizer.prototype.anonymize.mockImplementation(text => `anon(${text})`);
    Anonymizer.prototype.deanonymize.mockImplementation(text => `deanon(${text})`);
    Anonymizer.prototype.ignore = [];
  });

  afterEach(() => {
    process.argv = originalArgv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    exitSpy.mockRestore();
  });

  const runCLI = async (args) => {
    process.argv = ['node', 'repo-anon.js', ...args];
    await run();
  };

  it('should show help message when no arguments are provided', async () => {
    await runCLI([]);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('should show error for unknown action', async () => {
    await runCLI(['invalid-action']);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Unknown action'));
  });

  it('should anonymize direct text input', async () => {
    fs.existsSync.mockReturnValue(false); // Not a file
    await runCLI(['anonymize', 'hello world']);
    expect(stdoutWriteSpy).toHaveBeenCalledWith('anon(hello world)\n');
  });

  it('should anonymize a single file', async () => {
    const filePath = 'test.txt';
    const fileContent = 'file content';
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isFile: () => true, isDirectory: () => false });
    fs.readFileSync.mockReturnValue(fileContent);
    
    await runCLI(['anonymize', filePath]);
    
    expect(fs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('anon(file content)\n');
  });

  it('should anonymize a directory recursively', async () => {
    const dirPath = 'src';
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockImplementation((p) => ({
      isFile: () => p.endsWith('.js'),
      isDirectory: () => p === dirPath
    }));
    fs.readdirSync.mockReturnValue(['file1.js', 'subdir']);
    fs.statSync.mockImplementation((p) => ({
      isDirectory: () => p.endsWith('subdir')
    }));
    // Mock second call for subdir
    fs.readdirSync.mockReturnValueOnce(['file1.js', 'subdir']).mockReturnValueOnce(['file2.js']);
    fs.readFileSync.mockReturnValue('content');

    await runCLI(['anonymize', '-d', dirPath, '-r']);

    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--- File:'));
    expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('anon(content)'));
  });

  it('should overwrite file when --overwrite is used', async () => {
    const filePath = 'test.txt';
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isFile: () => true, isDirectory: () => false });
    fs.readFileSync.mockReturnValue('original');
    
    await runCLI(['anonymize', filePath, '--overwrite']);
    
    expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, 'anon(original)', 'utf8');
  });

  it('should save to out-dir when -o is used', async () => {
    const filePath = 'test.txt';
    const outDir = 'output';
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isFile: () => true, isDirectory: () => false });
    fs.readFileSync.mockReturnValue('original');
    
    await runCLI(['anonymize', filePath, '-o', outDir]);
    
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining(path.join(outDir, 'test.txt')), 'anon(original)', 'utf8');
  });

  it('should filter files by pattern', async () => {
    const dirPath = 'src';
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockImplementation((p) => ({
      isFile: () => true,
      isDirectory: () => p === dirPath
    }));
    fs.readdirSync.mockReturnValue(['file1.js', 'file2.txt']);
    fs.statSync.mockReturnValue({ isDirectory: () => false });
    fs.readFileSync.mockReturnValue('content');

    await runCLI(['anonymize', '-d', dirPath, '-p', '*.js']);

    // Should only process file1.js
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('file1.js'), 'utf8');
  });

  it('should ignore dotfiles and dot-directories from config ignore patterns', async () => {
    const dirPath = 'src';
    Anonymizer.prototype.ignore = ['./.*'];
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockImplementation((p) => ({
      isFile: () => false,
      isDirectory: () => p === dirPath
    }));
    fs.readdirSync
      .mockReturnValueOnce(['.env', '.git', 'visible.txt'])
      .mockReturnValueOnce(['hidden.txt']);
    fs.statSync.mockImplementation((p) => ({
      isDirectory: () => p.endsWith('.git')
    }));
    fs.readFileSync.mockReturnValue('content');

    await runCLI(['anonymize', '-d', dirPath, '-r']);

    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('visible.txt'), 'utf8');
  });

  it('should deanonymize text input', async () => {
    fs.existsSync.mockReturnValue(false);
    await runCLI(['deanonymize', 'anon(hello)']);
    expect(stdoutWriteSpy).toHaveBeenCalledWith('deanon(anon(hello))\n');
  });

  it('should handle explicit file path with --file', async () => {
    const filePath = 'explicit.txt';
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isFile: () => true, isDirectory: () => false });
    fs.readFileSync.mockReturnValue('content');
    
    await runCLI(['anonymize', '--file', filePath]);
    
    expect(fs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('anon(content)\n');
  });
});
