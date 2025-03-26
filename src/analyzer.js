/**
 * Creates the analysis prompt for Claude
 * @param {string} filename - The name of the file
 * @param {string} content - The file content
 * @param {string} analysisLevel - The depth of analysis (basic, standard, deep)
 * @returns {string} The formatted prompt
 */
function createAnalysisPrompt(filename, content, analysisLevel = 'standard', language = 'English') {
  const prompts = {
    basic: `Please analyze this code change and provide basic feedback in ${language}:
    
    File: ${filename}
    Changes:
    ${content}
    
    Please provide:
    1. Potential issues or bugs
    2. Basic style improvements`,

    standard: `Please analyze this code change and provide feedback in ${language}:
    
    File: ${filename}
    Changes:
    ${content}
    
    Please provide:
    1. Potential issues or bugs
    2. Style improvements
    3. Performance considerations
    4. Security concerns
    5. Documentation needs`,

    deep: `Please perform a comprehensive analysis of this code change in ${language}:
    
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
 * @param {Object} file - File object with filename and content
 * @param {Object} options - Analysis options
 * @returns {Promise<string>} Analysis result
 */
async function analyzeFile(file, options = {}) {
  const { analysisLevel = 'standard', language = 'English' } = options;

  try {
    const prompt = createAnalysisPrompt(file.filename, file.content, analysisLevel, language);
    return prompt;
  } catch (error) {
    console.error(`Error analyzing ${file.filename}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  analyzeFile,
  createAnalysisPrompt,
  formatAnalysisComment,
};
