# repo-anon

A Node.js CLI tool to anonymize and de-anonymize files in a repository based on a `.phrases` configuration file. Perfect for preparing repositories for AI processing while keeping sensitive info, such as company or brand names, protected.

## Features

- **Anonymize**: Replaces sensitive phrases with configured placeholders.
- **Replacement History**: Writes `.repo-anon-history.json` with ordered per-file replacement events (including counts).
- **De-anonymize**: Replays replacement history in reverse order, then runs a full phrase-based pass to also restore new placeholder usage added later.
- **Recursive**: Traverses through all project directories (ignoring `node_modules`, `.git`, etc.).
- **CI/CD Ready**: Includes GitLab pipeline configuration for publishing to the GitLab package registry.

## Installation

```bash
npm install -g @your_gitlab_namespace/repo-anon
```

*(Note: Replace `@your_gitlab_namespace` with your actual GitLab namespace).*

## Usage

1. Create a `.phrases` file in the current working directory:

   ```json
   {
     "CompanyA": "ANON_COMPANY_A",
     "ck": {
       "placeholder": "bb",
       "wordReplace": true
     }
   }
   ```

   String values keep the old behavior and replace matches anywhere inside a word.
   Object values let you opt into whole-word matching with `wordReplace: true`.

2. Run the anonymization command:

   ```bash
   repo-anon anonymize
   ```

   This also writes `.repo-anon-history.json` in the working directory.

3. Revert changes (if needed):

   ```bash
   repo-anon deanonymize
   ```

   De-anonymization uses the history file first to reverse exact prior replacements in order, then applies phrase-based de-anonymization globally so newly introduced placeholders are also restored.

## Development

- **Tests**: Run unit tests using `npm test`.
- **Linting**: Lint the project using `npm run lint`.

## CI/CD Deployment

The project includes a `.gitlab-ci.yml` configured to automatically publish new versions to the GitLab package registry when a tag is pushed.

---
Built with ❤️.
