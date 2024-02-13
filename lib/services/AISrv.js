/**
 *
 * @author Samuel Truniger
 * @date 12.02.2024
 */
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai"),
  config = require("../config/config.js");

const key = config.gpt.openaiAPIKey;
const endpoint = config.gpt.endpoint;
const deploymentId = config.gpt.deploymentId;

const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));

let askForHelp = async function (data) {
  try {
    const events = await client.getChatCompletions(deploymentId, data);

    return events.choices[0].message.content;
  } catch (err) {
    console.log(err);
  }
};

// export the service functions
exports.askForHelp = askForHelp;
