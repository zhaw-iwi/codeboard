/**
 * This is the main controller for the navBarTab "Explanation" and the variable scope (Coding-Assistant).
 *
 *
 * @author Samuel Truniger
 * @date 20.03.2023
 */
'use strict';
angular.module('codeboardApp').controller('codingAssistantMainCtrl', [
    '$scope',
    '$rootScope',
    '$timeout',
    'codingAssistantCodeMatchSrv',
    function ($scope, $rootScope, $timeout, codingAssistantCodeMatchSrv) {
        var aceEditor = $scope.ace.editor;
        var errorLine;
        var currentLine;
        $scope.cursorPosition = -1;

        codingAssistantCodeMatchSrv
            .getJsonData()
            .then(function (res) {
                var db = res;
                return codingAssistantCodeMatchSrv
                    .getJsonColors()
                    .then(function (colors) {
                        return { db: db, colors: colors };
                    })
                    .then(function (result) {
                        var db = result.db;
                        var colors = result.colors;
                        // Automatic function executed one time at the beginning and then every time the code in the editor changes
                        function updateExplanations() {
                            $scope.chatLines = [];

                            // get current code from aceEditor
                            var inputCode = aceEditor
                                .getSession()
                                .getValue()
                                .replace(/ +/g, ' ')
                                .replace(/\s*\;\s*$/g, ';');
                            var inputCodeArray = inputCode.split('\n');
                            var result = codingAssistantCodeMatchSrv.getMatchedExplanations(db, inputCodeArray, aceEditor, colors);

                            // convert variableMap into an object
                            $rootScope.variableMap = Object.fromEntries(result.variableMap);

                            // Iterate through the explanations array to generate the chatboxes
                            result.explanations.forEach((explanation) => {
                                if (explanation.isError) {
                                    // lineLevel of error chatbox
                                    errorLine = explanation.lineLevel;
                                    // current lineLevel of cursor
                                    currentLine = aceEditor.getSelectionRange().start.row + 1;
                                    let chatline = {
                                        type: 'error',
                                        message: explanation.answer,
                                        link: explanation.link,
                                        lineLevel: explanation.lineLevel,
                                        author: 'Roby erklärt Zeile ' + explanation.lineLevel,
                                        avatar: 'worried',
                                    };
                                    // show checkbox when line changed
                                    if (currentLine !== errorLine) {
                                        $scope.chatLines.push(chatline);
                                    }
                                } else {
                                    let chatline = {
                                        type: 'explanation',
                                        message: explanation.answer,
                                        link: explanation.link,
                                        lineLevel: explanation.lineLevel,
                                        author: 'Roby erklärt Zeile ' + explanation.lineLevel,
                                        avatar: 'idea',
                                    };
                                    $scope.chatLines.push(chatline);
                                }
                            });

                            // Update showNoCodeMessage element based on combinedExplanations array length
                            $scope.showNoCodeMessage = result.explanations.length === 0;
                        }

                        // call updateExplanations() to show message, when no file is opened
                        updateExplanations();

                        // Call updateExplanations() with a slight delay to ensure the initial code is loaded
                        $scope.$on('fileOpenend', function () {
                            $timeout(() => {
                                updateExplanations();
                            });
                        });

                        // Listen to the 'change' event of the Ace Editor / got the Code from the Ace Docs - https://ace.c9.io/#nav=howto
                        aceEditor.on('change', function () {
                            // Automatically call $apply if necessarry to prevent '$apply already in progress' error
                            $timeout(function () {
                                updateExplanations();
                            });
                        });
                        // listen to the 'mousedown' event to get line of the click / got code from stackoverflow - https://stackoverflow.com/questions/41647661/how-to-check-if-the-mouse-is-down-in-aceeditor
                        aceEditor.on('mousedown', function (e) {
                            $rootScope.cursorPosition = e.getDocumentPosition().row + 1;
                            $scope.$apply();
                        });

                        // listen to 'enter-keypress' event to reset cursorPosition / got part of code from stackoverflow - https://stackoverflow.com/questions/7060750/detect-the-enter-key-in-a-text-input-field
                        aceEditor.container.addEventListener('keypress', function (e) {
                            // Check if the key pressed is 'Enter'
                            if (e.key === 'Enter' || e.keyCode === 13) {
                                $rootScope.cursorPosition = -1;
                                $scope.$apply();
                            }
                        });
                    });
            })
            .catch(function (error) {
                console.error('An error occurred while fetching data:', error);
            });
    },
]);