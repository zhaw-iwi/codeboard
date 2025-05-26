/**
 * This is the controller for the navBarTab "Compiler".
 *
 * @author Samuel Truniger
 * @date 11.09.2024
 */

'use strict';

angular
  .module('codeboardApp')

  /**
   * Controller for the compiler tab
   */
  .controller('ideNavBarRightCompilerCtrl', [
    '$scope',
    '$timeout',
    'IdeMsgService',
    'AceEditorSrv',
    'UITexts',
    function ($scope, $timeout, IdeMsgService, AceEditorSrv, UITexts) {
      // scope variables
      $scope.compilerChatLines = [];
      $scope.compInfoChatBoxTxt = UITexts.COMPILER_INFO;
      $scope.compLoadingChatBoxTxt = UITexts.COMPILER_LOADING;
      $scope.showCompilerInfoMessage = false;
      $scope.showNoCompilationErrorMessage = false;
      $scope.showCompilationErrorMessage = false;

      // function gets called when there is a change in the aceEditor
      AceEditorSrv.aceChangeListener($scope.ace.editor, function () {
        $scope.compInfoChatBoxTxt = UITexts.COMPILER_CODE_CHANGED;
        $scope.showCompilerInfoMessage = true;
        $scope.showNoCompilationErrorMessage = false;
        $scope.showCompilationErrorMessage = false;
      });

      let lastCompilerChatboxIndex = -1;
      /**
       * Message that is emitted when a new message (compiler error due to compilation/testing) should be added to the help tab.
       */
      $scope.$on(IdeMsgService.msgAddHelpMessage().msg, function (event, data) {
        $scope.showCompilerInfoMessage = false;
        $scope.showCompilationErrorMessage = true;
        $scope.compInfoChatBoxTxt = UITexts.COMPILER_ERROR;

        let chatline = {
          type: data.type,
          message: data.msg,
          author: data.sender,
          avatar: data.avatar,
        };

        // add the new chatbox to the array to display it in the compiler tab
        $scope.compilerChatLines.push(chatline);

        // find the new last compilation error chatbox index
        $scope.compilerChatLines.forEach((chatLine, index) => {
          $scope.showNoCompilationErrorMessage = false;
          lastCompilerChatboxIndex = index;
        });
      });

      // gets called when a new compilation is started or finished with no errors to remove the last displayed chatbox
      $scope.$on(IdeMsgService.msgRemoveChatLine().msg, function (event, data) {
        // remove last compilation error chatbox
        if (data.type === 'error') {
          if (lastCompilerChatboxIndex !== -1) {
            $scope.compilerChatLines.splice(lastCompilerChatboxIndex, 1);
          }
        } else if (data.type === 'noError') {
          $scope.showCompilerInfoMessage = false;
          $scope.showNoCompilationErrorMessage = true;
          $scope.showCompilationErrorMessage = false;
          $scope.compInfoChatBoxTxt = UITexts.COMPILER_SUCCESS;

          // use $timeout to ensure that code to runs after the current digest cycle finishes (without that view does not get updated correctly)
          $timeout(() => {
            if (lastCompilerChatboxIndex !== -1) {
              $scope.compilerChatLines.splice(lastCompilerChatboxIndex, 1);
              lastCompilerChatboxIndex = -1;
            }
          });
        }
      });

      /**
       * This method is bound to the chatLine rating directive.
       * When the message is rated this method calls the chatService to
       * send the rating to the api.
       * @param messageId
       * @param rating
       */
      $scope.onMessageRating = function (messageId, rating) {
        console.log('Message rated');
        // ChatSrv.rateCompilationErrorMessage(messageId, rating).then(function () {
        // });
      };
    },
  ]);
