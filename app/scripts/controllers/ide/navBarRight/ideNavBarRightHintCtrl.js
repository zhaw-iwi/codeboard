/**
 * This is the controller for the navBarTab "Tipps".
 *
 * @author Samuel Truniger
 * @date 11.09.2024
 */

"use strict";

angular
  .module("codeboardApp")

  /**
   * Controller for the hint tab
   */
  .controller("ideNavBarRightHintCtrl", [
    "$scope",
    "$routeParams",
    "$uibModal",
    "IdeMsgService",
    "ProjectFactory",
    "ChatSrv",
    "AISrv",
    "CodeboardSrv",
    "UITexts",
    function ($scope, $routeParams, $uibModal, IdeMsgService, ProjectFactory, ChatSrv, AISrv, CodeboardSrv, UITexts) {
      // scope variables
      $scope.hintBtnTxt = "Tipp anfordern";
      $scope.hintIsLoading = false;
      $scope.chatLines = [];
      $scope.tips = [];
      $scope.disableHintBtn = true;
      $scope.hintInfoChatBoxTxt = UITexts.HINT_INFO;
      $scope.newestHintChatLines = [];
      $scope.oldHintChatLines = [];
      $scope.oldChatBoxes = false;
      $scope.displayOldChatBoxes = false;
      $scope.hideShowMore = false;
      const avatarName = "Roby";
      const chatBoxLimit = 1;
      const allChatBoxes = [];

      /**
       * Returns the number of already sent tips
       * @returns {*}
       */
      let getNumTipsAlreadySent = function () {
        return allChatBoxes.length;
      };

      /**
       * Checks if there are remaining hints and disables the hint button if not
       */
      let checkRemainingHints = function () {
        $scope.disableHintBtn = getNumTipsAlreadySent() >= $scope.tips.length;
              
        if ($scope.disableHintBtn) {
          $scope.hintInfoChatBoxTxt = UITexts.HINT_LIMIT_REACHED;
        }
      }

      /**
       * This functions adds a chat line into the view
       *
       * @param chatLine
       */
      let addChatBoxToList = function (chatLine) {
        chatLine.message = JSON.parse(chatLine.message);
        chatLine.avatar = "idea";
        chatLine.author = chatLine.author.name || chatLine.author.username;

        // add card to the list
        allChatBoxes.push(chatLine);
      };

      // function to display the chatboxes
      let displayChatBoxes = function () {
        // remove the last chatbox from the list (newest)
        $scope.newestHintChatLines = allChatBoxes.slice(-chatBoxLimit);       

        // if there are multiple different subjectIds show the "display more" button
        if (allChatBoxes.length > 1) {
          $scope.oldChatBoxes = true;
          $scope.hideShowMore = false;
        } else {
          $scope.oldChatBoxes = false;
          $scope.hideShowMore = true;
        }

        // hide the old chatboxes each time a new chatbox is added
        $scope.displayOldChatBoxes = false;
      }

      // function which prioritize the hints using default order
      var getHintDefault = function () {
        let hint;
        
        // loop trough each tip in $scope.tips (from codeboard.json)
        for (let i = 0; i < $scope.tips.length; i++) {
          // get the first tip which was not already sent
          let tip = $scope.tips[i];
          if (!tip.sent) {
            hint = tip;
            break;
          }
        }
        return hint;
      };

      /**
       * function which prioritize the hints using AI services
       */ 
      var getHintUsingAI = function () {
        let hintsForProject = [];

        // store hints which are not already sent in new array
        let index = 0;
        $scope.tips.forEach((e) => {
          if (!e.sent) {
            hintsForProject.push({
              id: index,
              name: e.name,
              note: e.note,
            });
            index++;
          }
        });

        // data which is needed for the request
        let data = {
          hints: hintsForProject,
        };

        return AISrv.askForRelevantTip($routeParams.courseId, $routeParams.projectId, data)
          .then((res) => {
            const hint = res.answer;
            const userReqLimitExceeded = res.limitExceeded;
            
            if (hint) {
              // the api call should return the id of the relevant hint which is then used to get the corresponding hint from the hints array
              let hintIndex = parseInt(hint);
              
              // condition which checks wheter relevant hint was found by ai
              if (hintIndex !== -1 && hintsForProject[hintIndex]) {
                return hintsForProject[hintIndex];
              } else if (hintIndex === -1) {
                // case when ai returns -1 because no relevant hint was found
                return;
              } else if (!hintsForProject[hintIndex]) {
                // case when ai returns an index other than -1 which is not part of array
                return getHintDefault();
              }
            } else if (userReqLimitExceeded) {
              return getHintDefault();
            }
            // fall back to default hint priorization (order)
            return getHintDefault();
          })
          .catch((err) => {
            // fall back to default hint priorization (order)
            return getHintDefault();
          });
      };

      // this functions adds a chatline with a relevant hint in the tip tab.
      var prepareHint = function (relevantHint) {
        $scope.hintBtnTxt = "Tipp anfordern";
        $scope.hintIsLoading = false;
        
        // if there is a relevant tip add it to chatLines array
        if (relevantHint) {
          // get index of the tip to store it in db
          let tipIndex = $scope.tips.findIndex((hint) => hint.name === relevantHint.name);
          // set sent property to true if multiple tips are requested in one session so that not the same tip is sent multiple times
          $scope.tips[tipIndex].sent = true;
          
          // store chatbox in the db
          ChatSrv.addChatLineCard(relevantHint.note, relevantHint.name, "tip", null, null, avatarName, true, tipIndex)
            .then((aChatLine) => {
              addChatBoxToList(aChatLine);
              
              displayChatBoxes();

              // check if there are remaining hints
              checkRemainingHints();
          });
        } else {
          // open the modal to indicate that there was no relevant hint for the students solution
          $scope.$broadcast(IdeMsgService.msgShowNoRelevantHintModal().msg);
        }
      };

      /**
       * this function gets called when a student triggers the "Tipp anfordern" button
       */
      $scope.askForTip = function () {
        let disabledActions = CodeboardSrv.getDisabledActions();
        let enabledActions = CodeboardSrv.getEnabledActions();

        // check wheter to use ai to generate next hint or default process (order)
        if (disabledActions.includes("ai-hints") && !enabledActions.includes("ai-hints")) {
          let relevantHint = getHintDefault();
          prepareHint(relevantHint);
        } else {
          // save the all files in project to db
          if ($scope.ace.currentNodeId !== -1) {
            // if the value is !== -1, then some tab is open
            ProjectFactory.getNode($scope.ace.currentNodeId).content = $scope.ace.editor.getSession().getValue();
          }

          ProjectFactory.saveProjectToServer()
            .then(() => {
              $scope.hintBtnTxt = "Tipp wird geladen...";
              $scope.hintIsLoading = true;
              
              getHintUsingAI().then((hint) => {
                  prepareHint(hint);
              })
              .catch((err) => {
                // fallback to default
                let relevantHint = getHintDefault();
                prepareHint(relevantHint);
              });
            })
            .catch((err) => {
              // fallback to default
              let relevantHint = getHintDefault();
              prepareHint(relevantHint);
            });
        }
      };

      // function to show more chatboxes
      $scope.showMore = function() {
        $scope.hideShowMore = true;
        $scope.displayOldChatBoxes = true;
        $scope.oldHintChatLines = allChatBoxes.slice(0, -chatBoxLimit); 
      }

      /**
       * init this tab by loading chat history and read tips
       */
      $scope.init = function () {
        // load chat history
        ChatSrv.getChatHistory()
          .then((res) => {
            // filter all the chatLines that are relevant for the hint tab
            const data = res.data.filter((chatLine) => chatLine.type === "hint");
            
            data.forEach((chatLine) => {
              addChatBoxToList(chatLine);
            });

            displayChatBoxes();
          })
          .then(() => {
            let config = ProjectFactory.getConfig();
            if (config && "Help" in config && "tips" in config.Help) {         
              // get all hints from codeboard.json and add property `sent` to each hint that it not get sent multiple times during runtime
              $scope.tips = config.Help.tips.map((tip) => ({ ...tip, sent: false }));
              
              // check if there are remaining hints
              checkRemainingHints();

              // update tips sent property based on chat history
              allChatBoxes.forEach((chatLine) => {                
                // get index of already sent tip
                let tipIndex = chatLine.message.tipIndex;
                // if the tip was already sent mark it as true
                if (tipIndex !== -1) {
                  $scope.tips[tipIndex].sent = true;
                }
              });
            }
          })
          .catch((err) => {
            console.log("Fehler beim Laden des Chatverlaufs:");
          });
      };

      // init the tab
      $scope.init();

      // this controller handels the modal which is shown when no relevant hint was found
      $scope.$on(IdeMsgService.msgShowNoRelevantHintModal().msg, function () {
        /** The controller for the modal */
        let noRelevantTipModalInstanceCtrl = [
          "$scope",
          "$uibModalInstance",
          function ($scope, $uibModalInstance) {
            $scope.cancel = function () {
              $uibModalInstance.close();
            };
          },
        ];
        $uibModal.open({
          templateUrl: "noRelevantTipModalContent.html",
          controller: noRelevantTipModalInstanceCtrl,
        });
      });
    },
  ]);
