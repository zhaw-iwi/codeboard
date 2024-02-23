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

let askForHelp = async function (data) {
  try {
    const events = await client.getChatCompletions(deploymentId, data.msg);
    const usage = events.usage;

    let saveUsage = await db.AIUsage.create({
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      tool: data.tool,
      userId: data.usrId,
      projectId: data.prjId,
      courseId: data.crsId
    });

    return events.choices[0].message.content;
  } catch (err) {
    console.log(err);
  }
};

// export the service functions
exports.askForHelp = askForHelp;
