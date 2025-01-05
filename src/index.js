const core = require('@actions/core');
const github = require('@actions/github');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs/promises');
const { filterFiles } = require('./utils/fileFilter');
const { analyzeFile } = require('./analyzer');
const { getConfigFromInputs } = require('./config');

async function analyzeGitHubPR(config) {
  try {
    const {
      anthropicApiKey,
      githubToken,
      analysisLevel,
      model,
      commentThreshold,
      filePatterns,
      excludePatterns,
      maxFiles,
      prNumber,
      repo: repoFullName,
      output,
    } = config;

    // Initialize clients
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const octokit = github.getOctokit(githubToken);

    // Parse repo owner and name
    const [owner, repo] = repoFullName.split('/');

    // Get PR files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Filter files
    const relevantFiles = filterFiles(files, {
      includePatterns: filePatterns,
      excludePatterns: excludePatterns,
      maxFiles,
    });

    // Store all analysis results
    const analysisResults = [];

    // Analyze each file
    for (const file of relevantFiles) {
      try {
        // Get file content
        const { data: fileContent } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.filename,
          ref: github.context.payload?.pull_request?.head?.sha,
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

        if (analysisComment) {
          // If we're in a GitHub Action, post comment
          if (process.env.GITHUB_ACTIONS) {
            await octokit.rest.issues.createComment({
              owner,
              repo,
              issue_number: prNumber,
              body: analysisComment,
            });
          }

          // Store analysis for output file
          analysisResults.push(analysisComment);
        }

        console.log(`Analyzed ${file.filename}`);
      } catch (error) {
        console.warning(`Error processing file ${file.filename}: ${error.message}`);
      }
    }

    // Write results to output file if specified
    if (output) {
      console.log('Printing analysis results');
      const timestamp = new Date().toISOString();
      const markdown = `# AI Pull Request Analysis
Generated on: ${timestamp}  
PR: ${repoFullName}#${prNumber}  

${analysisResults.join('\n\n---\n\n')}
`;

      await fs.writeFile(output, markdown, 'utf8');
      core.info(`Analysis written to ${output}`);
    }

    return analysisResults;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

// For GitHub Action
async function run() {
  try {
    const config = getConfigFromInputs();
    await analyzeGitHubPR(config);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = {
  analyzeGitHubPR,
  run,
};
