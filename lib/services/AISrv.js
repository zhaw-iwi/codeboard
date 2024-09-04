/**
 *
 * @author Samuel Truniger
 * @date 12.02.2024
 */
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai"),
  config = require("../config/config.js"),
  db = require("../models");

const key = config.gpt.openaiAPIKey;
const endpoint = config.gpt.endpoint;
const deploymentId = config.gpt.deploymentId;

const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));

// this service uses GPT to generate different responses based on the payload (msg)
let askForHelp = async function (data) {
  try {
    const events = await client.getChatCompletions(deploymentId, data.msg);
    const usage = events.usage;

    // object which holds all data regarding the usage of the GPT based helper systems
    const statsData = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      tool: data.tool,
      userId: data.usrId,
      projectId: data.prjId,
      courseId: data.crsId
    }

    // save the usage to the database
    await db.AIUsage.create(statsData);

    // returns the response from GPT
    return events.choices[0].message.content;
  } catch (err) {
    throw err;
  }
};

// export the service functions
exports.askForHelp = askForHelp;
