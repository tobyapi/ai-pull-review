const core = require('@actions/core');
const { run } = require('./index');

run()
  .then(() => {
    console.log('Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    core.setFailed(error.message);
    process.exit(1);
  });
