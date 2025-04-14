/**
 * This is the controller for the navBarTab "Tipps".
 *
 * @author Samuel Truniger
 * @date 11.09.2024
 */

'use strict';

angular
  .module('codeboardApp')

  /**
   * Controller for the hint tab
   */
  .controller('ideNavBarRightHintCtrl', [
    '$scope',
    '$routeParams',
    '$uibModal',
    'IdeMsgService',
    'ProjectFactory',
    'ChatSrv',
    'AISrv',
    'CodeboardSrv',
    'UITexts',
    '$timeout',
    function (
      $scope,
      $routeParams,
      $uibModal,
      IdeMsgService,
      ProjectFactory,
      ChatSrv,
      AISrv,
      CodeboardSrv,
      UITexts,
      $timeout
    ) {
      // scope variables
      $scope.hintBtnTxt = 'Tipp anfordern';
      $scope.hintIsLoading = false;
      $scope.chatLines = [];
      $scope.defaultHints = [];
      $scope.remainingHints = 0;
      $scope.hintLimit = 0;
      $scope.disableHintBtn = true;
      $scope.hintInfoChatBoxTxt = UITexts.HINT_INFO;
      $scope.newestHintChatLines = [];
      $scope.oldHintChatLines = [];
      $scope.oldChatBoxes = false;
      $scope.displayOldChatBoxes = false;
      $scope.hideShowMore = false;

      // other variables
      const avatarName = 'Roby';
      const chatBoxLimit = 1;
      const allChatBoxes = [];

      /**
       * Checks if there are remaining hints and disables the hint button if not
       */
      const checkRemainingHints = function () {
        const numHintsSent = allChatBoxes.length;
        // display the number of hints that are still available
        $scope.remainingHints = $scope.hintLimit - numHintsSent;

        if (numHintsSent >= $scope.hintLimit) {
          $scope.disableHintBtn = true;
          $scope.hintInfoChatBoxTxt = UITexts.HINT_LIMIT_REACHED;
        } else {
          $scope.disableHintBtn = false;
          $scope.hintInfoChatBoxTxt = UITexts.HINT_INFO;
        }
      };

      /**
       * This functions adds a chat line into the view
       *
       * @param chatLine
       */
      const addChatBoxToList = function (chatLine) {
        chatLine.message = JSON.parse(chatLine.message);
        chatLine.avatar = 'idea';
        chatLine.author = chatLine.author.name || chatLine.author.username;

        // add card to the list of all chatLines
        allChatBoxes.push(chatLine);
      };

      // function to display the chatboxes
      const displayChatBoxes = function () {
        // remove the last chatboxes from the list (newest)
        $scope.newestHintChatLines = allChatBoxes.slice(-chatBoxLimit);

        // if there are multiple chatBoxes show the showMore Button
        if (allChatBoxes.length > 1) {
          $scope.oldChatBoxes = true;
          $scope.hideShowMore = false;
        } else {
          $scope.oldChatBoxes = false;
          $scope.hideShowMore = true;
        }

        // hide the old chatboxes view each time a new chatbox is added
        $scope.displayOldChatBoxes = false;

        // show the chatbox in the view
        $timeout(function () {}, 0);
      };

      // function which prioritize the hints using default order
      const getHintDefault = function () {
        // loop trough each tip in $scope.defaultHints (from codeboard.json)
        for (let i = 0; i < $scope.defaultHints.length; i++) {
          // get the first tip which was not already sent
          let hint = $scope.defaultHints[i];
          if (!hint.sent) {
            return hint;
          }
        }
        // if no hint was found because all hints were already sent, return null
        return null;
      };

      /**
       * function which prioritize the hints using AI services
       */
      const getHintUsingAI = async function () {
        try {
          // data which is needed for the request. to do: remove?
          const data = {};

          // fetch the relevant hint
          const res = await AISrv.askForRelevantTip($routeParams.courseId, $routeParams.projectId, data);
          const hint = res.answer;
          const userReqLimitExceeded = res.limitExceeded;

          if (hint) {
            // check if no relevant hint was found (-1)
            if (hint === -1) {
              // open the modal to indicate that there was no relevant hint for the students solution
              $scope.$broadcast(IdeMsgService.msgShowNoRelevantHintModal().msg);
              return null;
            }

            // otherwise return the new hint
            return hint;
          } else if (userReqLimitExceeded) {
            return getHintDefault();
          }
        } catch (err) {
          console.log('Error while getting hint using AI:', err);
          // fall back to default hint priorization (order)
          return getHintDefault();
        }
      };

      // this functions adds a chatline with a relevant hint in the tip tab.
      const prepareHint = async function (hint, type = 'default') {
        try {
          // reset buttons
          $scope.hintBtnTxt = 'Tipp anfordern';
          $scope.hintIsLoading = false;

          let chatbox = null;
          // store chatbox in the db
          if (type === 'default') {
            // get index of the tip to store it in db
            let tipIndex = $scope.defaultHints.findIndex((defaultHint) => defaultHint.name === hint.name);
            // set sent property to true if multiple tips are requested in one session so that not the same tip is sent multiple times
            $scope.defaultHints[tipIndex].sent = true;

            chatbox = await ChatSrv.addChatLineCard(
              hint.note,
              hint.name,
              'tip',
              null,
              null,
              avatarName,
              true,
              tipIndex
            );
          } else {
            chatbox = await ChatSrv.addChatLineCard(hint, 'AI-Tipp', 'tip', null, null, avatarName);
          }

          addChatBoxToList(chatbox);
          displayChatBoxes();

          // check if there are remaining hints
          checkRemainingHints();
        } catch (err) {
          console.error('Error while preparing hint:', err);
        }
      };

      /**
       * this function gets called when a student triggers the "Tipp anfordern" button
       */
      $scope.askForTip = async function () {
        try {
          const disabledActions = CodeboardSrv.getDisabledActions();
          const enabledActions = CodeboardSrv.getEnabledActions();

          // check wheter to use ai to generate next hint or default process (order)
          if (disabledActions.includes('ai-hints') && !enabledActions.includes('ai-hints')) {
            const relevantHint = getHintDefault();
            if (!relevantHint) {
              // open the modal to indicate that there are no more available hints
              $scope.$broadcast(IdeMsgService.msgShowNoRelevantHintModal().msg);
              return;
            }
            return await prepareHint(relevantHint);
          }

          // save the all files in project to db
          if ($scope.ace.currentNodeId !== -1) {
            // if the value is !== -1, then some tab is open
            // save the current current content of the editor to the project
            ProjectFactory.getNode($scope.ace.currentNodeId).content = $scope.ace.editor.getSession().getValue();
          }
          // save the project to db (all files)
          await ProjectFactory.saveProjectToServer();

          $scope.hintBtnTxt = 'Tipp wird geladen...';
          $scope.hintIsLoading = true;

          const hint = await getHintUsingAI();

          // in case no relevant hint was found, the hint is -1
          // so we don't to show/store the hint
          if (!hint) {
            $scope.hintBtnTxt = 'Tipp anfordern';
            $scope.hintIsLoading = false;
            return;
          }
          await prepareHint(hint, 'hintChatbot');
        } catch (err) {
          console.error('Error while asking for hint:', err);
          // fallback to default
          const relevantHint = getHintDefault();
          prepareHint(relevantHint);
        }
      };

      // function to show more chatboxes
      $scope.showMore = function () {
        $scope.hideShowMore = true;
        $scope.displayOldChatBoxes = true;
        $scope.oldHintChatLines = allChatBoxes.slice(0, -chatBoxLimit);
      };

      /**
       * init this tab by loading chat history and read tips
       */
      $scope.init = async function () {
        try {
          // load chat history
          const history = await ChatSrv.getChatHistory();
          // filter all the chatLines that are relevant for the hint tab
          const data = history.data.filter((chatLine) => chatLine.type === 'hint' || chatLine.type === 'hintChatbot');

          // add chatboxes to the list of chatboxes
          data.forEach((chatLine) => {
            addChatBoxToList(chatLine);
          });

          displayChatBoxes();

          const config = ProjectFactory.getConfig();
          if (config && 'Help' in config && 'tips' in config.Help) {
            // get all hints from codeboard.json and add property `sent` to each hint that it not get sent multiple times during runtime
            $scope.defaultHints = config.Help.tips.map((tip) => ({ ...tip, sent: false }));
            $scope.hintLimit = config.Help.tipLimit || 5;

            // check if there are remaining hints / to do: also for ai hints
            checkRemainingHints();

            // update tips sent for default hints property based on chat history
            allChatBoxes.forEach((chatLine) => {
              // get index of already sent tip
              if (chatLine.type === 'hintChatbot') {
                // if the hint is from the chatbot, we don't need to check for the index
                return;
              }
              const index = chatLine.message.tipIndex;
              // if the tip was already sent mark it as true
              if (index !== -1) {
                $scope.defaultHints[index].sent = true;
              }
            });
          }
        } catch (err) {
          console.log('Fehler beim Laden des Chatverlaufs:', err);
        }
      };

      // init the tab (gets called from ide.js when tab is not hidden)
      $scope.init();

      // this controller handels the modal which is shown when no relevant hint was found
      $scope.$on(IdeMsgService.msgShowNoRelevantHintModal().msg, function () {
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
          controller: noRelevantTipModalInstanceCtrl,
        });
      });
    },
  ]);
