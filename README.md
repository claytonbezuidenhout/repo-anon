# repo-anon

A Node.js CLI tool to anonymize and de-anonymize files in a repository based on a `.phrases` configuration file. Perfect for preparing repositories for AI processing while keeping sensitive info, such as company or brand names, protected.

## Features

- **Anonymize**: Replaces sensitive phrases with configured placeholders.
- **De-anonymize**: Restores original phrases from placeholders.
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
     "BrandX": "ANON_BRAND_X"
   }
   ```

2. Run the anonymization command:

   ```bash
   repo-anon anonymize
   ```

3. Revert changes (if needed):

   ```bash
   repo-anon deanonymize
   ```

## Development

- **Tests**: Run unit tests using `npm test`.
- **Linting**: Lint the project using `npm run lint`.

## CI/CD Deployment

The project includes a `.gitlab-ci.yml` configured to automatically publish new versions to the GitLab package registry when a tag is pushed.

---
Built with ❤️.
