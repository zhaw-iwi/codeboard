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
const AiSrv = require('./AISrv.js');
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
let createCompilationError = function(projectId, userId, courseId, filesInDefaultFormat, output) {

    // when old js is cached it may be that the file set is empty
    if(typeof filesInDefaultFormat === "undefined") {
        Promise.reject("Files not found");
    }

    // get all non-hidden files (static is ok)
    const userFilesDump = filesInDefaultFormat.filter(file => !file.isFolder && !file.isHidden).map(file => {
        return { filename: file.path + '/' + file.filename, content: file.content };
    });

    // first we load all the hidden files that belongs to this project
    return projectSrv.getAllHiddenFilesOfProject(projectId, false)
        .then(function (hiddenFileSet) {
            // create the user version record
            return CompilationError.create( {
                output: JSON.stringify(output),
                userFilesDump: JSON.stringify(userFilesDump),
                hiddenFilesDump: JSON.stringify(hiddenFileSet),
                projectId: projectId,
                userId: userId,
                courseId: courseId,
                responseMessage: ""
            });
        })
        .then(function(userVersion) {
            return(userVersion);
        })
        .catch(function(err) {
            console.log("Error while storing user version:" + err);
        });
};


/**
 * This method defines what happens when a compilation error occurs (test-button => action: "compile").
 * At the moment this method is only used for compilations without websocket. So. data.stream = false todo
 *
 * @param aCompilationError
 * @param data
 */
let onCompilationError = function(aCompilationError, data) {
    if(!aCompilationError.compilationError) return Promise.resolve(aCompilationError);

    const storeCompilation = config.storeCompilationErrors;

    const output = (typeof aCompilationError.compilationOutputArray !== "undefined") ? aCompilationError.compilationOutputArray : aCompilationError.output;

    // construct the payload
    let payload = {
        _data: data,
        _storeCompilation: storeCompilation,
        _output: output,
        _aCompilationError: aCompilationError
    }

    // if useAIHelp is disabled use default compilation error explanation procedure else use GPT to generate the explanations
    if (!data.useAIHelp) {
        return fallBackExpGeneration(payload);
    } else {
        return compilerErrorAI(payload).catch((err) => {
            console.log(err);
        })
    }
};

/**
 * Explains the compilation error using errAndExcHelpSrv
 * @param data
 */
let compilerErrorDefault = function(data) {
    // resolve the promise and return the compilation error. If `storeCompilation` store the compilation error.
    return errAndExcHelpSrv.getHelpForCompilationErrors(data._output, data._data.language, data._data.userId, data._data.courseId,)
    .then(function(msg) {
        data._aCompilationError.compErrorHelpMessage = msg;
        if (data._storeCompilation) {
            return createCompilationError(data._data.projectId, data._data.userId, data._data.courseId, data._data.filesInDefaultFormat, data._aCompilationError.output)
                .then(compilationError => {
                    data._aCompilationError.compilationErrorId =  compilationError.id;
                    return data._aCompilationError;
                });
        } else {
            return data._aCompilationError;
        }
    }).catch(function(err) {
        console.log(err);
        return data._aCompilationError;
    });
}

/**
 * Triggers the compilerErrorDefault function (used when AI disabled / AI request throws an error)
 * @param payload
 */
let fallBackExpGeneration = function(payload) {
    return compilerErrorDefault(payload).then((data) => {
        if (data) {
            return data;
        } else {
            console.log("Data is undefined!");
        }
    }).catch((err) => {
        console.log("Error fetching compiler error explanation using default procedure: " + err);
    })
}

/**
 * Explains the compilation error which occurs during testing using GPT
 * @param data
 */
let compilerErrorAI = async function(data) {
    let _errorMsg = data._aCompilationError.output;
    let _userId = data._data.userId;
    try {
        let user = await userSrv.getUserById(_userId);

        let userCodeContent = await projectSrv.getAllChangeableUserFiles(
            _userId,
            data._data.courseId,
            data._data.projectId
        );

        const prompt = `
            <error message>
            ${_errorMsg}
            </error message>

            <username>
            ${user.name}
            </username>

            <student code>
            ${userCodeContent}
            </student code>

            You are an AI-Assistant who explains compilation errors in Java in a maximum of 3 sentences in German. You can address the students with the given username.\
            Please always mention in which class the error occurs. You can also provide hints on how to solve the error.\
            If there are multiple compilation errors please only explain 1 or 2 of them (due to consequential errors).
            `;

        const messages = [{ role: "system", content: prompt }];
    
        const openAIResponse = await AiSrv.askForHelp(messages);

        // adjust the data that response from GPT can be displayed in the chatbox (frontend)
        data._aCompilationError.compErrorHelpMessage = openAIResponse;

        return data._aCompilationError;
    } catch (err) {
        console.log(err);
        fallBackExpGeneration(data);
    }
}

/**
 * Updates a compilationErrorRecord in order to set a rating
 * todo in errAndExcHelpSrv verschieben
 * @param compilationErrorId
 * @param rating
 * @returns {*}
 */
let rateCompilationErrorMessage = function(compilationErrorId, rating) {
    if(!config.storeCompilationErrors) return false;
    return CompilationError.update({
        rating: rating
    }, {
        where: { id: compilationErrorId}
    });
};


/**
 * Compile project by calling the mantra srv.
 * This function should not change the compile result.
 * Additional functions are or can be implemented here.
 * @param data
 */
let compile = function(data) {
    return mantraSrv.compile(data)
        .then(function(compResult) {
            // this condition is only true for tests (test-button) with compilation errors
            if (compResult.compilationError && data.stream === false) {
                return onCompilationError(compResult, data)
                    .catch(function(err) {
                        console.log(err);
                    });
            }
            return compResult;
        });
};


exports.compile = compile;
exports.rateCompilationErrorMessage = rateCompilationErrorMessage;

