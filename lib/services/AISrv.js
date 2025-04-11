/**
 *
 * @author Samuel Truniger
 * @date 12.02.2024
 */
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const config = require('../config/config.js');
const db = require('../models');

// client initialization for the OpenAI API
const key = config.gpt.openaiAPIKey;
const endpoint = config.gpt.endpoint;
const deploymentId = config.gpt.deploymentId;
const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));

// this function generates the prompt for a help request
const generateHelpRequestPrompt = function (query, userCodeContent, projectFiles) {
  const sysPrompt =
    'You are an AI-Assistant who answers questions about Java code in a maximum of 3 sentences in German. You do not have to greet the student! Please only include java concepts from the sample solution and the predefined files. Do not give detailed hints or provide the solution.';
  const usrPrompt = `
  <question>
    ${query}
  </question>
  
  <task description>
    ${projectFiles.description}
  </task description>

  <student code>
    ${userCodeContent}
  </student code>

  <predefined files>
    ${projectFiles.staticFiles}
  </predefined files>

  <sample solution>
    ${projectFiles.solution}
  </sample solution>
  `;

  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: usrPrompt },
  ];
};

// this function generates the prompt for a hint request
const generateHintPrompt = function (projectFiles, userCodeContent, hintHistory) {
  // to do: include hint history in the prompt
  const sysPrompt = `Your role is to examine Java Code and provide students with hints. Please analyze the provided information (delimited by XML tags) to determine the most relevant hint that helps the student complete his code. Make sure to not provide direct solutions. The student should still think about it on his own.\nIn addition, consider how predefined files (files that can not be changed by students) complement the task.\nIf no hint is applicable, respond with only with -1 as an int otherwise return only the content of the hint. Respond in German!\n`;
  const usrPrompt = `
    <task description>
      ${projectFiles.description}
    </task description>

    <student code>
      ${userCodeContent}
    </student code>

    <predefined files>
      ${projectFiles.staticFiles}
    </predefined files>

    <sample solution>
      ${projectFiles.solution}
    </sample solution>
    `;

  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: usrPrompt },
  ];
};

// this function generates the prompt for a compiler explanation request
const generateCompilerExplanationPrompt = function (error, username, userCodeContent) {
  const sysPrompt = `You are an AI-Assistant who explains compilation errors in Java in a maximum of 3 sentences in German. You can address the students with the given username.\nPlease always mention in which class the error occurs. You can also provide hints on how to solve the error.\nIf there are multiple compilation errors please only explain 1 or 2 of them (due to consequential errors).`;
  const usrPrompt = `
      <error message>
        ${error}
      </error message>

      <username>
        ${username}
      </username>

      <student code>
        ${userCodeContent}
      </student code>
      `;

  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: usrPrompt },
  ];
};

// this function generates the prompt for a code explanation request
const generateCodeExplanationPrompt = function (code, selectedCode) {
  const sysPrompt =
    'You are an AI-Assistant who explains Java code selected by the user in a maximum of 3 sentences in German. You do not have to greet the student!';
  const usrPrompt = `The whole code is: ${code}\nThe selected code is: ${selectedCode}`;
  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: usrPrompt },
  ];
};

// this function generates the prompt for a code review request
const generateCodeReviewPrompt = function (staticFilesContent, filteredFiles) {
  const sysPrompt =
    'You are an AI Assistant tasked with reviewing Java code submitted in maximum 5 sentences. Please respond in German. Analyze the code for correctness, efficiency, and adherence to coding best practices. Identify potential areas for improvement, including optimization opportunities, code clarity, and style issues.';
  const usrPrompt = `The whole code is: ${
    staticFilesContent || 'No code available!'
  }\nThe code to review is: ${filteredFiles.map((file) => file.content).join('\n')}`;

  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: usrPrompt },
  ];
};

// this service uses GPT to generate different responses based on the requested helper tool
const generateResponse = async function (data) {
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
      courseId: data.crsId,
    };

    // save the usage to the database
    await db.AIUsage.create(statsData);

    // returns the response from GPT
    return events.choices[0].message.content;
  } catch (err) {
    throw new Error(`Error in generateResponse: ${err.message}`);
  }
};

// this function is used when a student asks for help in the IDE
const askForHelp = async function (data) {
  const { query, userCodeContent, projectFiles, userId, courseId, projectId } = data;

  const messages = generateHelpRequestPrompt(query, userCodeContent, projectFiles);

  const requestdata = {
    msg: messages,
    usrId: userId,
    crsId: courseId,
    prjId: projectId,
    tool: 'helpRequest',
  };

  return await generateResponse(requestdata);
};

// this function is used when a student asks for a hint in the IDE
const askForHint = async function (data) {
  const { userCodeContent, projectFiles, hintHistory, userId, courseId, projectId } = data;

  const messages = generateHintPrompt(projectFiles, userCodeContent, hintHistory);

  const requestdata = {
    msg: messages,
    usrId: userId,
    crsId: courseId,
    prjId: projectId,
    tool: 'hints',
  };

  return await generateResponse(requestdata);
};

// this function is used when a compiler explanation should be explained
const askForCompilerExplanation = async function (data) {
  const { userCodeContent, error, user, courseId, projectId } = data;

  const messages = generateCompilerExplanationPrompt(error, user.name, userCodeContent);

  const requestdata = {
    msg: messages,
    usrId: user.id,
    crsId: courseId,
    prjId: projectId,
    tool: 'compilerExplanation',
  };

  return await generateResponse(requestdata);
};

// this function is used when a code explanation should be generated
const askForCodeExplanation = async function (data) {
  const { code, selectedCode, userId, courseId, projectId } = data;

  const messages = generateCodeExplanationPrompt(code, selectedCode);

  const requestdata = {
    msg: messages,
    usrId: userId,
    crsId: courseId,
    prjId: projectId,
    tool: 'codeExp',
  };

  return await generateResponse(requestdata);
};

// this function is used when a code review should be generated
const askForCodeReview = async function (data) {
  const { staticFilesContent, filteredFiles, userId, courseId, projectId } = data;

  const messages = generateCodeReviewPrompt(staticFilesContent, filteredFiles);

  const requestdata = {
    msg: messages,
    usrId: userId,
    crsId: courseId,
    prjId: projectId,
    tool: 'codeReview',
  };

  return await generateResponse(requestdata);
};

// function which returns the usage stats of the AI helper tools in CSV format
const getUsageStats = async function () {
  const stats = await db.AIUsage.findAll({
    attributes: [
      'id',
      'promptTokens',
      'completionTokens',
      'totalTokens',
      'tool',
      'userId',
      'courseId',
      'projectId',
      'createdAt',
    ],
    // return plain json objects
    raw: true,
  });

  if (!stats) {
    throw new Error('No usage stats found!');
  }

  // take the keys of the first object as headers
  const jsonKeys = Object.keys(stats[0]);

  // seperate headers by ","
  const headerRow = jsonKeys.join(',');
  const rowData = stats.map((item) => {
    return jsonKeys.map((key) => item[key]).join(',');
  });

  const csvStats = `${headerRow}\n${rowData.join('\n')}`;

  return csvStats;
};

// export the service functions
module.exports = {
  askForHelp,
  askForHint,
  askForCompilerExplanation,
  askForCodeExplanation,
  askForCodeReview,
  getUsageStats,
};
