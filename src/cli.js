#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const { analyzeGitHubPR } = require('./index');

program
  .name('ai-pull-review')
  .description('AI-powered pull request analysis')
  .version(require('../package.json').version)
  .requiredOption('-p, --pr <number>', 'Pull request number')
  .option('-r, --repo <owner/repo>', 'Repository (default: from git config)')
  .option('-t, --token <token>', 'GitHub token', process.env.GITHUB_TOKEN)
  .option('-k, --key <key>', 'Anthropic API key', process.env.ANTHROPIC_API_KEY)
  .option('-l, --level <level>', 'Analysis level (basic, standard, deep)', 'standard')
  .option('-m, --model <model>', 'Claude model to use', 'claude-3-5-haiku-20241022')
  .option('--file-patterns <patterns>', 'File patterns to include (comma-separated)')
  .option('--exclude-patterns <patterns>', 'File patterns to exclude (comma-separated)')
  .option('--max-files <number>', 'Maximum files to analyze', '10')
  .option('--threshold <number>', 'Comment confidence threshold', '0.6')
  .option('-o, --output <file>', 'Output file for results', 'results.md');

program.parse();

const options = program.opts();

// Validate required inputs
if (!options.token) {
  console.error('Error: GitHub token is required. Set GITHUB_TOKEN env var or use --token');
  process.exit(1);
}

if (!options.key) {
  console.error('Error: Anthropic API key is required. Set ANTHROPIC_API_KEY env var or use --key');
  process.exit(1);
}

// Get repo from git config if not provided
if (!options.repo) {
  try {
    const { execSync } = require('child_process');
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) {
      options.repo = match[1];
    }
  } catch (error) {
    console.error('Error: Could not determine repository. Please provide --repo');
    process.exit(1);
  }
}

// Convert options to config object
const config = {
  anthropicApiKey: options.key,
  githubToken: options.token,
  analysisLevel: options.level,
  model: options.model,
  commentThreshold: parseFloat(options.threshold),
  filePatterns: options.filePatterns?.split(',').map((p) => p.trim()) || [],
  excludePatterns: options.excludePatterns?.split(',').map((p) => p.trim()) || [],
  maxFiles: parseInt(options.maxFiles, 10),
  prNumber: parseInt(options.pr, 10),
  repo: options.repo,
  output: options.output,
};

analyzeGitHubPR(config)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
