const fs = require('fs');
const path = require('path');
const github = require('@actions/github');

const { filterFiles } = require('./utils/fileFilter');
const { analyzeFile, formatAnalysisComment } = require('./analyzer');
const { AnthropicBatchManager } = require('./anthropic');

async function analyzeGitHubPR(config) {
  try {
    const {
      anthropicApiKey,
      githubToken,
      analysisLevel,
      model,
      filePatterns,
      excludePatterns,
      maxFiles,
      maxSize,
      prNumber,
      commentThreshold,
      writePullRequest,
      repo: repoFullName,
      output,
    } = config;

    console.log(`Analyzing PR ${repoFullName}#${prNumber}`);

    // Initialize clients
    const anthropic = new AnthropicBatchManager(anthropicApiKey, model);
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

    console.debug(`Analyzing ${relevantFiles.length} files`);
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
        const fileSizeKb = fileContent.size / 1024;
        if (fileSizeKb > maxSize) {
          console.error(`File ${file.filename} is too large (${fileSizeKb} KB). Skipping.`);
          if (writePullRequest) {
            await octokit.rest.issues.createComment({
              owner,
              repo,
              issue_number: prNumber,
              body: `:warning: File ${file.filename} is too large (${fileSizeKb} KB of max ${maxSize} KB). Skipping.`,
            });
          }
          continue;
        }
        // Prepare file for analysis
        const fileData = {
          filename: file.filename,
          content: Buffer.from(fileContent.content, 'base64').toString(),
        };

        // Prepare analysis prompt
        const analysisPrompt = await analyzeFile(fileData, {
          analysisLevel,
          model,
          commentThreshold,
        });
        if (anthropic.messages.length < maxFiles) {
          anthropic.addMessage(analysisPrompt, file.filename, fileSizeKb);
        } else {
          if (writePullRequest) {
            await octokit.rest.issues.createComment({
              owner,
              repo,
              issue_number: prNumber,
              body: `:warning: Max files reached.`,
            });
          } else {
            console.error(`Max files reached.`);
          }
          break;
        }

        console.log(`Analyzed ${file.filename}`);
      } catch (error) {
        console.error(`Error processing file ${file.filename}: ${error.message}`);
      }
    }
    console.debug('Sending batch to Anthropic');
    const batchId = await anthropic.sendBatch();
    let results = null;
    let finished = false;
    do {
      await anthropic
        .checkBatchCompleted(batchId)
        .then((result) => {
          finished = result === 'ended';
          return;
        })
        .catch((error) => {
          console.error(`Error getting batch results: ${error.message}`);
        });
      if (!finished) await anthropic.wait(60000);
    } while (!finished);
    results = await anthropic.getBatchResults(batchId);
    for (const result of results) {
      const analysisComment = formatAnalysisComment(result.fileName, result.content);
      if (writePullRequest) {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: analysisComment,
        });
      }
      if (!!output) {
        console.log('Printing analysis results');
        const timestamp = new Date().toISOString();
        const markdown = [
          `# AI Pull Request Analysis`,
          `Generated on: ${timestamp}`,
          `PR: ${repoFullName}#${prNumber}`,
          `File: ${result.filename}`,
          `${analysisComment}`,
        ].join('\n\n');
        if (!fs.existsSync(output)) {
          fs.mkdirSync(output, { recursive: true });
        }
        const fileName = result.fileName.split('/').join('-');
        const outputFile = path.join(output, `${fileName}.md`);
        fs.writeFileSync(outputFile, markdown, 'utf8');
        console.log(`Analysis written to ${output}`);
      }
    }
    console.debug('Batch completed');
    console.debug('Calculating tokens');
    const cost = await anthropic.calculateTokenPrices(model);
    // Format cost with at least 3 decimals
    const formattedCost = cost.toFixed(4);
    if (writePullRequest) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: [`:moneybag: Total cost of the analysis: $${formattedCost}.`, `- ${results.length} files analyzed.`].join(
          '\n\n',
        ),
      });
    }
  } catch (error) {
    console.error(`Error analyzing PR: ${error.message}`);
    throw error;
  }
}

module.exports = {
  analyzeGitHubPR,
};
