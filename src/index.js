const core = require('@actions/core');
const github = require('@actions/github');
const Anthropic = require('@anthropic-ai/sdk');

async function run() {
  try {
    // Get inputs from action.yml
    const anthropicApiKey = core.getInput('anthropic_api_key', { required: true });
    const githubToken = core.getInput('github_token', { required: true });

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

    // Filter relevant files for analysis
    const relevantFiles = files.filter((file) => {
      // TODO: Add logic to filter files based on extensions/paths
      return true;
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

        // Prepare content for analysis
        const content = Buffer.from(fileContent.content, 'base64').toString();

        // Analyze with Claude
        const analysis = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Please analyze this code change and provide feedback:
            
            File: ${file.filename}
            Changes:
            ${content}
            
            Please provide:
            1. Potential issues or bugs
            2. Style improvements
            3. Performance considerations
            4. Security concerns
            5. Documentation needs`,
            },
          ],
        });

        // Post comment with analysis
        await octokit.rest.issues.createComment({
          ...repo,
          issue_number: prNumber,
          body: `## AI Analysis for ${file.filename}\n\n${analysis.content[0].text}`,
        });
      } catch (error) {
        core.warning(`Error analyzing file ${file.filename}: ${error.message}`);
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
