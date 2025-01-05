const core = require('@actions/core');
const github = require('@actions/github');

const defaultConfig = {
  model: 'claude-3-5-haiku-20241022',
  analysisLevel: 'standard',
  commentThreshold: 0.7,
  maxFiles: 10,
  maxSize: 100,
  filePatterns: ['**/*.{js,jsx,ts,tsx,py,java,rb,go,rs}'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  writePullRequest: true,
  output: false,
};

function getConfigFromInputs() {
  // Get the pull request context
  const context = github.context;
  if (!context.payload.pull_request) {
    throw new Error('This action can only be run on pull request events');
  }
  const prNumber = context.payload.pull_request.number;
  if (!prNumber) {
    throw new Error('Could not determine PR number');
  }
  return {
    anthropicApiKey: core.getInput('anthropic_api_key', { required: true }),
    githubToken: core.getInput('github_token', { required: true }),
    analysisLevel: core.getInput('analysis_level') || defaultConfig.analysisLevel,
    model: core.getInput('model') || defaultConfig.model,
    filePatterns:
      core
        .getInput('file_patterns')
        .split(',')
        .map((pattern) => pattern.trim())
        .filter(Boolean) || defaultConfig.filePatterns,
    excludePatterns:
      core
        .getInput('exclude_patterns')
        .split(',')
        .map((pattern) => pattern.trim())
        .filter(Boolean) || defaultConfig.excludePatterns,
    maxFiles: parseInt(core.getInput('max_files'), 10) || defaultConfig.maxFiles,
    maxSize: parseInt(core.getInput('max_size'), 10) || defaultConfig.maxSize,
    prNumber: prNumber,
    commentThreshold: parseFloat(core.getInput('comment_threshold')) || defaultConfig.commentThreshold,
    writePullRequest: defaultConfig.writePullRequest,
    repo: context.repo,
    output: defaultConfig.output,
  };
}

module.exports = {
  defaultConfig,
  getConfigFromInputs,
};
