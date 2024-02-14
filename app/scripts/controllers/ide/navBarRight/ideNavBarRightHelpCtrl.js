/**
 * This is the controller for the navBarTab "Tipps", "Fragen" and "Compiler".
 * It makes use of the 'chatSrv' in order to request tips as well as enabling the chat function in the "Tips" tab and provide the compiler-messages to the "Compiler" tab.
 *
 * @author Janick Michot
 * @author Samuel Truniger
 * @date 19.12.2019
 */

'use strict';

angular.module('codeboardApp')

    /**
     * Controller for Project Description
     */
    .controller('ideNavBarRightHelpCtrl', ['$scope', '$rootScope', '$sce', '$routeParams', '$http', '$log', '$timeout', '$uibModal', 'IdeMsgService', 'ProjectFactory', 'ChatSrv', 'UserSrv', 'AceEditorSrv', 'AISrv', 'CodeboardSrv', 'ProjectRes',
    function ($scope, $rootScope, $sce, $routeParams, $http, $log, $timeout, $uibModal, IdeMsgService, ProjectFactory, ChatSrv, UserSrv, AceEditorSrv, AISrv, CodeboardSrv, ProjectRes) {

        let slug = 'help',
            avatarName = "Roby"; // todo dieser Benutzername ist eingetlich nicht statisch ...

        // scope variables
        $scope.hintBtnTxt = "Tipp anfordern"
        $scope.searchForHint = false;
        $scope.chatLines = [];
        $scope.filteredCompilerChatLines = [];
        $scope.filteredTipChatLines = [];
        $scope.filteredHelpRequestChatLines = [];
        $scope.tips = [];
        $scope.sendRequestFormVisible = false;
        $scope.requestTipDisabled = true;
        $scope.noteStudent = $scope.noteTeacher = "";
        $scope.showCompilerIntroMessage = true;
        $scope.showCompilerInfoMessage = false;
        $scope.showNoCompilationErrorMessage = false;
        $scope.showCompilationErrorMessage = false;

        /**
         * init this tab by loading chat history and read tips
         */
        $scope.init = function() {
            // $scope.currentRoleIsUser()
            $scope.sendRequestFormVisible = !$scope.currentRoleIsUser();

            // when user role help, make help default tab
            if(ProjectFactory.getProject().userRole === 'help') {
                $timeout(function () {
                    let req = IdeMsgService.msgNavBarRightOpenTab('questions');
                    $rootScope.$broadcast(req.msg, req.data);
                }, 500);
            }


            // load chat history
            ChatSrv.getChatHistory()
                .then(function(result) {
                    result.data.forEach(function(chatLine) {
                        addChatLine(chatLine);
                    });
                })
                .then(function() {
                    // read all tips from codeboard.json
                    let config = ProjectFactory.getConfig();
                    if (config && "Help" in config && "tips" in config.Help) {
                        // add property to tips that they do not get sent multiple times in runtime
                        $scope.tips = config.Help.tips.map(tip => ({...tip, sent: false}));
                        $scope.helpIntro = config.Help.helpIntro;
                        $scope.requestTipDisabled = (getNumTipsAlreadySent() >= $scope.tips.length);
                        if ($scope.requestTipDisabled) {
                            $scope.hintBtnTxt = "Es sind keine weiteren Tipps verfügbar."
                        }

                        // update tips sent property based on chat history
                        $scope.chatLines.forEach(function (chatLine) {
                            if (chatLine.type === 'hint' && chatLine.message.cardType === 'tip' && chatLine.message.tipSent) {
                                // get index of already sent tip
                                let tipIndex = chatLine.message.tipIndex;
                                // if the tip was already sent mark it as true
                                if (tipIndex !== -1) {
                                    $scope.tips[tipIndex].sent = true;
                                }
                            }
                        });
                    }

                })
                .catch(function() {
                    console.log("Fehler beim Laden des Chatverlaufs");
                });
        };
        $scope.init();

        /**
         * Function to scroll to the bottom of the chat tab
         * todo probably not the best solution and not the angular way
         */
        let chatScrollToBottom = function() {
            $timeout(function(){
                document.getElementById("targetinto").scrollIntoView();
            }, 10);
        };

        /**
         * Returns the url to an avatar depending on user und message
         *
         * @param chatLine
         * @returns {string}
         */
        let getChatLineAvatar = function(chatLine) {
            if(chatLine.author.username === avatarName) {
                return (chatLine.type === "hint") ? 'idea' : 'neutral';
            } else {
                return (chatLine.author.username === chatLine.user.username) ? 'student' : 'teacher';
            }
        };

        /**
         * Returns the number of already sent tips
         * @returns {*}
         */
        let getNumTipsAlreadySent = function () {
            let chatLineTips = $scope.chatLines.filter(function(chatLine) {
                return (chatLine.type === 'hint' && chatLine.message.cardType === "tip");
            });
            return chatLineTips.length;
        };

        /**
         * This functions adds a chat line into the view
         * With the parameter 'scrollToBottom' whether or not the conversation box should be
         * scrolled to the bottom or not
         *
         * @param chatLine
         * @param scrollToBottom
         */
        let addChatLine = function(chatLine, scrollToBottom = false) {
            // if chatLine type card, parse the message
            // if current user role is 'user' remove the reference
            if(chatLine.type === 'hint' || chatLine.type === 'helpRequest' || chatLine.type === 'card') {
                chatLine.message = JSON.parse(chatLine.message);
                chatLine.message.cardReference = (ProjectFactory.getProject().userRole === 'user') ? null : chatLine.message.cardReference;
            }

            chatLine.avatar = getChatLineAvatar(chatLine);
            chatLine.author = chatLine.author.name || chatLine.author.username;
            chatLine.alignment = (chatLine.authorId !== chatLine.userId) ? 'left' : 'right';

            // add card to the list
            $scope.chatLines.push(chatLine);

            if(scrollToBottom) {
                chatScrollToBottom();
            }

            // re-empty note field
            $scope.noteStudent = "";
            $scope.noteTeacher = "";
        };

        // filter chatLines for compiler chatlines
        function filterCompilerChatLines() {
            $scope.filteredCompilerChatLines = $scope.chatLines.filter(function(chatLine) {
                return chatLine.type === 'compiler' || chatLine.type === 'compilerTest';
            });
        }

        // filter chatLines for tip (hint) chatlines
        function filterTipChatLines() {
            $scope.filteredTipChatLines = $scope.chatLines.filter(function(chatLine) {
                return chatLine.type === 'hint';
            });
        }

        // filter chatLines for helpRequest chatlines
        function filterHelpChatLines() {
            $scope.filteredHelpRequestChatLines = $scope.chatLines.filter(function(chatLine) {
                return chatLine.type === 'helpRequest' || chatLine.type === 'helpRequestAnswer' || chatLine.type === 'html' || (chatLine.type === 'card' && chatLine.message.cardType === 'help');
            });
        }

        // watches for changes in the chatLines array and call filter functions if there are changes to display the new chatboxes
        $scope.$watch('chatLines', function() {
            filterCompilerChatLines();
            filterTipChatLines();
            filterHelpChatLines();
        }, true);

        // function gets called when there is a change in the aceEditor
        AceEditorSrv.aceChangeListener($scope.ace.editor, function() {
            $scope.showCompilerInfoMessage = true;
            $scope.showNoCompilationErrorMessage = false;
            $scope.showCompilationErrorMessage = false;
            $scope.showCompilerIntroMessage = false;
        })

        
        /**
         * On open help tab, scroll to the bottom
         */
        $scope.$on(IdeMsgService.msgNavBarRightOpenTab().msg, function (event, data) {
            if(data.tab === slug) {
                chatScrollToBottom();
            }
        });

        let lastCompilerChatboxIndex = -1;
        /**
         * Message that is emitted when a new message (compiler error due to compilation/testing) should be added to the help tab.
         */
        $scope.$on(IdeMsgService.msgAddHelpMessage().msg, function (event, data) {
            $scope.showCompilerIntroMessage = false;
            $scope.showCompilerInfoMessage = false;
            $scope.showCompilationErrorMessage = true;

            let chatline = {
                type: data.type,
                message: data.msg,
                author: data.sender,
                avatar: data.avatar
            };

            // add the new chatbox to the array to display it in the compiler tab
            $scope.chatLines.push(chatline);
            
            // find the new last compilation error chatbox index
            $scope.chatLines.forEach((chatLine, index) => {
                if (chatLine.type === 'compiler' || chatLine.type === 'compilerTest') {
                    $scope.showNoCompilationErrorMessage = false;
                    lastCompilerChatboxIndex = index;
                }
            });
            chatScrollToBottom();
        });

        // gets called when a new compilation is started or finished with no errors to remove the last displayed chatbox
        $scope.$on(IdeMsgService.msgRemoveChatLine().msg, function (event, data) {
            // remove last compilation error chatbox
            if (data.type === "error") {
                if (lastCompilerChatboxIndex !== -1) {
                    $scope.chatLines.splice(lastCompilerChatboxIndex, 1);
                }
            } else if (data.type === "noError") {
                $scope.showCompilerIntroMessage = false;
                $scope.showCompilerInfoMessage = false;
                $scope.showNoCompilationErrorMessage = true;
                $scope.showCompilationErrorMessage = false;
                // use $timeout to ensure that code to runs after the current digest cycle finishes (without that view does not get updated correctly)
                $timeout(() => {
                    if (lastCompilerChatboxIndex !== -1) {
                        $scope.chatLines.splice(lastCompilerChatboxIndex, 1);
                        lastCompilerChatboxIndex = -1;
                    }
                })
            }
        });

        // this function gets called when a student triggers the "Tipp anfordern" button
        $scope.askForTip = function() {
            let disabledActions = CodeboardSrv.getDisabledActions();
            let enabledActions = CodeboardSrv.getEnabledActions();

            // check wheter to use ai to generate next hint or default process (order)
            if (disabledActions.includes("ai-hints") && !enabledActions.includes("ai-hints")) {
                let relevantHint = getHint();
                displayHint(relevantHint);
            } else {
                // save the all files in project to db
                if ($scope.ace.currentNodeId !== -1) {
                    // if the value is !== -1, then some tab is open
                    ProjectFactory.getNode($scope.ace.currentNodeId).content = $scope.ace.editor.getSession().getValue();
                }   
                ProjectFactory.saveProjectToServer().then(() => {
                    $scope.hintBtnTxt ="Tipp wird geladen..."
                    $scope.searchForHint = true;
                    getHintUsingAI().then((hint) => {
                        if (hint) {
                        displayHint(hint);
                        } else {
                            // case when no relevant hint was found by ai (hint should be undefined)
                            displayHint(hint);
                        }
                    }).catch(function(err) {
                        console.error("Error fetching hint using ai:", err);
                        let relevantHint = getHint();
                        displayHint(relevantHint)
                    });
               }).catch((err) => {
                    console.log(err);
                    let relevantHint = getHint();
                    displayHint(relevantHint);
               })
            }
        };
        
        // function which prioritize the hints using chatGPT
        var getHintUsingAI = function() {
            let hintsForProject = [];

            // store hints which are not already sent in new array 
            let index = 0;
            $scope.tips.forEach((e) => {
                if (!e.sent) {
                    hintsForProject.push({
                        id: index,
                        name: e.name,
                        note: e.note
                    })
                    index++;
                }
            })

            // data which is needed for the request
            let data = {
                hints: hintsForProject
            }

            return AISrv.askForRelevantTip(UserSrv.getUserId(), $routeParams.courseId, $routeParams.projectId, data).then((res) => {
                if (res) {
                    // the api call should return the id of the relevant hint which is then used to get the corresponding hint from the hints array
                    let hintIndex = parseInt(res);
                    // condition which checks wheter relevant hint was found by ai
                    if (hintIndex !== -1 && hintsForProject[hintIndex]) {
                        return hintsForProject[hintIndex];
                    } else if (hintIndex === -1) {
                        // case when ai returns -1 because no relevant hint was found
                        return;
                    } else if (!hintsForProject[hintIndex]) {
                        // case when ai returns an index other than -1 which is not part of array
                        return getHint();
                    }
                } 
                // fall back to default hint priorization (order)
                return getHint();
                
            }).catch((err) => {
                if (err.status === 401) {
                    console.error("Incorrect API key provided.");
                } else {
                    console.log(err);
                }
                // fall back to default hint priorization (order)
                return getHint();
            });
        }

        // function which prioritize the hints using default order
        var getHint = function() {
            let hint;
            // loop trough each tip in $scope.tips
            for (let i = 0; i < $scope.tips.length; i++) {
                // assign current tip to tip variable
                let tip = $scope.tips[i];           
                if (!tip.sent) {
                    hint = tip;
                    break;                 
                }
            }
            return hint;
        }

        
        // this functions adds a chatline with a relevant hint in the tip tab.
        var displayHint = function(relevantHint) {
            $scope.hintBtnTxt = "Tipp anfordern";
            $scope.searchForHint = false;
            // if there is a relevant tip add it to chatLines array
            if (relevantHint) {
                // get index of the tip to store it in db
                let tipIndex = $scope.tips.findIndex(hint => hint.name === relevantHint.name);
                $scope.tips[tipIndex].sent = true;
                // add chatbox in view
                ChatSrv.addChatLineCard(relevantHint.note, relevantHint.name, 'tip', null, null, avatarName, true, tipIndex)
                    .then(function(aChatLine) {
                        addChatLine(aChatLine, true);
                        $scope.requestTipDisabled = (getNumTipsAlreadySent() >= $scope.tips.length);
                        if ($scope.requestTipDisabled) {
                            $scope.hintBtnTxt = "Du hast alle verfügbaren Tipps abgefragt."
                        }
                    });
            } else {
                // open the modal to indicate that there was no relevant hint for the students solution
                $scope.$broadcast('openNoRelevantTipModal');
            }
        }

        // In a controller or service with access to $uibModal
        $scope.$on('openNoRelevantTipModal', function() {
             /** The controller for the modal */
             let noRelevantTipModalInstanceCtrl = [
                '$scope',
                '$uibModalInstance',
                function ($scope, $uibModalInstance) {
                    $scope.cancel = function () {
                        $uibModalInstance.close();
                    };
                },
            ];
            $uibModal.open({
                templateUrl: 'noRelevantTipModalContent.html',
                controller: noRelevantTipModalInstanceCtrl
            });
        });


        var lastHelpRequest = null;

        /**
         * This method is called by a student requires help for a project.
         * First create a new 'helpRequest' and then add a new chatline with reference
         * to the helpRequest.
         * @returns {*}
         */
        $scope.sendHelpRequest = function() {
            let noteStudent = $scope.noteStudent;
            if(!noteStudent || noteStudent === "" || typeof noteStudent === "undefined") {
                $scope.sendHelpFormErrors = "Nutze das darunterliegende Feld, um dein Anliegen zu beschreiben.";
                return false;
            }

            // trigger a save of the currently displayed content
            $rootScope.$broadcast(IdeMsgService.msgSaveCurrentlyDisplayedContent().msg);

            // call ProjectFactory to store the request
            return ProjectFactory.createHelpRequest()
                .then(function(helpRequest) {
                    lastHelpRequest = helpRequest;
                    let reference = "/projects/" + helpRequest.projectId + "/helprequests/" + helpRequest.id;
                    return ChatSrv.addChatLineCard(noteStudent,"Hilfe angefragt", 'help', reference, helpRequest.id);
                })
                .then(function(aChatLine) {
                    addChatLine(aChatLine, true);
                    $scope.sendRequestFormVisible = false;
                })
                .catch(function() {
                    $scope.sendHelpFormErrors = "Fehler beim Senden deiner Nachricht. Versuche es später noch einmal oder wende dich an den Systemadministrator.";
                });
        };

        /**
         * This method is called by a teacher to answer a students help request.
         * By doing so we first check the for valid message. Next we search for open
         * helpRequests and extract id of latest request. Then add new chatline with
         * reference to this request.
         */
        $scope.answerHelpRequest = function() {

            let noteTeacher = $scope.noteTeacher;
            if(!noteTeacher || noteTeacher === "" || typeof noteTeacher === "undefined") {
                $scope.sendHelpFormErrors = "Es wurde noch keine Antwort formuliert";
                return false;
            }

            // filter all chatlines with status unanswered
            let chatLinesUnanswered = $scope.chatLines.filter(function(chatLine) {
                return (chatLine.subject && chatLine.subject.status === 'unanswered');
            });

            // change status (update) of all unanswered helpRequests
            return chatLinesUnanswered.reduce(function(previousHelpRequest, chatLine) {
                return ProjectFactory.updateHelpRequest(chatLine.subjectId);
            }, Promise.resolve())
                .then(function(helpRequest) {
                    let id = (helpRequest !== undefined) ? helpRequest.id : -1;
                    return ChatSrv.addChatLine(noteTeacher, id, UserSrv.getUsername(), 'helpRequestAnswer');
                })
                .then(function(chatLine) {
                    addChatLine(chatLine, true);
                })
                .catch(function() {
                    $scope.sendHelpFormErrors = "Beim Senden der Antwort ist ein Fehler aufgetreten. Bitte noch einmal versuchen";
                });
        };

        /**
         * Show send request form on click
         */
        $scope.showSendRequestForm = function() {
            $scope.sendRequestFormVisible = true;
        };

        /**
         * This method is bound to the chatLine rating directive.
         * When the message is rated this method calls the chatService to
         * send the rating to the api.
         * @param messageId
         * @param rating
         */
        $scope.onMessageRating = function (messageId, rating) {
            ChatSrv.rateCompilationErrorMessage(messageId, rating)
                .then(function() {
                    // console.log("Message rated");
                });
        };
    }]);
