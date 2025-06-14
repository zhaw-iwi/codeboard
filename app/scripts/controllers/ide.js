'use strict';

var app = angular.module('codeboardApp');

app.controller('IdeCtrl', [
  '$scope',
  '$rootScope',
  '$log',
  '$sce',
  '$location',
  '$routeParams',
  '$window',
  '$http',
  '$timeout',
  '$uibModal',
  'ProjectFactory',
  'projectData',
  'ltiData',
  'IdeMsgService',
  'UserSrv',
  'WebsocketSrv',
  'ChatSrv',
  'CodeboardSrv',
  'AISrv',
  function (
    $scope,
    $rootScope,
    $log,
    $sce,
    $location,
    $routeParams,
    $window,
    $http,
    $timeout,
    $uibModal,
    ProjectFactory,
    projectData, // injected from app.js
    ltiData,
    IdeMsgService,
    UserSrv,
    WebsocketSrv,
    ChatSrv,
    CodeboardSrv,
    AISrv
  ) {
    // First we handle all data that was injected as part of the app.js resolve.
    // set the project data in the ProjectFactory (files, description, etc.)
    ProjectFactory.setProjectFromJSONdata(projectData, ltiData);

    // store name of pressed Button
    $scope.pressedButton = '';
    // state if loading gif should be displayed (compileAndRun project)
    $scope.compilationIsLoading = false;

    $scope.reqLimitReached = false;

    // this function is called from the tabs when the req limit is reached
    $scope.setRequestLimitReached = function () {
      return ($scope.reqLimitReached = true);
    };

    // this function is used to check if the request limit is reached
    $scope.isRequestLimitReached = function () {
      return $scope.reqLimitReached;
    };

    // check on page load if the user has reached the request limit
    $scope.checkRemainingAIRequests = async function () {
      if ($scope.currentRoleIsUser()) {
        try {
          const limit = await AISrv.getRemainingRequests(UserSrv.getUsername());
          // check if the user has reached the request limit
          if (limit && limit.remainingReq === 0) {
            // indicate that the request limit is reached
            $scope.reqLimitReached = true;
          }
        } catch (err) {
          console.log('Error while checking request limit: ', err);
          // for security reasons we also indicate that the request limit is reached
          $scope.reqLimitReached = true;
        }
      }
    };

    /**
     * Contains functions and events to save the project automatically
     * Triggers msgProcessViewQueryStringRequest to open the correct files according to the passed query
     */
    let initProject = function () {
      // we need to request that the URI is check for any "?view=..." query string
      // in order to display some files in the ace editor
      $rootScope.$broadcast(IdeMsgService.msgProcessViewQueryStringRequest().msg);

      // this function is called when closing or reloading the browser window
      $window.onbeforeunload = function (event) {
        let message = 'You currently have unsaved changes.';

        // make sure we saved the content currently displayed before deciding if there are unsaved changes
        saveCurrentlyDisplayedContent();

        if (event && ProjectFactory.isProjectModified()) {
          event.returnValue = message;
          return message;
        } else {
          // returning a void values prevents the popup to be shown
          return null;
        }
      };

      // this function is called when the user clicks on some UI element (e.g. button) that changes the location
      $scope.$on('$locationChangeStart', function (event) {
        // make sure we saved the content currently displayed before deciding if there are unsaved changes
        saveCurrentlyDisplayedContent();

        // if the user has unsaved changes, show the message
        if (ProjectFactory.isProjectModified()) {
          let message = 'You currently have unsaved changes.\n\nAre you sure you want to leave this page?';

          let answer = confirm(message);
          if (!answer) {
            event.preventDefault();
          } else {
            $scope.ace.editor.destroy();

            // clear interval used to auto save project when leaving the ide
            clearInterval(interval);
          }
        }
      });
    };

    // if the project Url has a query string with a "view" parameter, we use that information
    // to open some files in the editor
    // Example: ?view=2.1-1.0 would open the files with nodeId 2 and nodeId 1 and make file 2 the active one
    // The general format is: ?view=nodeId.active-nodeId.active-nodeId.active-...
    var processViewQueryString = function processViewQueryString() {
      // check for the "view" query string
      if ($routeParams.view) {
        $log.debug('idejs.processViewQueryString: Found a "view" query string in the URL: ' + $routeParams.view);

        // Array containing objects where each object defines the settings for a particualr file
        var viewSettings = [];

        // split the "view" query string on all "-" characters
        var queryStringElements = $routeParams.view.split('-');

        for (var i = 0; i < queryStringElements.length; i++) {
          // split the element at the "dot" to get the nodeId and the active setting
          var details = queryStringElements[i].split('.');

          // we expect that a details has 2 numbers (check via isNaN)
          if (!(details.length == 2 && isNaN(details[0]) && isNaN(details[1]))) {
            var nodeId = parseInt(details[0]);
            var nodeActive = parseInt(details[1]);

            // check that the nodeId actually exists in the project and that it's not representing a folder
            if (ProjectFactory.hasNode(nodeId) && !ProjectFactory.getNode(nodeId).isFolder) {
              var viewSetting = {
                nodeId: nodeId,
                nodeActive: nodeActive,
              };

              // store the view setting for the current file
              viewSettings.push(viewSetting);
            }
          }
        }

        // open all the files based on their nodeId
        for (var i = 0; i < viewSettings.length; i++) {
          var req = IdeMsgService.msgDisplayFileRequest(viewSettings[i].nodeId);
          $rootScope.$broadcast(req.msg, req.data);
        }

        // now that all files have been opened in the right order, we figure out which file should be the active one
        for (var i = 0; i < viewSettings.length; i++) {
          if (viewSettings[i].nodeActive) {
            var req = IdeMsgService.msgDisplayFileRequest(viewSettings[i].nodeId);
            $rootScope.$broadcast(req.msg, req.data);
          }
        }
      }
    };

    /**
     * if the project Url has a query string with a "collapseTree" parameter, we use that information to collapse
     * tree view or not
     *
     * @author Janick Michot
     */
    let processCollapsedQuery = function () {
      $scope.collapseTree = true;
      // check for the "view" query string
      if ($routeParams.collapseTree) {
        $scope.collapseTree = $routeParams.collapseTree;
      }
    };

    /**
     * Sets the output.
     * @param outputToDisplay the value to display in the output
     */
    let setOutput = function (outputToDisplay) {
      $scope.output = $sce.trustAsHtml(outputToDisplay);
      $scope.htmlOutput = '';
    };

    // the output in the console of the ide
    setOutput('This will display the output.', false);

    /**
     * Adds the given aOutputToAdd to the existing output
     * @param aOutputToAdd the value to add to the output
     * @return {number} the number of characters displayed in the output
     */
    let addToOutput = function (aOutputToAdd) {
      $scope.$apply(function () {
        let output = $scope.output + aOutputToAdd;
        $scope.output = $sce.trustAsHtml(output);
      });

      // if there is an htmlOutput, we need to unwrap it before we can count it's length.
      return $scope.output.length;
    };

    /**
     * Calling this function will trigger a saving of the content that's currently
     * displayed in the editor. This should e.g. be done before compiling or
     * submitting a solution.
     */
    let saveCurrentlyDisplayedContent = function (saveProjectToServer = false) {
      // if the editor is currently displaying a file, we need to store the content first
      if ($scope.ace.currentNodeId !== -1) {
        // if the value is !== -1, then some tab is open
        ProjectFactory.getNode($scope.ace.currentNodeId).content = $scope.ace.editor.getSession().getValue();
      }

      // send the entire project to the server
      if (saveProjectToServer) {
        ProjectFactory.saveProjectToServer().then(
          function (result) {
            console.log('Project saved');
          },
          function (err) {
            console.log('Save project failed');
          }
        );
      }
    };

    /**
     * Function that handles the displaying of a Mantra WebSocket output.
     * @param {string} aStreamUrl - the WS Url to connect to the Mantra container
     * @param {string} aStartUrl - the Url to start the Mantra container
     * @param onMessageReceived
     * @param onConnectionClosed
     */
    var displayWSOutputStream = function (aStreamUrl, aStartUrl, onMessageReceived = null, onConnectionClosed = null) {
      // counter for the number of messages added to the output (1 on every WS send event)
      var numOfMessages = 0;
      // max number of messages we allow
      var maxNumOfMessageCharacters = 200;

      // clear the output
      setOutput('');

      var onWSOpenCallback = function () {
        $http.get(aStartUrl).then(
          function (success) {
            $log.debug('websocketSrvjs.onOpen: container successfully started');

            if (ideState.actionAllowsForStopping) {
              // send out a msg that now a container is running that could be stopped (e.g. by the user)
              $rootScope.$broadcast(IdeMsgService.msgStoppableActionAvailable().msg);
            }
          },
          function (errorResponse) {
            $log.debug('websocketSrvjs.onOpen: problem starting container.');
            $log.debug(errorResponse);
          }
        );
      };

      // todo only works for compileAndRun
      let compilationError = true;

      // Function to handle the event of the WS receiving data
      var onWSDataHandler = function (aNewlyReceivedData) {
        if (onMessageReceived) {
          onMessageReceived(aNewlyReceivedData);
        }

        // check for compilation errors and dont print the successful compilation message
        if (aNewlyReceivedData.replace(/(?:\r\n|\r|\n)/g, '') === 'Compilation successful') {
          compilationError = false;
          return;
        }

        // replace line breaks with <br> and allow html
        aNewlyReceivedData = aNewlyReceivedData.replace(/(?:\r\n|\r|\n)/g, '<br>');
        var outputLength = addToOutput(aNewlyReceivedData);

        // account for the number of messages
        numOfMessages += 1;
        //if(numOfMessages > maxNumOfMessages) {
        if (outputLength > maxNumOfMessageCharacters) {
          addToOutput(
            '\n\nYour program output has more than ' +
              maxNumOfMessageCharacters +
              " characters. That's quite a lot.\n" +
              'For this reason, Codeboard has terminated your program.\n\n'
          );

          WebsocketSrv.close(true);
        }
      };

      // Function to handle the event of the WS closing
      var onWSCloseCallback = function () {
        // if no message was added via WS, we set a message that the action completed
        if (numOfMessages === 0) {
          // todo addToOutput('--Session ended without output.--', false);
          console.log('--Session ended without output.--');
        }

        // set focus back to the editor
        $scope.ace.editor.focus();

        // we no longer have a stoppableAction
        // send out a msg stoppableActionGone
        // that could trigger that the stop button disappears
        $rootScope.$broadcast(IdeMsgService.msgStoppableActionGone().msg);

        setEnabledActions(1, 1, 1, 1, 1);

        if (onMessageReceived) {
          onConnectionClosed(compilationError);
        }
      };

      // TODO stopAction: make a callback function or onOpen which makes the http startUrl call
      // the startUrl call should return the stopUrl
      // we could then broadcast a msg: stoppableActionAvailable
      // with that message, the stopBtn appears
      //

      WebsocketSrv.connect(aStreamUrl, onWSOpenCallback, onWSDataHandler, onWSCloseCallback);
    };

    // check if Websockets are supported; if not, show a warning message
    if ('WebSocket' in window && (typeof WebSocket === 'function' || typeof WebSocket === 'object')) {
      $log.debug('Info: Browser supports WebSockets');
    } else {
      setOutput(
        'Warning: your browser does not support WebSockets.\n' +
          'This may cause Codeboard to not work properly.\n' +
          'Please consider updating to a newer browser.'
      );
    }

    /**
     * Function that executes a compilation of the current project.
     * @param runCleanCompile if true, a clean-compilation will be requested
     */
    var compileProject = function (runCleanCompile) {
      // make sure we saved the content before compiling
      saveCurrentlyDisplayedContent(true);

      // remove previous compilation results
      setOutput('Waiting for (previous) results...', false);

      // disable all actions till the compile request is completed
      setEnabledActions(0, 0, 0, 0, 0);

      // the factory makes the call to the server, returns a promise
      var promise = ProjectFactory.compileProject(runCleanCompile);

      // handler for when the promise is resolved
      promise.then(
        function (data) {
          // note: we only get the data because the resolution to 'then' indicates that the call was successful; thus no header information

          //
          ideState.stopUrl = data.stopUrl;

          // the success case gives us a url to the Mantra WebSocket and a url how to start the container
          displayWSOutputStream(data.streamUrl, data.startUrl);
        },
        function (reason) {
          // the error callback
          $log.debug('Error while trying to run your program. The server responded:\n' + reason);

          setOutput('Error while trying to run your program. The server responded:\n' + reason, false);

          // disable the action to send another compile request
          setEnabledActions(1, 0, 0, 1, 0);

          // make sure all listeners know that there's no stoppable action available
          $rootScope.$broadcast(IdeMsgService.msgStoppableActionGone().msg);
        }
      );
    };

    /**
     * Function that executes a "run" of the current project.
     */
    let runProject = function () {
      // remove previous output message
      setOutput('Waiting for results...', false);

      // disable all actions while we wait for the request to complete
      setEnabledActions(0, 0, 0, 0, 0);

      ProjectFactory.runProject().then(
        function (data) {
          // note: we only get the data because the resolution to 'then' indicates that the call was successful; thus no header information
          // set the Url on how to stop the current run-action
          ideState.stopUrl = data.stopUrl;

          // the success case gives us a url to the Mantra WebSocket and a url how to start the container
          displayWSOutputStream(data.streamUrl, data.startUrl);
        },
        function (reason) {
          // the error callback
          $log.debug('Error when trying to run your program. The server responded:\n' + reason);

          // display the error to the user
          setOutput('Error when trying to run your program. The server responded:\n' + reason, false);

          // something went wrong while trying to run the program (maybe it was deleted?)
          // so we only allow the user to compile
          setEnabledActions(1, 0, 0, 1, 0);

          // make sure all listeners know that there's no stoppable action available
          $rootScope.$broadcast(IdeMsgService.msgStoppableActionGone().msg);
        }
      );

      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    };

    /**
     * Function that executes a "compileAndRun" of the current project.
     * This functions combines both compilation and execution of a project.
     * @author Janick Michot
     */
    let compileAndRunProject = function (runCleanCompile) {
      // get disabled & enabled actions
      let disabledActions = CodeboardSrv.getDisabledActions();
      let enabledActions = CodeboardSrv.getEnabledActions();

      // make sure we save the current content before submitting
      saveCurrentlyDisplayedContent(true);

      // remove previous compilation results
      setOutput('Waiting for (previous) results...', false);

      // disable all actions till the compile request is completed
      setEnabledActions(0, 0, 0, 0, 0);

      ProjectFactory.compileAndRunProject(runCleanCompile)
        .then(function (data) {
          ideState.stopUrl = data.stopUrl;

          let outputArray = [];
          let onMessageReceived = function (aNewlyReceivedData) {
            outputArray.push(aNewlyReceivedData);
          };
          let onConnectionClosed = function (compilationError) {
            if (compilationError && outputArray.length > 0) {
              // only broadcast an event that compiler tab should be opened when the functionality is enabled
              if (!disabledActions.includes('compiler') || enabledActions.includes('compiler')) {
                // the current displayed chatbox (if available) should be removed because new compilation is started
                let reqRmvChat = IdeMsgService.msgRemoveChatLine('error');
                $rootScope.$broadcast(reqRmvChat.msg, reqRmvChat.data);

                // broadcast an event that the compiler tab should be opened (only if there is an error during compilation)
                let reqOpenCompilerTab = IdeMsgService.msgNavBarRightOpenTab('compiler');
                $rootScope.$broadcast(reqOpenCompilerTab.msg, reqOpenCompilerTab.data);

                // show loader because request take some time
                $scope.compilationIsLoading = true;

                let payload = ProjectFactory.getPayloadForCompilation();
                payload.compilation = {
                  compilationError: true,
                  output: outputArray.join(),
                  outputArray: outputArray,
                  stream: false,
                };

                // DEFAULT COMPILER ERROR EXPLANATION GENERATION (REGEX)
                // for user with a role other than 'user' we also use the default generation
                // as we don't use AI services for those users
                if (
                  (disabledActions.includes('ai-compiler') && !enabledActions.includes('ai-compiler')) ||
                  !$scope.currentRoleIsUser()
                ) {
                  fallBackExpGeneration(payload);
                } else {
                  // COMPILER ERROR EXPLANATION GENERATION USING AI
                  compilerErrorAI(payload.compilation)
                    .then((res) => {
                      const errorExplanation = res.answer;
                      // if the response contains an answer generated by ai, display the chatbox
                      if (errorExplanation) {
                        displayErrorChatbox(res);

                        // update the view
                        $timeout(function () {});
                      } else {
                        // if no response from request fall back to default generation
                        fallBackExpGeneration(payload);
                      }
                    })
                    .catch((err) => {
                      // case when the request limit is exceeded (429)
                      if (err.status === 429 && err.data.limitExceeded) {
                        return fallBackExpGeneration(payload);
                      }
                      console.log('Error fetching compiler error explanation using AI: ' + err.message);
                      // fall back to default generation
                      fallBackExpGeneration(payload);
                    });
                }
              }
            } else {
              // broadcast event that code was compiled and has no syntax error (remove last displayed compiler error explanation chatbox)
              let reqRmvChat = IdeMsgService.msgRemoveChatLine('noError');
              $rootScope.$broadcast(reqRmvChat.msg, reqRmvChat.data);
            }
          };

          displayWSOutputStream(data.streamUrl, data.startUrl, onMessageReceived, onConnectionClosed);

          // Note: doing the DOM manipulation in the controller is not "the Angular way"
          // However, we would need 2 more directives otherwise (one for enter-click, one for send-button click)
          // About element selection see: http://mlen.io/angular-js/get-element-by-id.html
          var domElem = angular.element(document.querySelector('#idFooterUserInput'));
          if (domElem) {
            domElem.focus();
          }
        })
        .catch(function (reason) {
          // the error callback
          $log.debug('Error when trying to compile and run your program. The server responded:\n' + reason);

          // display the error to the user
          setOutput('Error when trying to compile and run your program. The server responded:\n' + reason, false);

          // something went wrong while trying to run the program (maybe it was deleted?)
          // so we only allow the user to compile
          setEnabledActions(1, 0, 0, 1, 0);

          // make sure all listeners know that there's no stoppable action available
          $rootScope.$broadcast(IdeMsgService.msgStoppableActionGone().msg);
        });
    };

    /**
     * Fall-back function which uses the default compiler error message generation.
     * @author Samuel Truniger
     * @param payload The compiler error message displayed in the console
     */
    let fallBackExpGeneration = function (payload) {
      compilerErrorDefault(payload)
        .then((data) => {
          if (data) {
            displayErrorChatbox(data);
          } else {
            console.log('Data is undefined!');
          }
        })
        .catch((err) => {
          console.log('Error fetching compiler error explanation using default procedure: ' + err);
        });
    };

    /**
     * Function that fetches the compiler error explanation using AI.
     * @author Samuel Truniger
     * @param payload The compiler error message displayed in the console
     */
    let compilerErrorAI = function (payload) {
      return AISrv.askForCompilerExplanation($routeParams.courseId, $routeParams.projectId, payload);
    };

    /**
     * Function that fetches the compiler error explanation using regex (default).
     * @param payload The data needed for generating the explanations
     */
    let compilerErrorDefault = function (payload) {
      return $http
        .post('/api/' + $routeParams.projectId + '/help/compilation', payload)
        .then((res) => {
          return res;
        })
        .catch((err) => {
          console.log(err);
          $log.debug('An error occurred while trying to create help message for compilation error.');
        });
    };

    /**
     * Function that uses the data from the response to generate and display
     * a new compiler error explanation chatbox in the compiler tab.
     * @param data The response from the request (default/AI)
     */
    let displayErrorChatbox = function (data) {
      // hide loader because request is finished
      $scope.compilationIsLoading = false;
      let compilationOutputTxt = '';
      if (typeof data.data !== 'undefined' || typeof data.answer !== 'undefined') {
        // get error message if data.config is available (only in default)
        if (data.config) {
          let compilationResult = data.config.data.compilation.outputArray;
          if (compilationResult) {
            compilationResult.forEach((e) => {
              compilationOutputTxt += e;
            });
          }
        } else if (data.error) {
          let compilationResult = data.error;
          if (compilationResult) {
            compilationResult.forEach((e) => {
              compilationOutputTxt += e;
            });
          }
        }

        // generate a new chatbox (default/AI)
        let chatLineCard = {
          cardHeader: 'Kompilierungsfehler',
          cardBody: data.data || data.answer,
          compilationOutput: compilationOutputTxt,
          cardType: 'compHelp',
        };

        // broadcast event that code was compiled and has an error (makes sure that the new chatbox is displayed in compiler tab)
        let reqAddMsg = IdeMsgService.msgAddHelpMessage(chatLineCard, 'compiler', 'Roby', 'worried');
        $rootScope.$broadcast(reqAddMsg.msg, reqAddMsg.data);
      }
    };

    /**
     * Execute the "tool" action on the current project
     */
    let toolAction = function () {
      // make sure we save the current content before submitting
      saveCurrentlyDisplayedContent(true);

      // update the message in the console
      setOutput('Analyzing your project. This might take a few seconds. Please wait...', false);

      // disable all other actions while we wait for the test to complete
      setEnabledActions(0, 0, 0, 0, 0);

      // test the project
      var promise = ProjectFactory.toolAction();
      promise.then(
        function (data) {
          $log.debug('Tool action successful.');

          if (data.compilationError) {
            // a compilation error occured and thus the tests will not have been run
            // we display the compilation error
            setOutput(
              'Analysis failed. Your program does not compile.\nFix all compilation errors and try again.\n\n--- Details ---\n\n' +
                data.outputCompiler,
              false
            );
          } else {
            // setOutput('Number of passing tests: ' + data.numTestsPassing + '\nNumber of failing tests: ' + data.numTestsFailing + '\n\n--- Details ---\n\n' + data.output, false);
            setOutput(data.output, false);
          }

          // enable all actions except running
          setEnabledActions(1, 0, 1, 1, 1);
        },
        function (reason) {
          $log.debug('Error while running the tool-action on your program. The server responded:\n' + reason);

          setOutput(
            'Error while running the requested action on your program. The server responded:\n' + reason,
            false
          );

          // something went wrong so we only enable compilation and testing again
          setEnabledActions(1, 0, 1, 1, 0);
        }
      );
    };

    /**
     * Submits the current project (e.g. for grading).
     */
    let submitProject = function () {
      // make sure we save the current content before submitting
      saveCurrentlyDisplayedContent(true);

      // update the message in the console
      setOutput('Submitting your solution. This might take a few seconds. Please wait...', false);

      // disable all other actions while we wait for the submission to complete
      setEnabledActions(0, 0, 0, 0, 0);

      /**
       * Submit Modal Instance used to show submission result, back to course link etc.
       * @type {*[]}
       */
      let submitModalInstanceCtrl = [
        '$rootScope',
        '$scope',
        '$uibModalInstance',
        '$http',
        '$timeout',
        'UITexts',
        function ($rootScope, $scope, $uibModalInstance, $http, $timeout, UITexts) {
          // init scope variables
          $scope.numTestsFailed = $scope.numTestsPassed = $scope.numTests = 0;
          $scope.score = 0;
          $scope.progress = 0;
          $scope.passRate = 1;
          $scope.passed = false;
          $scope.hasResult = false;
          $scope.submissionIsLoading = true;
          $scope.codeReview = null;
          // controls when the review component must be shown (only after successful submission)
          $scope.showReviewComponent = false;
          $scope.reviewIsLoading = false;

          // default texts
          $scope.title = 'Deine Lösung wird überprüft';
          $scope.textAfterResult =
            'Vor der Abgabe teste ich ein letztes Mal dein Programm. Für jeden bestandenen Test gibt es Punkte. Ich bin gleich so weit.';
          $scope.avatar = '../../../images/avatars/Avatar_RobyCoder_RZ_neutral_2020.svg';

          /**
           * Defines what to do when no tests passed
           * For a non-dynamic programming language, no passed tests mean that the compilation failed.
           * todo Differentiate texts depending on whether they are dynamic or not
           */
          let noTestsPassed = function () {
            $scope.title = 'Die Überprüfung ist abgeschlossen';
            $scope.textBeforeResult =
              'Leider funktioniert dein Programm noch nicht wie gewünscht. Bei keinem meiner Tests hat dein Programm die richtige Ausgabe erzeugt. ';
            $scope.textAfterResult = 'Versuche dein Programm weiter zu verbessern.';
            $scope.avatar = '../../../images/avatars/Avatar_RobyCoder_RZ_worried_2020.svg';
          };

          /**
           * Defines what to do when no tests passed
           */
          let notEnoughTestsPassed = function (numTests) {
            $scope.title = 'Die Überprüfung ist abgeschlossen';
            $scope.textBeforeResult =
              'Gut gemacht! Dein Programm erfüllt bereits ' +
              $scope.numTestsPassed +
              ' von ' +
              $scope.numTests +
              ' Tests.';
            $scope.textAfterResult = 'Versuche dein Programm weiter zu verbessern.';
            $scope.avatar = '../../../images/avatars/Avatar_RobyCoder_RZ_worried_2020.svg';
          };

          /**
           * Defines what to do to when all tests passed
           * When the passRates is reached the sample solution is fetched and the the msgSuccessfulSubmission event is triggered
           */
          let enoughTestsPassed = async function () {
            $scope.title = 'Super gemacht!';
            $scope.textBeforeResult =
              'Gratulation! Dein Programm hat alle Tests bestanden und du hast die maximale Punktzahl erhalten.';
            $scope.textAfterResult = 'Du kannst dir nun die Musterlösung ansehen.';

            $scope.avatar = '../../../images/avatars/Avatar_RobyCoder_RZ_thumb-up_2020.svg';

            projectData.projectCompleted = true;
            // we have to set the lastSubmissionHasReview to false because the user submitted a new solution
            projectData.lastSubmissionHasReview = false;

            // code-review part (only if enabled)
            if (!$scope.isActionHidden('codeReview')) {
              try {
                // enable the review component
                $scope.showReviewComponent = true;
                $scope.reviewIsLoading = true;
                const res = await AISrv.askForCodeReview($routeParams.courseId, $routeParams.projectId);
                if (res && res.answer) {
                  $scope.reviewIsLoading = false;
                  $scope.codeReview = res.answer;
                  projectData.lastSubmissionHasReview = true;

                  // save the code review in the backend
                  await ChatSrv.addChatLine(res.answer, null, 'Roby', 'codeReview');
                }
              } catch (err) {
                // handle case when request limit is reached
                if (err.status === 429 && err.data.limitExceeded) {
                  $scope.reviewIsLoading = false;
                  $scope.codeReview = UITexts.CODE_REVIEW_LIMIT_EXCEEDED;
                } else {
                  console.log('Error while fetching code review!' + err);
                  $scope.reviewIsLoading = false;
                  $scope.codeReview = UITexts.CODE_REVIEW_ERROR;
                }
              }
            }

            // we also have to set the completion and review status globally
            ProjectFactory.setCompletionStatus(projectData.projectCompleted);
            ProjectFactory.setReviewStatus(projectData.lastSubmissionHasReview);

            var url = '/api/projects/' + $routeParams.projectId + '/sampleSolution';

            // check if courseId is available
            if ($routeParams.courseId) {
              url += '?courseId=' + $routeParams.courseId;
            }

            // check if there is already a solution available if student make multiple submissions in one "session" (reduce api calls)
            const existingSolution = ProjectFactory.getSampleSolution();

            // if there is no solution available fetch it from the db otherwise we don't need to do anything
            // because it is already set and available
            if (!existingSolution) {
              try {
                var res = await $http.get(url);
                ProjectFactory.setSampleSolution(res.data);

                // trigger digest cycle to update the UI (otherwise "Musterlösung" button is not shown)
                $timeout(function () {});
              } catch (err) {
                console.log('Error while fetching sample solution!' + err);
              }
            }

            // trigger the event to indicate a successful submission
            let req = IdeMsgService.msgSuccessfulSubmission();
            $rootScope.$broadcast(req.msg);
          };

          /**
           * Defines what to do when a submission went wrong
           */
          let submissionFailed = function () {
            $scope.title = 'Submission fehlgeschlagen';
            $scope.textBeforeResult =
              'Bitte versuche deine Aufgabe erneut abzugeben. Wenn die Submission erneut fehlschlägt, wennde dich bitte an deinen Kursleiter';
          };

          /**
           * Initial function submits the solution via projectFactory and prepares the testResult
           */
          let init = function () {
            // submit the project
            ProjectFactory.submitProject().then(
              function (result) {
                $log.debug('Submission successful.'); // todo nope stimmt nicht

                setOutput(result.msg, false);

                let testResult = result.data;

                // get num tests
                $scope.hasResult = true;
                $scope.numTestsFailed = testResult.numTestsFailed;
                $scope.numTestsPassed = testResult.numTestsPassed;
                $scope.numTests = testResult.numTestsFailed + testResult.numTestsPassed;

                // calculate score and determine if passed
                $scope.score = testResult.numTestsPassed / $scope.numTests;
                $scope.progress = $scope.score * 100;
                $scope.passRate = 1;
                $scope.passed = $scope.passRate <= $scope.score;

                // the modal context depends on the test result. In the following we check the result
                // and call the depending function
                switch (true) {
                  // if no tests passed -> probably compile error // todo neu direkt prüfen ob compilationError enthalten ist..
                  case $scope.score === 0:
                    noTestsPassed();
                    break;

                  // if at least on test is passed but not enough to pass the testing
                  case $scope.score < $scope.passRate:
                    notEnoughTestsPassed();
                    break;

                  // if the score is greater than the passRate
                  case $scope.score >= $scope.passRate:
                    enoughTestsPassed();
                    break;

                  // default should not be possible, therefore show an error
                  default:
                    submissionFailed();
                    break;
                }

                // enable compilation and submission (not running, because what the submission compiles might differ from the last compilation if the user changed something; that could be confusing for the user)
                setEnabledActions(1, 0, 1, 1, 1);

                $scope.submissionIsLoading = false;
              },
              function (reason) {
                $log.debug('Submission failed.' + reason.data.msg);
                setOutput(reason.data.msg, false);

                // show an error message in modal
                submissionFailed();

                // the submission failed; because we don't know why, we enable compilation and submission
                setEnabledActions(1, 0, 1, 1, 1);
              }
            );
          };
          init();

          /**
           * Returns src to for avatar svg depending on test result
           * @returns {string}
           */
          $scope.getAvatar = function () {
            return $scope.avatar;
          };

          /**
           * Checks if the current project has a sample solution to display "Musterlösung anzeigen" button
           * @returns {*}
           */
          $scope.hasSampleSolution = function () {
            return ProjectFactory.hasSampleSolution();
          };

          /**
           * Checks if the some buttons in the modal should not be displayed because the action is hidden
           */
          $scope.isActionHidden = function (action) {
            // if the current user is admin return false
            if (UserSrv.isAuthenticated() && ProjectFactory.getProject().userRole !== 'user') {
              return false;
            }

            // array that hols the config
            const disabledActions = CodeboardSrv.getDisabledActions();
            const enabledActions = CodeboardSrv.getEnabledActions();

            // check if disabled actions contains the action and there is no enabledAction in the project
            return disabledActions.includes(action) && !enabledActions.includes(action);
          };

          /**
           * Close modal function
           */
          $scope.close = function () {
            $uibModalInstance.close({});
          };

          /**
           * link to the course page
           */
          $scope.goToCourse = function () {
            let courseUrl = ProjectFactory.getProject().ltiData.ltiReturnUrl;
            $window.location.href = decodeURIComponent(courseUrl);
          };

          /**
           * Open info tab
           */
          $scope.requestHelp = function () {
            // first we close the modal
            $uibModalInstance.close();

            // trigger open info tab
            let req = IdeMsgService.msgNavBarRightOpenTab('info');
            $rootScope.$broadcast(req.msg, req.data);
          };

          /**
           * Open sampleSolution tab
           */
          $scope.openSampleSolution = function () {
            // first we close the modal
            $uibModalInstance.close();

            // trigger open sample solution tab
            let req = IdeMsgService.msgNavBarRightOpenTab('sampleSolution');
            $rootScope.$broadcast(req.msg, req.data);
          };
        },
      ];

      /**
       * call the function to open the modal (we ignore the modalInstance returned by
       * this call as we don't need to access any data from the modal)
       */
      $uibModal.open({
        appendTo: angular.element(document.querySelector('#modalAppendTo')),
        templateUrl: 'ideSubmitModal.html',
        controller: submitModalInstanceCtrl,
        windowClass: 'avatar-modal',
        size: 'md',
      });
    };

    /** Function to stop an action (e.g. run); Requires that ideState.stopUrl is set */
    let stopAction = function stopAction() {
      if (ideState.stopUrl) {
        $http.get(ideState.stopUrl).then(
          function (result) {
            setOutput('\n\n--Program stopped--', true);
          },
          function (error) {
            $log.debug('An error occurred while trying to stop your program.');
            setOutput('\n\nAn error occurred while trying to stop your program.', true);
          }
        );
      }
    };

    /**
     * Reset project and restore original
     * @author Janick Michot
     */
    let resetSolution = function () {
      let confirmResetModalInstanceCtrl = [
        '$rootScope',
        '$scope',
        '$uibModalInstance',
        function ($rootScope, $scope, $uibModalInstance) {
          /**
           * If user confirms modal, load original files and overwrite current
           */
          $scope.ok = function () {
            // the url from which to get the files of the project
            let _urlForProject = '/api/projects/' + $routeParams.projectId;

            // separator used to add courseId. If lti we need & otherwise ?
            var sep = '?';

            // if we have a Lti user, we need to attach the Lti parameters because the server checks if the user is an lti user and grants access accordingly
            if ($routeParams.ltiSessionId && $routeParams.ltiUserId && $routeParams.ltiNonce) {
              _urlForProject +=
                '?ltiSessionId=' +
                $routeParams.ltiSessionId +
                '&ltiUserId=' +
                $routeParams.ltiUserId +
                '&ltiNonce=' +
                $routeParams.ltiNonce;
              sep = '&';
            }

            if (ProjectFactory.getCourseId()) {
              _urlForProject += sep + 'courseId=' + ProjectFactory.getCourseId();
            }

            // load original
            $http.get(_urlForProject).then(function (result) {
              // update the project data in the ProjectFactory
              ProjectFactory.setProjectFromJSONdata(result.data, ltiData);

              // reload tree view
              $rootScope.$broadcast(IdeMsgService.msgReloadTreeFromProjectFactory().msg);

              // reload current file in editor
              $rootScope.$broadcast(IdeMsgService.msgForceReloadCurrentNode().msg);

              // close modal
              $uibModalInstance.close();
              // reset the code in the code editor
              $rootScope.$broadcast(IdeMsgService.msgResetCode().msg);
            });
          };

          /**
           * Close modal on cancle
           */
          $scope.cancel = function () {
            $uibModalInstance.close();
          };
        },
      ];

      // call the function to open the modal (we ignore the modalInstance returned by this call as we don't need to access any data from the modal)
      $uibModal.open({
        templateUrl: 'ideConfirmResetModal.html',
        controller: confirmResetModalInstanceCtrl,
        appendTo: angular.element(document.querySelector('#modalAppendTo')),
      });
    };

    /**
     * This function redirects a user back to an overview page.
     * LTI-Users are redirected to the moodle course page.
     * Non-LTI-Users are redirected to their profile page
     */
    let takeMeHome = function () {
      let url = '/';
      if (ProjectFactory.getProject().hasLtiData) {
        url = ProjectFactory.getProject().ltiData.ltiReturnUrl;
      }
      $window.location.href = decodeURIComponent(url);
    };

    // we need a way to hold some state of the IDE; this object contains the states that are required
    var ideState = {
      // if the user clicks an action (e.g. compile, run), this variable can be set to indicate that the action supports user-stopping
      actionAllowsForStopping: false,
      // the Url that must be called to stop an action
      stopUrl: '',
    };

    $scope.projectName = ProjectFactory.getProject().name;

    $scope.ace = {
      currentNodeId: -1,
      editor: null,
      isVisible: false, // by default, the editor is hidden
    };

    /**
     * Function that's called when the ace editor is loaded the first time.
     * This comes as part of the ace-angular wrapper.
     * @param aEditor the ace editor instance
     */
    $scope.aceLoaded = function (aEditor) {
      // we store access to the ace instance
      $scope.ace.editor = aEditor;
    };

    /**
     * Settings for different UI elements, e.g. should buttons be visible
     * todo maybe combine with isActionHidden? Why separated from disabledActions and hiddenActions...
     */
    $scope.uiSettings = {
      // do we show the submit button?
      showSubmissionBtn: projectData.isSubmissionAllowed,
      disableSubmissionBtn: false, // projectData.projectCompleted // todo maybe add settings
    };

    // state variables to indicate which actions in the IDE are disabled
    $scope.disabledActions = {
      compile: false,
      run: true,
      stop: true,
      test: false,
      tool: false,
      submit: false,
      beautify: false,
    };

    // state variables to indicate which actions in the IDE are hidden
    $scope.hiddenActions = {
      compileDynamic: false,
      compileAndRun: false,
      run: false,
      stop: true,
    };

    /**
     * Enable or disable UI elements for actions.
     * @param compile {number} if 1, compile action will be set enabled
     * @param run {number} if 1, run action will be set enabled
     * @param test {number} if 1, test action will be set enabled
     * @param tool {number} if 1, tool action will be set enabled
     * @param submit {number} if 1, submit action will be set enabled
     */
    var setEnabledActions = function (compile, run, test, tool, submit) {
      $scope.disabledActions.compile = compile !== 1;
      $scope.disabledActions.run = run !== 1;
      $scope.disabledActions.test = test !== 1;
      $scope.disabledActions.tool = tool !== 1;
      $scope.disabledActions.submit = submit !== 1;

      // trigger a digest because when the WebSocket closes, the buttons sometimes don't get enabled
      if (!$scope.$$phase) {
        $scope.$digest();
      }
    };

    // state variable to indicate if a programm is running or not
    $scope.programmIsRunning = false;

    /**
     * Default settings of the editor
     */
    $scope.aceEditorSettings = {
      theme: 'eclipse',
      fontSize: '12px',
      handler: 'ace',
      tabSize: 4,
      invisibles: 'Hide',
      gutter: 'Show',
    };

    var aceKeyboardHandler; // default ace keyword handler

    /**
     * Object that provides functions used to help the user signin.
     * @type {{userIsAuthenticated: Function, signinPathWithRedirect: Function}}
     */
    $scope.signinSettings = {
      /**
       * Function that checks if the user is currently authenticated.
       * @return {*|Boolean} true if user is authenticated, otherwise false
       */
      userIsAuthenticated: function () {
        return UserSrv.isAuthenticated();
      },

      /**
       * Function that returns the URL string that that should be used to
       * load the Signin page and afterwards redirect back to the current project.
       * @return {string} the url for the signin with a 'redirect' query parameter
       */
      signinPathWithRedirect: function () {
        return '/signin?redirect=' + encodeURIComponent($location.url());
      },
    };

    /**
     * Returns true if user is authentificated   todo was mit lti usern?
     * @returns {Boolean|void|boolean}
     */
    $scope.userAllowedToSave = function () {
      let projectData = ProjectFactory.getProject();
      return (
        UserSrv.isAuthenticated() &&
        ((projectData.userRole === 'user' && Object.keys(projectData.courseData).length !== 0) ||
          projectData.userRole === 'owner')
      );
    };

    /** Returns true if the current role is that of project 'owner' */
    $scope.currentRoleIsOwner = function () {
      return ProjectFactory.getProject().userRole === 'owner';
    };

    /** Returns true if the current role is that of project 'user' */
    $scope.currentRoleIsUser = function () {
      return ProjectFactory.getProject().userRole === 'user';
    };

    /** Returns true if the current role is that of project 'submission' */
    $scope.currentRoleIsSubmission = function () {
      return ProjectFactory.getProject().userRole === 'submission';
    };

    /** Returns true if the current role is that of project 'userproject' */
    $scope.currentRoleIsUserProject = function () {
      return ProjectFactory.getProject().userRole === 'userproject';
    };

    /** Returns true if the current role is that of project 'help' */
    $scope.currentRoleIsHelp = function () {
      return ProjectFactory.getProject().userRole === 'help';
    };

    /** Returns the current role */
    $scope.getCurrentRole = function () {
      return ProjectFactory.getProject().userRole;
    };

    /** Returns true if the current role is that of project 'ltiUser' */
    $scope.currentRoleIsLtiUser = function () {
      return $scope.isUsingLti;
    };

    /** Returns true if the current role is that of project 'owner' */
    $scope.isProjectCompleted = function () {
      return projectData.projectCompleted;
    };

    /**
     * returns true whether or not this project uses the 'compileAndRun' button
     **/
    $scope.isCompileAndRun = function () {
      return ProjectFactory.getConfig().separateCompileAndRun !== true;
    };

    /**
     * Returns true or false whether the action is disabled in codeboard.json or not
     * @param action
     * @returns {*}
     */
    $scope.isActionHidden = function (action) {
      // if the current user is admin return false
      if (UserSrv.isAuthenticated() && ProjectFactory.getProject().userRole !== 'user') {
        return false;
      }

      // array that hols the config
      const disabledActions = CodeboardSrv.getDisabledActions();
      const enabledActions = CodeboardSrv.getEnabledActions();

      // check if disabled actions contains the action and there is no enabledAction in the project
      return disabledActions.includes(action) && !enabledActions.includes(action);
    };

    /**
     * Returns false if a language doesn't need compilation
     * but can be run directly.
     * @return {boolean}
     */
    $scope.isCompilationNeeded = function () {
      var _dynamicLanguages = ['Python', 'Python-UnitTest'];
      var _compilationIsNeeded = true;

      if (_dynamicLanguages.indexOf(ProjectFactory.getProject().language) !== -1) {
        _compilationIsNeeded = false;
      }

      // $log.debug('Project uses langguage that needs compilation: ' + result);
      return _compilationIsNeeded;
    };

    /**
     * Returns true if a language supports testing with some testing framework.
     * @return {boolean}
     */
    $scope.isTestSupported = function () {
      return ProjectFactory.hasConfig('Testing', 'ioTests');
    };

    /**
     * Returns true if a language supports testing with some testing framework.
     * @return {boolean}
     */
    $scope.isToolSupported = function () {
      return false;

      /* todo check what we can use here (Janick)
          var _toolProjects = ['Infer-Java'];
          var _toolIsSupported = false;

          if(_toolProjects.indexOf(ProjectFactory.getProject().language) !== -1) {
              _toolIsSupported = true;
          }

          // $log.debug('Project uses testing framework: ' + result);
          return _toolIsSupported;
          */
    };

    /**
     * Returns true if the project has a sample solution
     * @return {boolean}
     */
    $scope.isSampleSolutionSupported = function () {
      return ProjectFactory.hasSampleSolution();
    };

    /**
     * prepare panes depending on hidden actions (Janick Michot)
     */
    const treeViewOpen = $scope.currentRoleIsOwner() || $scope.currentRoleIsHelp() || $scope.currentRoleIsSubmission();
    // kPane for treeView
    $scope.kPanes = $scope.isActionHidden('tree-view')
      ? '['
      : '[{ collapsible: true, collapsed: ' + !treeViewOpen + ", size: '220px' } ,";
    // kPane for aceEditor
    $scope.kPanes += ' {collapsible: false} ';
    // kPane for rightBarTabs (before actual tabs - content)
    $scope.kPanes += !angular.equals({}, $scope.rightBarTabs)
      ? ", { collapsible: true, resizable: true, collapsed: true, size: '35%' }"
      : '';
    // kPane for rightBarTabs
    $scope.kPanes += !angular.equals({}, $scope.rightBarTabs)
      ? ", { collapsible: false, resizable: false, collapsed: false, size: '26px' } ]"
      : ']';

    /**
     * Function that broadcasts messages when an element in the NavBar is clicked by the user.
     * @param {string} aClickId the clickId that tells the code which element the user clicked
     */
    $scope.navBarClick = function (aClickId) {
      $log.debug('NavBarClick with id: ' + aClickId);

      var req;

      switch (aClickId) {
        case 'home':
          req = IdeMsgService.msgTakeMeHomeRequest();
          $rootScope.$broadcast(req.msg);
          break;
        case 'add_file':
          req = IdeMsgService.msgNewNodeRequest('file');
          $rootScope.$broadcast(req.msg, req.data);
          break;
        case 'add_folder':
          req = IdeMsgService.msgNewNodeRequest('folder');
          $rootScope.$broadcast(req.msg, req.data);
          break;
        case 'rename_node':
          req = IdeMsgService.msgRenameNodeRequest();
          $rootScope.$broadcast(req.msg);
          break;
        case 'remove_node':
          req = IdeMsgService.msgRemoveNodeRequest();
          $rootScope.$broadcast(req.msg);
          break;
        case 'save_project':
          req = IdeMsgService.msgSaveProjectRequest();
          $rootScope.$broadcast(req.msg);
          break;
        case 'hide_file':
          req = IdeMsgService.msgHideNodeRequest();
          $rootScope.$broadcast(req.msg);
          break;
        case 'make_file_static':
          req = IdeMsgService.msgMakeNodeStaticNodeRequest();
          $rootScope.$broadcast(req.msg);
          break;
        case 'show_share_project':
          req = IdeMsgService.msgShowShareProjectModalRequest();
          $rootScope.$broadcast(req.msg);
          break;
        case 'show_editor_settings':
          req = IdeMsgService.msgShowEditorSettingsRequest($scope.aceEditorSettings);
          $rootScope.$broadcast(req.msg, req.data);
          break;
        case 'compile':
          if (!$scope.disabledActions.compile) {
            req = IdeMsgService.msgCompileRequest();
            $rootScope.$broadcast(req.msg);
          }
          break;
        case 'compileDynamic':
          if (!$scope.disabledActions.compile) {
            req = IdeMsgService.msgCompileRequest();
            $rootScope.$broadcast(req.msg);
            ideState.actionAllowsForStopping = true;
          }
          break;
        case 'compile_clean':
          if (!$scope.disabledActions.compile) {
            req = IdeMsgService.msgCompileCleanRequest();
            $rootScope.$broadcast(req.msg);
          }
          break;
        case 'run':
          if (!$scope.disabledActions.run) {
            req = IdeMsgService.msgRunRequest();
            $rootScope.$broadcast(req.msg);
            ideState.actionAllowsForStopping = true;
          }
          break;
        case 'compileAndRun':
          if (!$scope.disabledActions.compileAndRun) {
            req = IdeMsgService.msgCompileAndRunRequest();
            $rootScope.$broadcast(req.msg);
            ideState.actionAllowsForStopping = true;
          }
          break;
        case 'stop':
          req = IdeMsgService.msgStopRequest();
          $rootScope.$broadcast(req.msg);
          break;
        case 'test':
          if (!$scope.disabledActions.test) {
            req = IdeMsgService.msgTestRequest();
            $rootScope.$broadcast(req.msg);
          }
          break;
        case 'tool':
          if (!$scope.disabledActions.tool) {
            req = IdeMsgService.msgToolRequest();
            $rootScope.$broadcast(req.msg);
          }
          break;
        case 'submit':
          if (!($scope.disabledActions.submit || $scope.uiSettings.disableSubmissionBtn)) {
            req = IdeMsgService.msgSubmitRequest();
            $rootScope.$broadcast(req.msg);
          }
          break;
        case 'help':
          if (!$scope.disabledActions.help) {
            // todo getHelp in disabledActions definieren
            let req = IdeMsgService.msgNavBarRightOpenTab('info');
            $rootScope.$broadcast(req.msg, req.data);
          }
          break;
        case 'reset':
          if (!$scope.disabledActions.help) {
            req = IdeMsgService.msgResetRequest();
            $rootScope.$broadcast(req.msg);
          }
          break;
        case 'beautify_code':
          // part of code from https://stackoverflow.com/questions/45458330/how-to-format-java-code-in-ace-editor
          var code = $scope.ace.editor.getSession().getValue();
          // options for the beautifer
          var jsbOpts = {
            indent_size: 4,
            brace_style: 'collapse, preserve-inline',
            max_preserve_newlines: '2',
            preserve_newlines: true,
          };
          function syncEditor() {
            $scope.ace.editor.getSession().setValue(code);
          }
          function formatCode() {
            var session = $scope.ace.editor.getSession();
            session.setValue(js_beautify(code, jsbOpts));
          }
          $timeout(() => {
            syncEditor();
            formatCode();
          });
          break;
      }
    };

    /**
     * Function to force an update of the current node displayed by the editor
     */
    $scope.$on(IdeMsgService.msgForceReloadCurrentNode().msg, function (aEvent, aMsgData) {
      let req = IdeMsgService.msgDisplayFileRequest($scope.ace.currentNodeId, true);
      $rootScope.$broadcast(req.msg, req.data);
    });

    /**
     * Function to update the session displayed by the ace editor
     * when there's a request to display a different file from the one current displayed
     */
    $scope.$on(IdeMsgService.msgDisplayFileRequest().msg, function (aEvent, aMsgData) {
      if ($scope.ace.currentNodeId !== -1 && !aMsgData.forceReload) {
        // if the value is !== -1, then some tab is already open
        // thus, we need to store the session related the current tab before loading the session for the requested tab
        ProjectFactory.getNode($scope.ace.currentNodeId).session = $scope.ace.editor.getSession();

        // update the content
        ProjectFactory.getNode($scope.ace.currentNodeId).content = $scope.ace.editor.getSession().getValue();
      }

      // get the file
      var lNode = ProjectFactory.getNode(aMsgData.nodeId);

      // get the content of the node
      var lFileContent = lNode.content;

      // the mode that should be used in this session
      var lAceMode = 'ace/mode/text';

      // get the file type
      var lFileType = lNode.filename.split('.').pop();

      // image file types
      let imageFileTypes = ['png', 'svg', 'jpg', 'gif'];

      // if file type 'image' change editor behaviour
      $scope.ace.isImage = false;
      if (imageFileTypes.includes(lFileType)) {
        $scope.ace.isImage = true;
        let fileContent = JSON.parse(ProjectFactory.getNode(aMsgData.nodeId).content);

        $scope.ace.image = fileContent.imagePath;
      }

      // restore the session (if one had been persisted before)
      if (
        ProjectFactory.getNode(aMsgData.nodeId).session !== undefined &&
        ProjectFactory.getNode(aMsgData.nodeId).session !== null
      ) {
        $scope.ace.editor.setSession(ProjectFactory.getNode(aMsgData.nodeId).session);
      } else {
        switch (lFileType) {
          case 'e':
            lAceMode = 'ace/mode/eiffel';
            break;
          case 'ecf':
            lAceMode = 'ace/mode/xml';
            break;
          case 'java':
            lAceMode = 'ace/mode/java';
            break;
          case 'html':
            lAceMode = 'ace/mode/html';
            break;
          case 'htm':
            lAceMode = 'ace/mode/html';
            break;
          case 'py':
            lAceMode = 'ace/mode/python';
            break;
          case 'c':
            lAceMode = 'ace/mode/c_cpp';
            break;
          case 'h':
            lAceMode = 'ace/mode/c_cpp';
            break;
          case 'cpp':
            lAceMode = 'ace/mode/c_cpp';
            break;
          case 'hs':
            lAceMode = 'ace/mode/haskell';
            break;
          case 'json':
            lAceMode = 'ace/mode/json';
            break;
          default:
            lAceMode = 'ace/mode/text';
        }

        // set default font size
        $scope.ace.editor.setFontSize(14);

        // create a new session, set the context and the mode
        $scope.ace.editor.setSession(ace.createEditSession(lFileContent, lAceMode));

        // set the aceKeyboardHandler to the default 'ace'
        aceKeyboardHandler = $scope.ace.editor.getKeyboardHandler();

        // enable ACE autocompletion and snippets
        var snippetManager = ace.require('ace/snippets').snippetManager;
        var config = ace.require('ace/config');

        ace.config.loadModule('ace/ext/language_tools', function () {
          $scope.ace.editor.setOptions({
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true,
          });
        });
      }

      // if the currently displayed node is static or action 'edit' hidden set editor to ready only (Janick Michot)
      if (
        (ProjectFactory.getNode(aMsgData.nodeId).isStatic || $scope.isActionHidden('edit')) &&
        !$scope.currentRoleIsOwner()
      ) {
        $scope.ace.editor.setReadOnly(true);
      } else {
        $scope.ace.editor.setReadOnly(false);
      }

      // update the information about which node is currently displayed in the editor
      $scope.ace.currentNodeId = aMsgData.nodeId;

      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    });

    /**
     * When users resize the IDE layout using the Kendo-Splitter,
     * we send a message because the Ace edtior needs to update it's layout.
     */
    $scope.splitterResizeEvent = function () {
      var req = IdeMsgService.msgEditorResizeRequest();
      $rootScope.$broadcast(req.msg);
    };

    /**
     * Hide submission button after successful submission
     */
    $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {
      // $scope.uiSettings.disableSubmissionBtn = true;
    });

    /**
     * Triggers a resize of the editor.
     * This can be necessary e.g. when the user changed the layout using the draggable splitters.
     */
    $scope.$on(IdeMsgService.msgEditorResizeRequest().msg, function () {
      $scope.ace.editor.resize();
    });

    /**
     * Triggers a save of the current view used to make submissions / help requests
     * @author Janick Michot
     * @date 30.12.2019
     */
    $scope.$on(IdeMsgService.msgSaveCurrentlyDisplayedContent().msg, function () {
      $log.debug('Save request received');

      //  we need to store the current content first
      saveCurrentlyDisplayedContent(true);
    });

    /**
     * Triggers a save of the current project
     */
    $scope.$on(IdeMsgService.msgSaveProjectRequest().msg, function () {
      $log.debug('Save request received');

      //  we need to store the current content first
      saveCurrentlyDisplayedContent();

      // send the entire project to the server
      ProjectFactory.saveProjectToServer().then(
        function (result) {
          setOutput('<span style="color: green;">Changes successfully saved.</span>', true);

          // the success message should disappear after some time
          $timeout(function () {
            setOutput('This will display the output.', false);
          }, 2500);
        },
        function (reason) {
          setOutput(
            '<span style="color: red">' +
              'WARNING: Unable to save your changes.<br><br>' +
              "What now: maybe you're currently not logged in.<br>" +
              'Open a new browser tab for codeboard.io, login, and then come back to this tab and try to save your changes.<br>' +
              'If the problem persists, contact the course admin' +
              '</span>',
            true
          );
        }
      );

      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    });

    /** Handles the event that editor settings show be shown. */
    $scope.$on(IdeMsgService.msgShowEditorSettingsRequest().msg, function (aEvent, aMsgData) {
      /** The controller for the modal */
      var editorSettingsModalInstanceCtrl = [
        '$rootScope',
        '$scope',
        '$uibModalInstance',
        function ($rootScope, $scope, $uibModalInstance) {
          var lastEditorSettings = angular.copy(aMsgData.settings);

          $scope.editorSettings = angular.copy(aMsgData.settings);

          $scope.ok = function () {
            var req = IdeMsgService.msgEditorSettingsChanged($scope.editorSettings);
            $rootScope.$broadcast(req.msg, req.data);
            $uibModalInstance.close();
          };

          $scope.preview = function () {
            var req = IdeMsgService.msgEditorSettingsChanged($scope.editorSettings);
            $rootScope.$broadcast(req.msg, req.data);
          };

          $scope.cancel = function () {
            //$scope.aceEditorSettings = lastEditorSettings;
            var req = IdeMsgService.msgEditorSettingsChanged(lastEditorSettings);
            $rootScope.$broadcast(req.msg, req.data);
            $uibModalInstance.dismiss();
          };
        },
      ];

      /** Function to open the modal where the user must confirm the loading of the project */
      var openModal = function (closeAction, dismissAction) {
        var modalInstance = $uibModal.open({
          templateUrl: 'ideEditorSettingsModal.html',
          controller: editorSettingsModalInstanceCtrl,
        });

        modalInstance.result.then(
          function () {
            // the user clicked ok
            $log.debug('User confirmed changes to editor settings.');
            // run the closeAction function if it's defined
            if (closeAction) {
              closeAction();
            }
          },
          function () {
            // the user canceled
            $log.debug('User canceled changes to editor settings.');
            // run the dissmissAction if it's defined
            if (dismissAction) {
              dismissAction();
            }
          }
        );
      };

      // call the function to open the modal (we don't give it any function for dismiss)
      openModal(
        function () {},
        function () {}
      );
    });

    /** Handles the event that changed the editor options. aMsgData has the selected settings for the editor */
    $scope.$on(IdeMsgService.msgEditorSettingsChanged().msg, function (aEvent, aMsgData) {
      $scope.aceEditorSettings = aMsgData.settings;
      if ($scope.aceEditorSettings.handler != 'ace') {
        $scope.ace.editor.setKeyboardHandler('ace/keyboard/' + $scope.aceEditorSettings.handler);
      } else {
        $scope.ace.editor.setKeyboardHandler(aceKeyboardHandler);
      }

      //console.log('You changed the editor');
      $scope.ace.editor.setTheme('ace/theme/' + $scope.aceEditorSettings.theme);

      $scope.ace.editor.setFontSize($scope.aceEditorSettings.fontSize);
      $scope.ace.editor.getSession().setTabSize($scope.aceEditorSettings.tabSize);
      if ($scope.aceEditorSettings.invisibles === 'Show') {
        $scope.ace.editor.setShowInvisibles(true);
      } else {
        $scope.ace.editor.setShowInvisibles(false);
      }
      if ($scope.aceEditorSettings.gutter === 'Show') {
        $scope.ace.editor.renderer.setShowGutter(true);
      } else {
        $scope.ace.editor.renderer.setShowGutter(false);
      }
    });

    /** Handles a "compileReqeusted" event */
    $scope.$on(IdeMsgService.msgCompileRequest().msg, function () {
      $log.debug('Compile request received');

      compileProject(false);
      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    });

    /** Handles a "cleanCompileRequest" event */
    $scope.$on(IdeMsgService.msgCompileCleanRequest().msg, function () {
      $log.debug('Clean-compile request received');
      compileProject(true);
      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    });

    /** Handles a "runRequest" event */
    $scope.$on(IdeMsgService.msgRunRequest().msg, function () {
      $log.debug('Run request received');
      runProject();
    });

    $scope.$on(IdeMsgService.msgStopRequest().msg, function () {
      $log.debug('Stop request received');

      stopAction();
    });

    /** Handles a "compileAndRunReqeusted" event */
    $scope.$on(IdeMsgService.msgCompileAndRunRequest().msg, function () {
      $log.debug('Compile request received');
      compileAndRunProject(false);
      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    });

    /** Handles a "testRequested" event */
    $scope.$on(IdeMsgService.msgTestRequest().msg, function () {
      $log.debug('Test request received');

      // open navbar right.. this also triggers the event to start testing
      let req = IdeMsgService.msgNavBarRightOpenTab('test', true);
      $rootScope.$broadcast(req.msg, req.data);

      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    });

    /** Handles a "toolRequested" event */
    $scope.$on(IdeMsgService.msgToolRequest().msg, function () {
      $log.debug('Tool request received');
      toolAction();
      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    });

    /** Handles a "submitRequest" event */
    $scope.$on(IdeMsgService.msgSubmitRequest().msg, function () {
      $log.debug('Submit request received');

      if (UserSrv.isAuthenticated() || ProjectFactory.getProject().hasLtiData) {
        // the user is authenticated or the project is using LTI, thus a submission is
        // likely to be forwarded to an LTI tool consumer
        // so we simply submit
        submitProject();
      } else {
        // open a modal to ask if the user really wants to make an anonymous submission

        /** The controller for the modal */
        var anonymousSubissionModalInstanceCtrl = [
          '$scope',
          '$uibModalInstance',
          function ($scope, $uibModalInstance) {
            $scope.ok = function () {
              $uibModalInstance.close();
            };

            $scope.cancel = function () {
              $uibModalInstance.dismiss();
            };
          },
        ];

        /** Function to open the modal where the user must confirm the loading of the project */
        var openModal = function (closeAction, dismissAction) {
          var modalInstance = $uibModal.open({
            templateUrl: 'ideConfirmAnonymousSubmissionModal.html',
            controller: anonymousSubissionModalInstanceCtrl,
          });

          modalInstance.result.then(
            function () {
              // the user clicked ok
              $log.debug('User confirmed submit anonymously.');
              // run the closeAction function if it's defined
              if (closeAction) {
                closeAction();
              }
            },
            function () {
              // the user canceled
              $log.debug('User canceled anonymous submission.');
              // run the dissmissAction if it's defined
              if (dismissAction) {
                dismissAction();
              }
            }
          );
        };

        // call the function to open the modal (we don't give it any function for dismiss)
        openModal(submitProject);
      }

      // set the focus on the editor so user can start typing right away
      $scope.ace.editor.focus();
    });

    /** Handles a "reset" event */
    $scope.$on(IdeMsgService.msgResetRequest().msg, function () {
      $log.debug('Reset request received');
      resetSolution();
    });

    /** Handles a "reset" event */
    $scope.$on(IdeMsgService.msgTakeMeHomeRequest().msg, function () {
      $log.debug('Take me Home request received');
      takeMeHome();
    });

    /** Handles request to show or hide the editor */
    $scope.$on(IdeMsgService.msgDisplayEditorRequest().msg, function (aEvent, aMsgData) {
      if (aMsgData.displayEditor) {
        $scope.ace.isVisible = true;
      } else {
        $scope.ace.isVisible = false;
      }
    });

    /**
     * Listens for confirmation that a node was removed.
     * If a node was removed that's currently shown in the editor we must no longer try to
     * persist it's ace session (in fact, that would throw an exception). This function
     * handles this case.
     */
    $scope.$on(IdeMsgService.msgRemoveNodeConfirmation().msg, function (aEvent, aMsgData) {
      if ($scope.ace.currentNodeId === aMsgData.uniqueId) {
        // the ace was currently showing the node that was deleted
        // thus, we'll not try to save the ace session when switching to another file.
        $scope.ace.currentNodeId = -1;
      }
    });

    $scope.$on(IdeMsgService.msgStoppableActionAvailable().msg, function () {
      $log.debug('Event received: Stoppable action available');

      $scope.hiddenActions.compileDynamic = true;
      $scope.hiddenActions.run = true;
      $scope.hiddenActions.compileAndRun = true;
      $scope.hiddenActions.stop = false;

      $scope.programmIsRunning = true;
    });

    $scope.$on(IdeMsgService.msgStoppableActionGone().msg, function () {
      $log.debug('Event received: Stoppable action gone');

      // reset the state of hidden buttons to default
      $scope.hiddenActions.compileDynamic = false;
      $scope.hiddenActions.run = false;
      $scope.hiddenActions.compileAndRun = false;
      $scope.hiddenActions.stop = true;

      // reset that a stoppable action is available
      ideState.actionAllowsForStopping = false;

      $scope.programmIsRunning = false;
    });

    /**
     * Handles an request event for processing the URI query string "?view=...".
     */
    $scope.$on(IdeMsgService.msgProcessViewQueryStringRequest().msg, function () {
      $scope.collapseTree = true;

      // we want to call the processViewQueryString function but only once we're sure Angular is done rendering the HTML page
      // because only at that time is the ACE editor ready to open any files
      // To achieve this, we use a $timeout as describe here: http://tech.endeepak.com/blog/2014/05/03/waiting-for-angularjs-digest-cycle/
      $timeout(function () {
        processViewQueryString();
        processCollapsedQuery(); // checks if treeView should be collapsed or not (Janick Michot)
      });
    });

    /**
     * Function to send the input of a user to her program.
     * @param {string} aUserInput the input to send to the program
     * @param {string} aElementIdToSetFocus a DOM element id; the element wit that id will get focus after the sending
     */
    $scope.sendUserInputClick = function (aUserInput, aElementIdToSetFocus) {
      // append a newline to the userInput. Otherwise, the users program won't continue execution but
      // wait for the user to hit the enter key

      // reset user input data
      this.userInputData = '';

      if (!aUserInput) {
        // aUserInput might be undefined if the ng-model never gets instanciated because the user doesn't enter
        // any value
        WebsocketSrv.sendData('\n');
      } else {
        WebsocketSrv.sendData(aUserInput + '\n');
      }

      // Note: doing the DOM manipulation in the controller is not "the Angular way"
      // However, we would need 2 more directives otherwise (one for enter-click, one for send-button click)
      // About element selection see: http://mlen.io/angular-js/get-element-by-id.html
      var domElem = angular.element(document.querySelector('#' + aElementIdToSetFocus));
      if (domElem) {
        domElem.focus();
      }
    };

    /** Below list all one-time invocations for functions which should run whenever the controller is loaded from scratch.*/
    // invoke function to init the project
    initProject();
    (async () => {
      await $scope.checkRemainingAIRequests();
    })();
  },
]);
