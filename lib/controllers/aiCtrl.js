'use strict';

/**
 * Created by Samuel Truniger.
 *
 * Controller for hanlding request to chatGPT for hints.
 */

const projectSrv = require('../services/projectSrv.js');
const AiSrv = require('../services/AISrv.js');
const userSrv = require('../services/userSrv.js');
const chatSrv = require('../services/chatSrv.js');
const submissionSrv = require('../services/submissionSrv.js');

// function which makes a call to openai API to get help for a student question
const getHelp = async function (req, res) {
  try {
    const { query, chatLineId } = req.body;
    const { courseId, projectId } = req.params;
    const userId = req.user.id;

    // to do: check for valid params

    // get all changable user files
    const userCodeContent = await projectSrv.getAllChangeableUserFiles(userId, courseId, projectId);
    // get sample solution and project description
    const projectFiles = await projectSrv.getProjectFiles(projectId);

    // create the data object for the AI service
    const data = {
      query: query,
      userCodeContent: userCodeContent,
      projectFiles: projectFiles,
      userId: userId,
      courseId: courseId,
      projectId: projectId,
    };

    const help = await AiSrv.askForHelp(data);

    // get the current chat line
    const chatLine = await chatSrv.getChatLine(chatLineId);

    // parse the current message (which is stored as a string)
    let messageObj = JSON.parse(chatLine.message);

    // update the cardBody property with the response from the LLM
    messageObj.cardBody = help;

    // update the chat line with the stringified updated message
    await chatSrv.updateChatLine(chatLineId, {
      message: JSON.stringify(messageObj),
    });

    const response = {
      answer: help,
    };

    res.status(200).json(response);
  } catch (err) {
    console.log('Error during ai help request: ', { error: err.message });
    return res.status(500).json({ message: 'An error occurred while fetching the help using AI.' });
  }
};

// function which makes a call to openai API to get the relevant hint for the student solution
const getRelevantHint = async function (req, res) {
  try {
    // is empty at the moment
    // const data = req.body;
    const userId = req.user.id;
    const { courseId, projectId } = req.params;

    // to do: param validation

    // get all changable user files
    const userCodeContent = await projectSrv.getAllChangeableUserFiles(userId, courseId, projectId);
    // get project description, samples solution and static files content
    const projectFiles = await projectSrv.getProjectFiles(projectId);
    // get all hints for the project
    const hintHistory = await chatSrv.getHintChatLinesForProject(userId, projectId);

    // create the data object for the AI service
    const data = {
      userCodeContent: userCodeContent,
      projectFiles: projectFiles,
      hintHistory: hintHistory,
      userId: userId,
      courseId: courseId,
      projectId: projectId,
    };

    const hint = await AiSrv.askForHint(data);

    // if no relevant hint was found > return -1
    if (hint === '-1') {
      hint = parseInt(hint);
    }

    const response = {
      answer: hint,
    };
    res.status(200).json(response);
  } catch (err) {
    console.log('Error during ai hint selection: ', { error: err.message });
    res.status(500).json({ message: 'An error occurred while fetching the relevant hint using AI.' });
  }
};

// function which makes a call to openai API to get an explanation for a compiler message (compilation error)
const getCompilerExplanation = async function (req, res) {
  try {
    const compilationError = req.body.outputArray;
    const userId = req.user.id;
    const { courseId, projectId } = req.params;

    const user = await userSrv.getUserById(userId);
    // if request cames without courseId > userCodeContent isn't available > send back 404
    const userCodeContent = await projectSrv.getAllChangeableUserFiles(userId, courseId, projectId);

    // create the data object for the AI service
    const data = {
      userCodeContent: userCodeContent,
      error: compilationError.join('\n'),
      user: user,
      courseId: courseId,
      projectId: projectId,
    };

    const explanation = await AiSrv.askForCompilerExplanation(data);

    const response = {
      answer: explanation,
      error: compilationError,
    };

    res.status(200).json(response);
  } catch (err) {
    console.log('Error during ai compiler explanation: ', { error: err.message });
    res
      .status(500)
      .json({ message: 'An error occurred while fetching the explanation for the compiler-messages using AI.' });
  }
};

// funciton which makes a call to openai API to get an explanation for the selected code
const getCodeExplanation = async function (req, res) {
  try {
    const { code, selCode } = req.body;
    const userId = req.user.id;
    const { courseId, projectId } = req.params;

    // create the data object for the AI service
    const data = {
      code: code,
      selectedCode: selCode,
      userId: userId,
      courseId: courseId,
      projectId: projectId,
    };

    const explanation = await AiSrv.askForCodeExplanation(data);
    const response = {
      answer: explanation,
    };

    res.status(200).json(response);
  } catch (err) {
    console.log('Error during ai code explanation: ', { error: err.message });
    res.status(500).json({ message: 'An error occurred while fetching the explanation for the code using AI.' });
  }
};

// function which makes a call to openai API to get a code review for users last submission code
const getCodeReview = async function (req, res) {
  try {
    // let _data = req.body;
    const userId = req.user.id;
    const { courseId, projectId } = req.params;

    // get all relevant project code for the code-review (only the static files)
    const staticFiles = await projectSrv.getAllStaticFilesOfProject(projectId);
    const staticFilesContent = staticFiles.map((file) => file.content).join('\n');

    // get the last submission of the user
    const submission = await submissionSrv.getUserSubmissionForProjectInCourse(courseId, projectId, userId);

    // check if the user has a submission and if the student submitted a correct solution
    if (submission.testResult === 0 || submission.hasCodeReview) {
      return res.status(403).json({ message: 'Not allowed to do Code-Review!' });
    }
    const submissionCode = JSON.parse(submission.dataValues.userFilesDump);
    // filter all files which are not static and no folders > only user code
    const filteredFiles = submissionCode.filter((file) => !file.isStatic && !file.isFolder);

    // we have to mark the submission as code reviewed
    await submissionSrv.updateUserSubmissionForProjectInCourse(courseId, projectId, userId, {
      hasCodeReview: true,
    });

    const data = {
      staticFilesContent: staticFilesContent,
      filteredFiles: filteredFiles,
      userId: userId,
      courseId: courseId,
      projectId: projectId,
    };

    const review = await AiSrv.askForCodeReview(data);

    const response = {
      answer: review,
    };

    res.status(200).json(response);
  } catch (err) {
    console.log('Error during ai code review: ', { error: err.message });
    res.status(500).json({ message: 'An error occurred while reviewing the code using AI.' });
  }
};

// function to get the usage stats of the GPT based helper systems
const getUsageStats = async function (req, res) {
  try {
    const csvStats = await AiSrv.getUsageStats();
    // set headers to force the file download
    res.setHeader('Content-disposition', 'attachment; filename=usage-stats.csv');
    res.set('Content-Type', 'text/csv');
    return res.status(200).send(csvStats);
  } catch (err) {
    console.error('Error fetching AI usage stats: ', { error: err.message });
    res.status(500).json({ message: 'An error occurred while fetching the AI usage stats.' });
  }
};

module.exports = {
  getHelp,
  getRelevantHint,
  getCompilerExplanation,
  getCodeExplanation,
  getCodeReview,
  getUsageStats,
};
