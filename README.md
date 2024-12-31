# AI Pull Request Analysis

A GitHub Action that leverages Anthropic's Claude AI to provide intelligent analysis and review of pull requests.

## Project Overview

This GitHub Action integrates with Anthropic's AI to perform automated analysis of pull requests, helping teams maintain code quality and streamline the review process. The action analyzes changes, provides insights, and suggests improvements based on best practices.

## Key Features (Planned)

- Automated code review and analysis using Claude AI
- Detection of potential issues and vulnerabilities
- Style and consistency checking
- Documentation completeness assessment
- Performance impact evaluation
- Security best practices verification
- Clear, actionable feedback in PR comments

## Development Roadmap

1. Initial Setup

   - Create GitHub Action boilerplate
   - Set up development environment
   - Implement basic GitHub Action workflow

2. Core Functionality

   - Implement PR content extraction
   - Set up Anthropic API integration
   - Develop core analysis logic
   - Create feedback formatting system

3. Advanced Features

   - Implement customizable analysis rules
   - Add support for multiple programming languages
   - Create detailed reporting system
   - Develop configuration options

4. Testing & Documentation
   - Create comprehensive test suite
   - Write detailed documentation
   - Create usage examples
   - Add contribution guidelines

## Technical Requirements

- Node.js environment
- GitHub Actions workflow
- Anthropic API access
- GitHub API integration
- Repository access permissions

## Configuration Options (Planned)

- Analysis depth level
- Language-specific rules
- Custom analysis rules
- Feedback format preferences
- Exclusion patterns
- Rate limiting settings

## Security Considerations

- Secure API key handling
- Repository access management
- Rate limiting implementation
- Data privacy compliance
- Secure feedback handling

## Getting Started

### Prerequisites

1. You need an Anthropic API key to use this action. You can obtain one from [Anthropic's website](https://anthropic.com).
2. GitHub repository with pull request workflows enabled.

### Installation

1. Create a new workflow file in your repository under `.github/workflows` (e.g., `pr-analysis.yml`):

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

2. Add your Anthropic API key to your repository secrets:
   - Go to your repository settings
   - Navigate to Secrets and Variables > Actions
   - Create a new secret named `ANTHROPIC_API_KEY`
   - Add your Anthropic API key as the value

### Configuration

The action supports several configuration options that can be specified in your workflow file:

```yaml
- uses: diekotto/ai-pull-review@v1
  with:
    # Required inputs
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # Optional inputs with defaults
    file_patterns: '**/*.{js,jsx,ts,tsx,py,java,rb,go,rs}' # Files to analyze
    exclude_patterns: '**/node_modules/**,**/dist/**' # Files to exclude
    max_files: '10' # Maximum files to analyze
    comment_threshold: '0.7' # Minimum confidence for comments
    analysis_level: 'standard' # basic, standard, or deep
    model: 'claude-3-5-haiku-20241022' # Claude model to use
```

### Usage Example

Here's an example of a more detailed configuration that focuses on JavaScript files and uses deep analysis:

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

### Analysis Levels

The action supports three analysis levels:

- `basic`: Quick analysis focusing on potential bugs and style issues
- `standard`: Comprehensive analysis including performance and security
- `deep`: In-depth analysis covering all aspects including architecture and testing

### Error Handling

If the action encounters issues analyzing specific files, it will:

1. Log warnings for those files
2. Continue analyzing remaining files
3. Report errors in the GitHub Actions log
4. Skip files that exceed size or complexity limits

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
