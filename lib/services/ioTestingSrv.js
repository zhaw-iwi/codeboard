/**
 * This is our custom service for doing input-output tests.
 * todo rename to testingSrv.js and remove file with the same name
 * @author Janick Michot
 */
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request')); // use bluebird promises for requests
const mantraSrv = require('../services/mantraSrv');
const compilationSrv = require('./compilationSrv');
const languageSrv = require('./languageSrv');

/**
 * Output Test Strict
 * Compares whether the expected and actual output EXACTLY match (Character by Character).
 * @param output
 * @param expectedOutput
 * @returns {boolean}
 */
let checkOutputStrict = function (output, expectedOutput) {
  return output == expectedOutput;
};

/**
 * Output Test Flexible
 * Compares whether the expected and actual output match while IGNORING whitespace, case, and special character difference.
 * @param output
 * @param expectedOutput
 * @returns {boolean}
 */
let checkOutputFlexible = function (output, expectedOutput) {
  // remove special chars and spaces from both actual and expected output
  output = output.replace(/[\\$'"]/g, '\\$&').replace(/\s/g, '');
  expectedOutput = expectedOutput.replace(/[\\$'"]/g, '\\$&').replace(/\s/g, '');

  return output === expectedOutput;
};

/**
 * Output Test Regex
 * Check output using Regular Expressions to match against the student's output.
 * @param output
 * @param regex
 * @param maxOutputLength
 * @returns {boolean}
 */
let checkOutputRegex = function (output, regex, maxOutputLength = 2000) {
  // we try to prevent "Maximum call stack size exceeded" by
  // limiting the output size to 2000 characters
  if (output.length > maxOutputLength) {
    console.log(
      `Output ${output.length} exceeds max output length of ${maxOutputLength} and will therefore not be checked with regex`
    );
    return false;
  }

  // todo prevent maximum call stack size exceeded

  // check if regex is valid
  let isRegexValid = true;
  try {
    regex = new RegExp(regex);
  } catch (e) {
    isRegexValid = false;
    console.log(`Regex is not valid: ${regex}`);
  }

  return isRegexValid && regex.test(output);
};

/**
 * Escapes a string from all three types of line breaks
 * @param string
 * @param replaceWith
 * @returns {*}
 */
let escapeFromLineBreaks = function (string, replaceWith = ' ') {
  return string.replace(/(\r\n|\n|\r)/gm, replaceWith).trim();
};

/**
 * Converts a string with linebreaks to an array
 * This functions uses our string escape function in order to catch all types of line breaks
 * @param string
 * @returns {*}
 */
let stringWithLineBreaksToArray = function (string) {
  string = escapeFromLineBreaks(string, '|');
  return string.split('|');
};

/**
 * Converts an array to a string with linebreaks
 * If array is empty, this functions returns a string contains a single linebreak
 * @param array
 * @param lineBreak
 * @returns {string}
 */
let arrayToStringWithLineBreaks = function (array, lineBreak = '\n') {
  return Array.isArray(array) ? array.join(lineBreak) + lineBreak : lineBreak;
};

/**
 * todo separate functions erstellen für die Behandlung von Arrays:
 *  case 'arrayLineByLineStrict':    = jeder Wert aus dem Array muss 1 zu 1 stimmen
 *  case 'arrayLineByLineFlexible':  = jeder Wert aus dem Array muss flex stimmen
 *  case 'arrayLineByLineRegex':     = jeder Wert muss dem entsprechenden Regex entsprechen
 *  case 'arrayStrict':              = Array muss strikt Werte enthalten, wo im Array egal
 *  case 'arrayFlexible':            = Array muss flex Werte enthalten, wo im Array egal
 *  case 'arrayRegex':               = Array muss Werte enthalten, die regex erfüllen, wo egal
 */
let ioMatching = function (actualOutput, ioTests) {
  // test-loop for each output defined
  for (let i = 0; i < ioTests.length; i++) {
    // get the test
    let testCase = ioTests[i],
      isOutputMatching;

    // escape from line breaks
    actualOutput = escapeFromLineBreaks(actualOutput);

    switch (testCase.type) {
      case 'strict':
        isOutputMatching = checkOutputStrict(actualOutput, testCase.matching);
        break;
      case 'flexible':
        isOutputMatching = checkOutputFlexible(actualOutput, testCase.matching);
        break;
      case 'regex':
        isOutputMatching = checkOutputRegex(actualOutput, testCase.matching);
        break;
    }

    if (isOutputMatching) {
      return testCase;
    }
  }

  return false; // no hit
};

/**
 * This method handles a single input output test.
 * @param data
 */
let ioTestSingle = function (data) {
  // store input
  let input = data.testData.input;

  // get the test data
  let testData = data.testData;

  // the new Mantra needs to know that we don't want a WS stream
  data.stream = false;

  // set data.action to run
  data.action = data.language !== 'Java' ? 'compile' : 'run';

  // we need input as an array
  data.input = typeof data.input === 'string' ? stringWithLineBreaksToArray(input) : input;

  // run code and call io function. Return the result
  return mantraSrv
    .executeCommand(data)
    .then(function (executionResult) {
      testData.id = executionResult.id; // keep previous execution id
      testData.output = executionResult.output;
      testData.result = ioMatching(executionResult.output, testData.tests);

      if (testData.result) {
        testData.status = testData.result.pass ? 'success' : 'fail';
      } else {
        testData.status = 'ignored';
      }
      return testData;
    })
    .catch(function (err) {
      console.log(err);
    });
};

/**
 * Input Output Matching (not tested yet -> use ioTestSingle)
 * @param data {object} contains the files and a property "language"
 * @returns {*|Promise} a bluebird promise
 */
let ioTestArray = function (data = []) {
  // get the test data
  let testData = data.testData;

  // the new Mantra needs to know that we don't want a WS stream
  data.stream = false;

  // set data.action to run
  data.action = data.language !== 'Java' ? 'compile' : 'run';

  // do io-test asynchronously one after another
  return testData
    .reduce((promiseChain, test) => {
      // Note, Promise.resolve() resolve is our initial value
      return promiseChain.then(function () {
        // set input for this run
        data.input =
          typeof data.input === 'string' ? stringWithLineBreaksToArray(data.testData.input) : data.testData.input;

        // run code and call io function. Return the result
        return mantraSrv.executeCommand(data).then(function (executionResult) {
          test.id = executionResult.id; // keep previous execution id
          test.result = ioMatching(executionResult.output, test.tests, test.input);
          test.output = executionResult.output;
          test.status = test.result.pass ? 'success' : 'fail';
          return test;
        });
      });
    }, Promise.resolve())
    .then(function () {
      return testData;
    });
};

/**
 *
 * @param data
 * @returns {Promise}
 */
let compileTest = function (data) {
  // get the test data
  let testData = data.testData;

  // the new Mantra needs to know that we don't want a WS stream
  data.stream = false;

  let filesInDefaultFormat = data.filesInDefaultFormat;
  delete data.filesInDefaultFormat;

  // set data.action to run in order to get compilation errors
  data.action = 'compile';

  return mantraSrv
    .compile(data)
    .then(function (compResult) {
      testData.output = compResult.output;
      testData.id = compResult.id;
      testData.status = 'success';

      if (compResult.compilationError) {
        testData.status = 'fail';
        testData.outputArray =
          data.language === 'Java' ? compilationOutputSeparation(compResult.output) : [testData.output];
        testData.numErrors = javaCompilationOutputGetNumErrors(compResult.output);

        // store the compilation errors to the db
        return compilationSrv
          .onCompilationError(
            data.projectId,
            data.userId,
            data.courseId,
            filesInDefaultFormat,
            compResult.output,
            compilationOutputSeparation(compResult.output)
          )
          .then(function (compilationError) {
            // add compilationErrorId in order to make message rating
            if (compilationError) {
              testData.compilationErrorId = compilationError.id;
            }

            // todo delete/replace the old regex testing
            // do the compilation tests
            if (testData.compTests.tests.length > 0) {
              testData.compTests.tests.forEach(function (test) {
                // check with regex on basis of a segment
                for (let i = 0; i < testData.outputArray.length; i++) {
                  if (checkOutputRegex(escapeFromLineBreaks(testData.outputArray[i]), test.error)) {
                    testData.result.push(test);
                    return testData;
                  }
                }
              });
            }
          });
      } else {
        return testData;
      }
    })
    .catch(function (error) {
      console.log(error);
    });
};

/**
 * NOTE: Für Unit-Tests wurde bislang Kali verwendet. Um Unit-Tests verwenden zu können, muss Kali
 * in Mantra implementiert werden.
 */
let unitTest = function () {
  // silence is gold
};

/**
 * This method loads all tests. To do so, the configuration file is read and
 * the programming language is taken into account.
 *
 * NOTE: must return an object (array not allowed!?)
 */
let getTests = function (data) {
  let testSet = [];
  let configFile = data.files.find((file) => file.filename === 'Root/codeboard.json');
  let codeboardConfig = {};

  try {
    codeboardConfig = JSON.parse(configFile.content);
  } catch (e) {
    return false;
  }

  // check if codeboard.json contains testing
  if (!codeboardConfig.Testing) return false;

  // read test data
  let testing = codeboardConfig.Testing;

  // prepare ioTests (received from codeboard.json) settings
  if (testing.ioTests.length > 0) {
    testing.ioTests.forEach(function (ioTest) {
      testSet.push(
        Object.assign(
          {
            name: '',
            method: 'ioTest',
            status: 'pending', // fail | success
            input: '\n',
            tests: [],
            result: {},
            output: '',
            stopOnFailure: false,
            id: '',
          },
          ioTest
        )
      );
    });
  }
  return testSet;
};

/**
 * This method loops trough a set of tests. For each test mantra is called and students code
 * is checked with a given input.
 *
 * @param data  the execution data
 * @param testSet  the set of tests
 * @param lastCompilationId  the id of the last compilation. This id is required to test non dynamic languages.
 * @returns {*}
 */
let ioTesting = function (data, testSet, lastCompilationId = 0) {
  if (languageSrv.isDynamicLanguage(data.language) && lastCompilationId === 0) {
    const error = new Error('Error reading the tests!');
    Promise.reject(error);
  }

  // do io-test asynchronously one after another
  let i = 0;
  let appropriateTests = [];
  return testSet
    .reduce((promiseChain, test) => {
      // Note, Promise.resolve() resolve is our initial value
      return promiseChain.then(function (id) {
        // dont make any further tests after `stopOnFailure`
        if (i > 0 && id === 0) {
          test.status = 'unreachable';
          appropriateTests[i] = test;
          i++;
          return 0;
        }

        // set compilation/run id from last call
        test.id = data.id = id;

        // set testData for this run
        data.testData = test;

        // switch testMethod and call corresponding function

        switch (test.method) {
          case 'ioTest':
            return ioTestSingle(data).then(function (testResult) {
              appropriateTests[i] = testResult;
              i++;
              return testResult.stopOnFailure && testResult.status === 'fail' ? 0 : testResult.id;
            });

          case 'unitTest':
            return null;

          // todo define more tests

          default:
            return Promise.resolve();
        }
      });
    }, Promise.resolve(lastCompilationId))
    .then(function () {
      // return all tests
      return appropriateTests;
    })
    .catch(function (error) {
      console.log(error);
    });
};

/**
 * Method that is used to io-test a dynamic language.
 * @param data
 * @param testSet
 * @returns {*}
 */
let ioTestingForDynamicLanguages = function (data, testSet) {
  return ioTesting(data, testSet).then(function (testResult) {
    return {
      testing: testResult,
    };
  });
};

/**
 * Method that is used to io-test a non dynamic language.
 * Non dynamic languages has to be compiled first.
 * @param data
 * @param testSet
 * @returns {*}
 */
let ioTestingForNonDynamicLanguage = function (data, testSet) {
  // enable compilation error assistance
  data.useCompErrorHelp = true; // todo maybe als parameter übergeben

  // we dont need a stream
  data.stream = false;

  // the first action we are doing here is compilation
  data.action = 'compile';

  return compilationSrv.compile(data).then(function (compResult) {
    if (!compResult.compilationError) {
      return ioTesting(data, testSet, compResult.id).then(function (testResult) {
        return {
          compilation: compResult,
          ioTests: testResult,
        };
      });
    } else {
      return Promise.resolve({
        compilation: compResult,
        ioTests: testSet,
      });
    }
  });
};

/**
 * Performs all tests one after the other.
 * This method is used to check a students solution before submitting.
 * @param data
 * @returns {*}
 */
let testProjectForSubmission = function (data) {
  // load all tests
  let testSet = getTests(data);

  // reject promise when something went wrong
  if (!testSet) {
    const error = new Error('Error reading the tests!');
    return Promise.reject(error);
  }

  if (languageSrv.isDynamicLanguage(data.language)) {
    return ioTestingForDynamicLanguages(data, testSet);
  } else {
    return ioTestingForNonDynamicLanguage(data, testSet);
  }
};

module.exports = {
  ioTestSingle,
  compileTest,
  unitTest,
  getTests,
  testProjectForSubmission,
};
