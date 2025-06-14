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
      // the following variable tracks the number of hints that are still available
      // it does not take into account the request limit for the AI hints
      // and if there are any default hints available
      $scope.remainingHints = 0;
      $scope.disableHintBtn = true;
      $scope.hintInfoChatBoxTxt = UITexts.HINT_INFO;
      $scope.newestHintChatLines = [];
      $scope.oldHintChatLines = [];
      $scope.oldChatBoxes = false;
      $scope.displayOldChatBoxes = false;
      $scope.hideShowMore = false;
      $scope.avatarStyle = 'neutral';

      // other variables
      const avatarName = 'Roby';
      const chatBoxLimit = 1;
      const allChatBoxes = [];
      var hintLimit = 0;
      var remainingDefaultHints = 0;
      var defaultHints = [];

      /*
       * function to check wheter ai hints are disabled or enabled
       */
      const areAIHintsEnabled = () => {
        if (!CodeboardSrv.checkDisabledActions('ai-hints') || CodeboardSrv.checkEnabledActions('ai-hints')) {
          return true;
        }
        return false;
      };

      /**
       * function to handle the case when the user has reached the request limit
       */
      const handleLimitExceeded = function () {
        $scope.hintBtnTxt = 'Tipp anfordern';
        $scope.disableHintBtn = true;
        $scope.hintInfoChatBoxTxt = UITexts.HINT_LIMIT_EXCEEDED;
        $scope.remainingHints = 0;
        $scope.avatarStyle = 'worried';
        $timeout(function () {}, 0);
      };

      /**
       * Checks if there are remaining hints and disables the hint button if not
       */
      const isSentHintLimitReached = function () {
        const numHintsSent = allChatBoxes.length;
        // display the number of hints that are still available
        // this is not related to the request limit for the AI hints
        // just to show the number of hints that can theoretically be sent in the UI
        if (areAIHintsEnabled()) {
          $scope.remainingHints = hintLimit - numHintsSent;
        } else {
          $scope.remainingHints = remainingDefaultHints;
        }

        // case when the user has reached the limit set in the config
        if ($scope.remainingHints <= 0) {
          $scope.disableHintBtn = true;
          handleLimitExceeded();
        } else {
          $scope.disableHintBtn = false;
          $scope.hintInfoChatBoxTxt = UITexts.HINT_INFO;
        }
      };

      /**
       * Checks if the user has reached the request limit
       * and all default hints are already sent
       */
      const isReqLimitReached = function () {
        // if the ai-hints are enabled, we check if the user has reached the request limit
        // and if all default hints are already sent
        if (areAIHintsEnabled()) {
          const reqLimitReached = $scope.isRequestLimitReached();
          if (reqLimitReached && remainingDefaultHints <= 0) {
            // disable the button and show a message
            handleLimitExceeded();
            return;
          }
        } else {
          // if the ai-hints are disabled, we check if the user has reached the request limit
          // and if all default hints are already sent
          if (remainingDefaultHints <= 0) {
            handleLimitExceeded();
            return;
          }
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
      const displayNewestHint = function () {
        // remove the last chatboxes from the list (newest)
        $scope.newestHintChatLines = allChatBoxes.slice(-chatBoxLimit);

        // if there are multiple chatBoxes show the showMore Button
        if (allChatBoxes.length - chatBoxLimit > 1) {
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
        let hintDefault = {};
        // loop trough each tip in defaultHints (from codeboard.json)
        for (let i = 0; i < defaultHints.length; i++) {
          // get the first tip which was not already sent
          let hint = defaultHints[i];
          if (!hint.sent) {
            hintDefault.data = hint;
            hintDefault.type = 'default';

            // decrement the number of remaining hints
            remainingDefaultHints--;
            return hintDefault;
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
          let hint = {};

          // fetch the relevant hint
          const res = await AISrv.askForRelevantTip($routeParams.courseId, $routeParams.projectId);
          const remainingRequests = res.remainingRequests;
          hint.data = res.answer;

          // if the request limit is reached, we inform ide.js about that
          // we don't have to disable the button here, because there could still be
          // some default hints available
          if (remainingRequests <= 0) {
            // indicate in ide.js that the request limit is reached
            $scope.setRequestLimitReached();
          }

          if (hint.data) {
            hint.type = 'hintChatbot';
            // otherwise return the new hint
            return hint;
          }
        } catch (err) {
          // handle error if request limit is reached
          if (err.status === 429 && err.data.limitExceeded) {
            return getHintDefault();
          }

          // other errors
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

          let chatBox = null;
          // store chatbox in the db
          if (type === 'default') {
            // get index of the tip to store it in db
            let tipIndex = defaultHints.findIndex((defaultHint) => defaultHint.name === hint.name);
            // set sent property to true if multiple tips are requested in one session so that not the same tip is sent multiple times
            defaultHints[tipIndex].sent = true;

            chatBox = await ChatSrv.addChatLineCard(
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
            chatBox = await ChatSrv.addChatLineCard(hint, 'AI-Tipp', 'tip', null, null, avatarName);
          }

          addChatBoxToList(chatBox);

          // display the new hint in the view
          displayNewestHint();

          // update the view to indicate the number of hints that are still available
          isSentHintLimitReached();

          // check if the user has any default hints remaining
          // and if the request limit is reached
          isReqLimitReached();
        } catch (err) {
          console.error('Error while preparing hint:', err);
        }
      };

      /**
       * this function gets called when a student triggers the "Tipp anfordern" button
       */
      $scope.askForTip = async function () {
        try {
          // --- DEFAULT HINTS ---
          // check wheter to use ai to generate next hint or default process (order)
          if (!areAIHintsEnabled() || ($scope.isRequestLimitReached() && remainingDefaultHints > 0)) {
            const relevantHint = getHintDefault();
            // if the hint is null, all default hints are already sent
            if (!relevantHint) {
              handleLimitExceeded();
              return;
            }
            return await prepareHint(relevantHint.data, 'default');
          }

          // --- AI HINTS ---
          if ($scope.isRequestLimitReached() && remainingDefaultHints <= 0) {
            // if the request limit is reached and all default hints are already sent
            handleLimitExceeded();
            return;
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

          // hint can have the following data:
          // response from the LLM
          //  > "-1" if the llm did not find a relevant hint
          //  > "null" if the request limit is reached and all default hints are already sent
          const hint = await getHintUsingAI();

          // if the hint is null, all default hints are already
          // sent and the request limit is reached
          if (!hint) {
            handleLimitExceeded();
            return;
          }

          // in case no relevant hint was found, the hint is -1
          // so we don't to show/store the hint
          if (hint.data === -1) {
            // open the modal to indicate that there was no relevant hint for the students solution
            $scope.$broadcast(IdeMsgService.msgShowNoRelevantHintModal().msg);
            $scope.hintBtnTxt = 'Tipp anfordern';
            $scope.hintIsLoading = false;

            // check if the request limit is reached after a "-1" response
            isReqLimitReached();
            return;
          }

          await prepareHint(hint.data, hint.type);
        } catch (err) {
          console.error('Error while asking for hint:', err);
          // fallback to default
          const relevantHint = getHintDefault();
          if (!relevantHint) {
            handleLimitExceeded();
            return;
          }
          prepareHint(relevantHint.data, 'default');
        }
      };

      // function to show more chatboxes
      $scope.showMore = function () {
        $scope.hideShowMore = true;
        $scope.displayOldChatBoxes = true;
        $scope.oldHintChatLines = allChatBoxes.slice(0, -chatBoxLimit);
      };

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

      // this event is triggered in the following case:
      // user is in a different tab and uses an ai service which results in no remaining requests
      // when the user then switches to this tab, we emit an event to show that the limit is reached
      // but only if the user has also no default hints available
      $scope.$on(IdeMsgService.msgRequestLimitReached().msg, function () {
        if (remainingDefaultHints <= 0) {
          handleLimitExceeded();
        }
      });

      /**
       * init this tab by loading chat history and read tips
       */
      $scope.init = async function () {
        try {
          // load chat history
          const history = await ChatSrv.getChatHistory();
          // filter all the chatLines that are relevant for the hint tab
          const data = history.data.filter((chatLine) => chatLine.type === 'hint' || chatLine.type === 'hintChatbot');

          if (data.length > 0) {
            // add chatboxes to the list of chatboxes if there are any
            data.forEach((chatLine) => {
              addChatBoxToList(chatLine);
            });

            // display the newest hint in the view
            displayNewestHint();
          }

          // get the config (codeboard.json) and read the default hints
          // from the config
          const config = ProjectFactory.getConfig();
          if (config && 'Help' in config && 'tips' in config.Help) {
            // get all hints from codeboard.json and add property `sent` to each hint that it not get sent multiple times during runtime
            defaultHints = config.Help.tips.map((tip) => ({ ...tip, sent: false }));
            hintLimit = config.Help.tipLimit || 5; // get the limit from codeboard.json

            // update tips sent for default hints property based on chat history
            // only if there are any chatLines in the history
            if (data.length > 0) {
              allChatBoxes.forEach((chatLine) => {
                // get index of already sent tip
                if (chatLine.type === 'hintChatbot') {
                  // if the hint is from the chatbot, we don't need to check for the index
                  return;
                }

                // the index is set in the chatLIne when the hint was sent in a previous/current session
                // we store the index to not send the same hint multiple times
                // hints are stored in an array in codeboard.json
                const tipIndex = chatLine.message.tipIndex;
                // if the tip was already sent mark it as true
                if (
                  tipIndex >= 0 &&
                  tipIndex < defaultHints.length &&
                  defaultHints[tipIndex] !== undefined &&
                  defaultHints[tipIndex].name === chatLine.message.cardHeader
                ) {
                  defaultHints[tipIndex].sent = true;
                } else {
                  console.log(
                    `Skipping invalid or outdated tipIndex (${tipIndex}) from chatLine`,
                    chatLine.message
                  );
                }
              });
            }
            // count the number of hints that are still available
            remainingDefaultHints = defaultHints.filter((hint) => !hint.sent).length;

            // update the view to indicate the number of hints that are still available
            // and to check if the limit set in the config is reached
            isSentHintLimitReached();
          }

          //  --- REQUEST LIMIT CHECK ---
          isReqLimitReached();
        } catch (err) {
          console.log('Fehler beim Laden des Chatverlaufs:', err);
        }
      };

      // init the tab (gets called from ide.js when tab is not hidden)
      $scope.init();
    },
  ]);
