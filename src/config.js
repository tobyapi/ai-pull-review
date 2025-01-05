const core = require('@actions/core');

const defaultConfig = {
  model: 'claude-3-5-haiku-20241022',
  analysisLevel: 'standard',
  commentThreshold: 0.7,
  maxFiles: 10,
  filePatterns: ['**/*.{js,jsx,ts,tsx,py,java,rb,go,rs}'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**'],
};

function getConfigFromInputs() {
  return {
    anthropicApiKey: core.getInput('anthropic_api_key', { required: true }),
    githubToken: core.getInput('github_token', { required: true }),
    analysisLevel: core.getInput('analysis_level') || defaultConfig.analysisLevel,
    model: core.getInput('model') || defaultConfig.model,
    commentThreshold: parseFloat(core.getInput('comment_threshold')) || defaultConfig.commentThreshold,
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
  };
}

module.exports = {
  defaultConfig,
  getConfigFromInputs,
};
