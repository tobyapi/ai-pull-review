const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');

class AnthropicBatchManager {
  constructor(apiKey, model = 'claude-3-5-sonnet-latest', maxTokens = 1024) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
    this.messages = [];
    this._currentWaitTime = null;
    this._minWaitTime = 10000;
    this._maxAmountOfRetries = 30;
  }

  /**
   * Adds a message to the batch
   * @param {string} content - The message content
   * @param {string} fileName - The name of the file
   * @param {number} size - The size of the file
   * @returns {string} The custom ID
   */
  addMessage(content, fileName, size) {
    const customId = uuidv4();
    this.messages.push({
      fileName,
      size: `${size} KB`,
      customId,
      content,
      response: '',
    });
    return customId;
  }

  /**
   * Sends the batch of messages to Anthropic
   * @returns {string} The batch ID
   */
  async sendBatch() {
    if (this.messages.length === 0) {
      throw new Error('No messages to send in batch');
    }

    const requests = this.messages.map((msg) => ({
      custom_id: msg.customId,
      params: {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: msg.content }],
      },
    }));

    try {
      const batch = await this.client.beta.messages.batches.create({
        requests,
      });

      this.batchId = batch.id;
      return this.batchId;
    } catch (error) {
      throw new Error(`Failed to send batch: ${error.message}`);
    }
  }

  async checkBatchCompleted(batchId) {
    if (!batchId) {
      throw new Error('No batch ID available');
    }

    try {
      const result = await this.client.beta.messages.batches.retrieve(batchId);
      return result.processing_status;
    } catch (error) {
      throw new Error(`Failed to get batch status: ${error.message}`);
    }
  }

  async getBatchResults(batchId) {
    if (!batchId) {
      throw new Error('No batch ID available');
    }

    const results = [];
    try {
      const batchResults = await this.client.beta.messages.batches.results(batchId);
      for await (const entry of batchResults) {
        const customId = entry.custom_id;
        const message = this.messages.find((msg) => msg.customId === customId);
        if (message) {
          message.response = entry.result.message.content[0].text;
        } else {
          console.error(`No message found for custom ID: ${customId}`);
          console.error(this.messages);
          continue;
        }
        results.push({
          fileName: message.fileName,
          size: message.size,
          content: message.response,
        });
      }
      return results;
    } catch (error) {
      throw new Error(`Failed to get batch results: ${error.message}`);
    }
  }

  async calculateTokenPrices(model) {
    let money = 0;
    const cost = this.getModelCost(model);
    for (const message of this.messages) {
      console.debug(`Token cost for file ${message.fileName}(${message.size}):`);
      const formatted = [
        { role: 'user', content: message.content },
        // The next one role is "assistant" but the api ask for a well formed message when only sending one
        { role: 'assistant', content: message.response },
      ];
      const inputResponse = await this.client.beta.messages.countTokens({
        messages: [formatted[0]],
        model,
      });
      const inputTokens = inputResponse.input_tokens;
      const inputCost = (inputTokens / 1000000) * cost.input;
      const outputResponse = await this.client.beta.messages.countTokens({
        messages: [formatted[1]],
        model,
      });
      const outputTokens = outputResponse.input_tokens;
      const outputCost = (outputTokens / 1000000) * cost.output;
      console.debug(`Input: ${inputTokens} tokens, $${inputCost}`);
      console.debug(`Output: ${outputTokens} tokens, $${outputCost}`);
      console.debug(`Combo cost: $${inputCost + outputCost}`);
      money += inputCost + outputCost;
    }
    console.debug(`Total cost of the batch: $${money}`);
    return money;
  }

  getModelCost(model) {
    // https://docs.anthropic.com/en/docs/about-claude/models
    switch (model) {
      case 'claude-3-5-sonnet-20241022':
        return { input: 3.0, output: 15.0 };
      case 'claude-3-5-haiku-20241022':
        return { input: 0.8, output: 4.0 };
      case 'claude-3-opus-20240229':
        return { input: 15.0, output: 75.0 };
      case 'claude-3-sonnet-20240229':
        return { input: 3.0, output: 15.0 };
      case 'claude-3-haiku-20240307':
        return { input: 0.25, output: 1.25 };
      default:
        throw new Error(`Unknown model: ${model}`);
    }
  }

  clearMessages() {
    this.messages = [];
  }

  async wait(initialMs) {
    if (!initialMs || isNaN(initialMs)) {
      throw new Error('Initial wait time is required');
    }
    if (this._maxAmountOfRetries === 0) {
      throw new Error('Max retries reached');
    }
    if (this._currentWaitTime === null) {
      this._currentWaitTime = initialMs;
    }

    console.debug(`Sleeping for ${this._currentWaitTime} ms`);

    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, this._currentWaitTime);
      this._currentWaitTime = Math.max(Math.floor(this._currentWaitTime * 0.666), this._minWaitTime);
      return timeout;
    });
  }
  resetWaitTime() {
    this._currentWaitTime = null;
  }
}

module.exports = { AnthropicBatchManager };
