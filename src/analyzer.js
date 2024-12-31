const core = require('@actions/core');

/**
 * Creates the analysis prompt for Claude
 * @param {string} filename - The name of the file
 * @param {string} content - The file content
 * @param {string} analysisLevel - The depth of analysis (basic, standard, deep)
 * @returns {string} The formatted prompt
 */
function createAnalysisPrompt(filename, content, analysisLevel = 'standard') {
  const prompts = {
    basic: `Please analyze this code change and provide basic feedback:
    
    File: ${filename}
    Changes:
    ${content}
    
    Please provide:
    1. Potential issues or bugs
    2. Basic style improvements`,

    standard: `Please analyze this code change and provide feedback:
    
    File: ${filename}
    Changes:
    ${content}
    
    Please provide:
    1. Potential issues or bugs
    2. Style improvements
    3. Performance considerations
    4. Security concerns
    5. Documentation needs`,

    deep: `Please perform a comprehensive analysis of this code change:
    
    File: ${filename}
    Changes:
    ${content}
    
    Please provide detailed feedback on:
    1. Potential bugs, edge cases, and reliability issues
    2. Code style and maintainability improvements
    3. Performance optimizations and scalability considerations
    4. Security vulnerabilities and best practices
    5. Documentation completeness and clarity
    6. Testing coverage and suggestions
    7. Error handling and edge cases
    8. Dependencies and potential issues
    9. Architecture and design patterns
    10. Integration points and API considerations`,
  };

  return prompts[analysisLevel] || prompts.standard;
}

/**
 * Formats the analysis response for GitHub comment
 * @param {string} filename - The name of the file
 * @param {string} analysis - The analysis from Claude
 * @returns {string} Formatted comment body
 */
function formatAnalysisComment(filename, analysis) {
  return `## AI Analysis for ${filename}

${analysis}

---
*Generated using Claude AI - Review and validate all suggestions*`;
}

/**
 * Analyzes a file using the Anthropic API
 * @param {Object} anthropic - Initialized Anthropic client
 * @param {Object} file - File object with filename and content
 * @param {Object} options - Analysis options
 * @returns {Promise<string>} Analysis result
 */
async function analyzeFile(anthropic, file, options = {}) {
  const {
    analysisLevel = 'standard',
    model = 'claude-3-5-haiku-20241022',
    maxTokens = 1024,
    commentThreshold = 0.7,
  } = options;

  try {
    const prompt = createAnalysisPrompt(file.filename, file.content, analysisLevel);

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    // Check if the response meets our confidence threshold
    const confidenceIndicators = {
      high: ['critical', 'severe', 'important', 'significant', 'major', 'definitely', 'must', 'required'],
      medium: ['should', 'recommend', 'consider', 'might', 'may', 'could improve', 'suggested'],
      low: ['minor', 'optional', 'potentially', 'slightly', 'might consider'],
    };

    const responseText = response.content[0].text.toLowerCase();

    // Calculate a simple confidence score based on the language used
    let confidenceScore = 0;

    // High priority indicators have more weight
    confidenceScore += confidenceIndicators.high.filter((indicator) => responseText.includes(indicator)).length * 0.4;

    // Medium priority indicators have medium weight
    confidenceScore += confidenceIndicators.medium.filter((indicator) => responseText.includes(indicator)).length * 0.2;

    // Low priority indicators have less weight
    confidenceScore += confidenceIndicators.low.filter((indicator) => responseText.includes(indicator)).length * 0.1;

    // Normalize score to be between 0 and 1
    const normalizedScore = Math.min(confidenceScore, 1);

    if (normalizedScore < commentThreshold) {
      core.debug(`Analysis confidence (${normalizedScore}) below threshold (${commentThreshold}). Skipping comment.`);
      return null;
    }

    core.debug(`Analysis confidence: ${normalizedScore}, proceeding with comment.`);

    return formatAnalysisComment(file.filename, response.content[0].text);
  } catch (error) {
    core.warning(`Error analyzing ${file.filename}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  analyzeFile,
  createAnalysisPrompt,
  formatAnalysisComment,
};
