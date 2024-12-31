# AI Pull Request Analysis

A GitHub Action powered by Anthropic's Claude AI that provides intelligent analysis and review of pull requests.

## Features

- Automated code review using Claude AI
- Detection of potential bugs and vulnerabilities
- Style and consistency checking
- Documentation assessment
- Performance impact analysis
- Security best practices verification
- Actionable feedback in PR comments

## Getting Started

### Prerequisites

1. Anthropic API key (obtain from [Anthropic's website](https://anthropic.com))
2. GitHub repository with pull request workflows enabled

### Installation

1. Create `.github/workflows/pr-analysis.yml`:

```yaml
name: PR Analysis
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
      - name: AI Pull Request Analysis
        uses: diekotto/ai-pull-review@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

2. Add your Anthropic API key to repository secrets:
   - Repository settings → Secrets and Variables → Actions
   - Create new secret: `ANTHROPIC_API_KEY`
   - Add your API key as the value

## Configuration

Available options for your workflow file:

```yaml
- uses: diekotto/ai-pull-review@v1
  with:
    # Required
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # Optional
    file_patterns: '**/*.{js,jsx,ts,tsx,py,java,rb,go,rs}' # Default: Files to analyze
    exclude_patterns: '**/node_modules/**,**/dist/**' # Default: Files to exclude
    max_files: '10' # Default: Maximum files to analyze
    comment_threshold: '0.7' # Default: Minimum confidence for comments
    analysis_level: 'standard' # Default: basic, standard, or deep
    model: 'claude-3-5-haiku-20241022' # Default: Claude model to use
```

### Analysis Levels

- `basic`: Quick analysis of bugs and style issues
- `standard`: Comprehensive analysis including performance and security
- `deep`: In-depth analysis including architecture and testing

### Example Configuration

Focused JavaScript analysis with deep inspection:

```yaml
name: Deep JS Analysis
on:
  pull_request:
    paths:
      - '**.js'
      - '**.jsx'
      - '**.ts'
      - '**.tsx'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
      - name: AI Pull Request Analysis
        uses: diekotto/ai-pull-review@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          file_patterns: '**/*.{js,jsx,ts,tsx}'
          exclude_patterns: '**/node_modules/**,**/dist/**,**/*.test.js'
          analysis_level: 'deep'
          max_files: '15'
          comment_threshold: '0.6'
```

### Error Handling

The action will:

- Log warnings for problematic files
- Continue analyzing remaining files
- Report errors in the GitHub Actions log
- Skip files exceeding size/complexity limits

## License

MIT License - see the [LICENSE](LICENSE) file for details.
