const core = require('@actions/core');
const github = require('@actions/github');
const Anthropic = require('@anthropic-ai/sdk');
const { filterFiles } = require('./utils/fileFilter');
const { analyzeFile } = require('./analyzer');

async function run() {
  try {
    // Get inputs from action.yml
    const anthropicApiKey = core.getInput('anthropic_api_key', { required: true });
    const githubToken = core.getInput('github_token', { required: true });
    const analysisLevel = core.getInput('analysis_level');
    const model = core.getInput('model');
    const commentThreshold = parseFloat(core.getInput('comment_threshold'));

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Get the pull request context
    const context = github.context;
    if (context.payload.pull_request == null) {
      core.setFailed('This action can only be run on pull request events');
      return;
    }

    // Initialize Octokit
    const octokit = github.getOctokit(githubToken);

    // Get PR details
    const prNumber = context.payload.pull_request.number;
    const repo = context.repo;

    // Get PR changes
    const { data: files } = await octokit.rest.pulls.listFiles({
      ...repo,
      pull_number: prNumber,
    });

    // Get filter patterns from inputs
    const filePatterns = core
      .getInput('file_patterns')
      .split(',')
      .map((pattern) => pattern.trim())
      .filter(Boolean);

    const excludePatterns = core
      .getInput('exclude_patterns')
      .split(',')
      .map((pattern) => pattern.trim())
      .filter(Boolean);

    const maxFiles = parseInt(core.getInput('max_files'), 10);

    // Filter files using our utility
    const relevantFiles = filterFiles(files, {
      includePatterns: filePatterns,
      excludePatterns: excludePatterns,
      maxFiles,
    });

    // Analyze each file
    for (const file of relevantFiles) {
      try {
        // Get file content
        const { data: fileContent } = await octokit.rest.repos.getContent({
          ...repo,
          path: file.filename,
          ref: context.payload.pull_request.head.sha,
        });

        // Prepare file for analysis
        const fileData = {
          filename: file.filename,
          content: Buffer.from(fileContent.content, 'base64').toString(),
        };

        // Analyze with Claude
        const analysisComment = await analyzeFile(anthropic, fileData, {
          analysisLevel,
          model,
          commentThreshold,
        });

        // Only post comment if it meets the threshold
        if (analysisComment) {
          await octokit.rest.issues.createComment({
            ...repo,
            issue_number: prNumber,
            body: analysisComment,
          });
        } else {
          core.info(`Skipping comment for ${file.filename} - below confidence threshold`);
        }
      } catch (error) {
        core.warning(`Error processing file ${file.filename}: ${error.message}`);
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
