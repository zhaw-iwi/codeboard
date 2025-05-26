/**
 *
 * @author Samuel Truniger
 * @date 12.02.2024
 */
const { AzureOpenAI } = require('openai');
const config = require('../config/config.js');
const db = require('../models');

// client initialization for the OpenAI API
const apiKey = config.gpt.openaiAPIKey;
const endpoint = config.gpt.endpoint;
const deployment = config.gpt.deploymentId;
const apiVersion = config.gpt.apiVersion;
const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

// this function generates the prompt for a help request
const generateHelpRequestPrompt = function (query, userCodeContent, projectFiles) {
  const sysPrompt = `You are an AI tutor who answers student questions about Java code in German, using a maximum of 3 sentences. 
  Do not greet the student or include any unnecessary text. Use informal language when addressing the student.
  
  Use the provided student code and any predefined context (such as read-only files or sample solutions) 
  to generate your answer. Do not suggest or introduce elements that are not present in the sample solution.
  Also make sure to avoid suggesting a hint which is already given in the hint history. 
  
  Focus on helping the student understand the concepts and think further on their own.`;

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
  const sysPrompt = `Your role is to analyze Java code and provide students with helpful, didactic hints. 
  Focus on guiding the student toward understanding without giving away the full solution. 
  Hints must encourage the student to think critically and discover the solution independently.
  
  Use the provided student code and any predefined context (such as read-only files or sample solutions) 
  to identify the most relevant hint. Do not suggest or introduce elements that are not present in the sample solution.
  Also make sure to avoid suggesting a hint which is already given in the hint history.
  
  Do not include elements in the hint which are not present in the sample solution or read-only files. 
  If no meaningful hint can be provided or the task is correctly solved, respond with only the integer -1.
  
  Respond in German and use informal language when addressing the student.
  Return only the content of the hint or -1.`;

  const usrPrompt = `
  <task description>
    ${projectFiles.description}
  </task description>

  <student code>
    ${userCodeContent}
  </student code>

  <hint history>
    ${hintHistory}
  </hint history>

  <read-only files>
    ${projectFiles.staticFiles}
  </read-only files>

  <sample solution>
    ${projectFiles.solution}
  </sample solution>`;

  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: usrPrompt },
  ];
};

// this function generates the prompt for a compiler explanation request
const generateCompilerExplanationPrompt = function (error, username, userCodeContent) {
  const sysPrompt = `You are an AI tutor who explains Java compilation errors in German, using a maximum of 3 sentences.
  Use informal language when addressing the student. 
  You may address the student using their given username. Always mention in which class the error occurs. 
  Help the student understand the cause of the error and where it appears, but do not provide the exact solution.
  You may offer a hint that points in the right direction without resolving the issue directly. 
  If multiple errors exist, only explain 1 or 2 of them, since others may be consequential.`;

  const usrPrompt = `
  <error message>
    ${error}
  </error message>

  <username>
    ${username}
  </username>

  <student code>
    ${userCodeContent}
  </student code>`;

  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: usrPrompt },
  ];
};

// this function generates the prompt for a code explanation request
const generateCodeExplanationPrompt = function (code, selectedCode) {
  const sysPrompt = `You are an AI assistant that explains Java code selected by the user in a maximum of 3 sentences.
  The explanation must be in German and use informal language.
  Do not make suggestions, give advice, or comment on code quality - just explain what the code does.
  No greetings. Only the explanation.`;

  const usrPrompt = `The whole code is: ${code}\nThe selected code is: ${selectedCode}`;
  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: usrPrompt },
  ];
};

// this function generates the prompt for a code review request
const generateCodeReviewPrompt = function (staticFilesContent, filteredFiles) {
  const sysPrompt = `You are an AI Assistant tasked with reviewing Java code submitted in maximum 3 sentences. 
  The review must be in German and use informal language. 
  Focus on correctness, efficiency, and coding best practices, including clarity and style.
  Keep the feedback brief and constructive. No greetings. Only the explanation.`;

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
    const events = await client.chat.completions.create({ messages: data.msg });
    const usage = events.usage;

    // object which holds all data regarding the usage of the GPT based helper systems
    const statsData = {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
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
const askForCompilerExplanation = async function (data, tool = 'compErrExp') {
  const { userCodeContent, error, user, courseId, projectId } = data;

  const messages = generateCompilerExplanationPrompt(error, user.name, userCodeContent);

  const requestdata = {
    msg: messages,
    usrId: user.id,
    crsId: courseId,
    prjId: projectId,
    tool: tool,
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

// helper function to get the current week number
const getWeekNumber = function (date) {
  const currentDate = new Date(date.getTime());
  currentDate.setDate(currentDate.getDate() + 4 - (currentDate.getDay() || 7));
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((currentDate - yearStart) / 86400000 + 1) / 7);
  return weekNumber;
};

/*
 * Function to get the remaining requests for a user.
 * @param userId
 */
const getRemainingRequests = async function (userId) {
  const today = new Date();
  const numRequests = 100; // number of requests per week
  const weekNumber = getWeekNumber(today);

  // get the number of requests for the current week
  let userLimit = await db.APIRequestLimit.findOne({
    where: { userId: userId },
  });

  if (!userLimit) {
    // if no limit is set for the user, create a new one
    userLimit = await db.APIRequestLimit.create({
      userId: userId,
      availableRequests: numRequests,
      weekNumber: weekNumber,
    });
  } else if (userLimit.weekNumber !== weekNumber) {
    // Reset for new week if needed
    await userLimit.update({
      availableRequests: numRequests,
      weekNumber: weekNumber,
    });
    userLimit.availableRequests = numRequests;
  }
  return { remainingReq: userLimit.availableRequests };
};

/*
 * Function to check the request limit for a user.
 * This function is called every time a user makes a request to the API
 * to access and AI service from the middleware.
 * @param usrId
 */
const checkUserReqLimit = async function (usrId) {
  const today = new Date();
  const weekNumber = getWeekNumber(today);
  const numRequests = 100;

  const userLimit = await db.APIRequestLimit.findOne({
    where: { userId: usrId },
  });

  // the following conditions check how to handle the request limit
  if (!userLimit) {
    // if no limit is set for the user, create a new one
    await db.APIRequestLimit.create({
      userId: usrId,
      availableRequests: numRequests,
      weekNumber: weekNumber,
    });
  } else if (userLimit.availableRequests > 0 && userLimit.weekNumber === weekNumber) {
    // if the user has requests left and is in the same week, decrement the available requests
    await userLimit.update({
      availableRequests: userLimit.availableRequests - 1,
    });
  } else if (userLimit.weekNumber !== weekNumber) {
    // if the user is in a new week, reset the available requests
    await userLimit.update({
      availableRequests: numRequests,
      weekNumber: weekNumber,
    });
    userLimit.availableRequests = numRequests;
  } else if (userLimit.availableRequests <= 0) {
    // if the user has no requests left, return an object indicating that the limit is exceeded
    return { limitExceeded: true };
  }
  return userLimit;
};

// export the service functions
module.exports = {
  askForHelp,
  askForHint,
  askForCompilerExplanation,
  askForCodeExplanation,
  askForCodeReview,
  getUsageStats,
  getRemainingRequests,
  checkUserReqLimit,
};
