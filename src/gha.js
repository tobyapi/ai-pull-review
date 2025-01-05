const core = require('@actions/core');
const { getConfigFromInputs } = require('./config');
const { analyzeGitHubPR } = require('./index');

async function run() {
  const config = getConfigFromInputs();
  await analyzeGitHubPR(config);
}

run()
  .then(() => {
    core.info('Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    console.error(error.stack);
    core.setFailed(error.message);
    process.exit(1);
  });
