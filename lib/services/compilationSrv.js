/**
 * Service used to compile a project.
 * The primary use of this service is to store the users version.
 * on compilation errors. This data is then used in the context of an students work
 * to evaluate and develop improved automatic assistance.
 *
 * @author Janick Michot
 * @date 08.10.2020
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { CompilationError, User, Project, Course } = require('../models');
const projectSrv = require('./projectSrv');
const mantraSrv = require('./mantraSrv');
const userSrv = require('./userSrv');
const aiSrv = require('./aiSrv');
const bluebird = require('bluebird');
const { postAsync, getAsync } = bluebird.promisifyAll(require('request'));
const config = require('../config/config.js');
const errAndExcHelpSrv = require('../modules/errAndExcHelp/services/errAndExcHelpGenerationSrv');

/**
 * Saves the input together with the corresponding output to the database.
 * This function is called if a compilation error occurs.
 * We store the hidden files to guarantee the user version is exactly as it was when a student submitted
 *
 * @param userId
 * @param projectId
 * @param courseId
 * @param filesInDefaultFormat
 * @param output
 */
const createCompilationError = function (projectId, userId, courseId, filesInDefaultFormat, output) {
  // when old js is cached it may be that the file set is empty
  if (typeof filesInDefaultFormat === 'undefined') {
    const error = new Error('No files in default format!');
    Promise.reject(error);
  }

  // get all non-hidden files (static is ok)
  const userFilesDump = filesInDefaultFormat
    .filter((file) => !file.isFolder && !file.isHidden)
    .map((file) => {
      return { filename: file.path + '/' + file.filename, content: file.content };
    });

  // first we load all the hidden files that belongs to this project
  return projectSrv
    .getAllHiddenFilesOfProject(projectId, false)
    .then(function (hiddenFileSet) {
      // create the user version record
      return CompilationError.create({
        output: JSON.stringify(output),
        userFilesDump: JSON.stringify(userFilesDump),
        hiddenFilesDump: JSON.stringify(hiddenFileSet),
        projectId: projectId,
        userId: userId,
        courseId: courseId,
        responseMessage: '',
      });
    })
    .then(function (userVersion) {
      return userVersion;
    })
    .catch(function (err) {
      console.log('Error while storing user version:' + err);
    });
};

/**
 * This method defines what happens when a compilation error occurs (test-button => action: "compile").
 * At the moment this method is only used for compilations without websocket. So. data.stream = false todo
 *
 * @param aCompilationError
 * @param data
 */
const onCompilationError = async function (aCompilationError, data) {
  if (!aCompilationError.compilationError) return Promise.resolve(aCompilationError);

  const storeCompilation = config.storeCompilationErrors;

  const output =
    typeof aCompilationError.compilationOutputArray !== 'undefined'
      ? aCompilationError.compilationOutputArray
      : aCompilationError.output;

  // construct the payload
  let payload = {
    _data: data,
    _storeCompilation: storeCompilation,
    _output: output,
    _aCompilationError: aCompilationError,
  };

  if (!data.useAIHelp) {
    // if useAIHelp is disabled use default compilation error explanation procedure
    return fallBackExpGeneration(payload);
  } else {
    // if ai help is enabled use gpt to generate response
    try {
      const userLimit = await aiSrv.checkUserReqLimit(data.userId);
      // if the user has reached his request limit for this week fallback to the default behavior
      if (userLimit && userLimit.limitExceeded) {
        return fallBackExpGeneration(payload);
      }

      const aiData = await compilerErrorAI(payload);
      // data.compErrorHelpmessage could be undefined --> due to an error --> fallback
      if (aiData.compErrorHelpMessage) {
        return aiData;
      } else {
        return fallBackExpGeneration(payload);
      }
    } catch (err) {
      console.log(err);
      return fallBackExpGeneration(payload);
    }
  }
};

/**
 * Explains the compilation error using errAndExcHelpSrv
 * @param data
 */
const compilerErrorDefault = function (data) {
  // resolve the promise and return the compilation error. If `storeCompilation` store the compilation error.
  return errAndExcHelpSrv
    .getHelpForCompilationErrors(data._output, data._data.language, data._data.userId, data._data.courseId)
    .then(function (msg) {
      data._aCompilationError.compErrorHelpMessage = msg;
      if (data._storeCompilation) {
        return createCompilationError(
          data._data.projectId,
          data._data.userId,
          data._data.courseId,
          data._data.filesInDefaultFormat,
          data._aCompilationError.output
        ).then((compilationError) => {
          data._aCompilationError.compilationErrorId = compilationError.id;
          return data._aCompilationError;
        });
      } else {
        return data._aCompilationError;
      }
    })
    .catch(function (err) {
      console.log(err);
      return data._aCompilationError;
    });
};

/**
 * Triggers the compilerErrorDefault function (used when AI disabled / AI request throws an error)
 * @param payload
 */
const fallBackExpGeneration = function (payload) {
  return compilerErrorDefault(payload)
    .then((data) => {
      if (data) {
        return data;
      } else {
        console.log('Data is undefined!');
      }
    })
    .catch((err) => {
      console.log('Error fetching compiler error explanation using default procedure: ' + err);
    });
};

/**
 * Explains the compilation error which occurs during testing using GPT
 * @param data
 */
const compilerErrorAI = async function (data) {
  const errorMsg = data._aCompilationError.output;
  const userId = data._data.userId;
  const courseId = data._data.courseId ? data._data.courseId : -1;
  const projectId = data._data.projectId;

  try {
    const user = await userSrv.getUserById(userId);

    const userCodeContent = await projectSrv.getAllChangeableUserFiles(userId, courseId, projectId);
    const dataAI = {
      userCodeContent: userCodeContent,
      error: errorMsg,
      user: user,
      courseId: courseId,
      projectId: projectId,
    };

    const explanation = await aiSrv.askForCompilerExplanation(dataAI, 'compErrExpTest');

    // adjust the data that response from GPT can be displayed in the chatbox (frontend)
    data._aCompilationError.compErrorHelpMessage = explanation;

    return data._aCompilationError;
  } catch (err) {
    console.log(err);
    return fallBackExpGeneration(data);
  }
};

/**
 * Updates a compilationErrorRecord in order to set a rating
 * todo in errAndExcHelpSrv verschieben
 * @param compilationErrorId
 * @param rating
 * @returns {*}
 */
const rateCompilationErrorMessage = function (compilationErrorId, rating) {
  if (!config.storeCompilationErrors) return false;
  return CompilationError.update(
    {
      rating: rating,
    },
    {
      where: { id: compilationErrorId },
    }
  );
};

/**
 * Compile project by calling the mantra srv.
 * This function should not change the compile result.
 * Additional functions are or can be implemented here.
 * @param data
 */
const compile = function (data) {
  return mantraSrv.compile(data).then(function (compResult) {
    // this condition is only true for tests (test-button) with compilation errors
    if (compResult.compilationError && data.stream === false) {
      return onCompilationError(compResult, data).catch(function (err) {
        console.log(err);
      });
    }
    return compResult;
  });
};

module.exports = {
  compile,
  rateCompilationErrorMessage,
};
