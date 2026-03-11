# repo-anon

CLI tool to anonymize and deanonymize text or files using phrase mappings from a JSON config file.

## Usage

```bash
repo-anon <action> [input] [options]
```

Actions:

- `anonymize`: replace configured phrases with placeholders
- `deanonymize`: replace placeholders with original phrases

Options:

- `-f, --file <path>`: explicitly process a single file
- `-d, --dir <path>`: process all files in a directory
- `-p, --pattern <glob>`: only process files matching the glob
- `-o, --out-dir <path>`: write output files to another directory
- `-r, --recursive`: recurse into subdirectories
- `-c, --config <path>`: config file path, default `.phrases.json`
- `--overwrite`: overwrite input files instead of writing to stdout

Examples:

```bash
repo-anon anonymize "Meeting with Acme Corp"
repo-anon anonymize --file ./notes.txt
repo-anon anonymize --dir ./src --pattern "**/*.js" --out-dir ./anon-src --recursive
repo-anon deanonymize --file ./anon.txt --overwrite
```

## Config File

The config file is JSON and supports both phrase mappings and ignore patterns.

```json
{
  "mappings": {
    "Acme Corp": "COMPANY_A",
    "John Doe": "USER_1"
  },
  "ignore": ["./.*"]
}
```

Fields:

- `mappings`: object mapping original phrases to anonymized placeholders
- `ignore`: optional array of glob patterns to skip during directory processing

## Ignore Patterns

Ignore patterns are read from the config file and applied when processing directories.

Example:

```json
{
  "ignore": ["./.*"]
}
```

`./.*` ignores files and directories whose names start with a dot, such as:

- `.env`
- `.git`
- `.github`
- `.idea`

Behavior:

- ignored directories are skipped before recursion
- ignored files are not processed
- ignore patterns apply to directory traversal, not explicitly targeted single files passed with `--file`
- patterns are matched against both relative paths and basenames, with and without a leading `./`

## Notes

- If the config file is missing or empty, processing still runs with no mappings and no ignore rules.
- `--pattern` is an include filter. `ignore` is an exclude filter from the config file. Both can be used together.
