/**
 * This service handle the interactions with the ace Editor
 *
 * @author Samuel Truniger
 * @date 25.04.2023
 */

'use strict';

angular.module('codeboardApp').service('AceEditorSrv', [
  '$rootScope',
  function ($rootScope) {
    var service = this;

    // Listen to the 'change' event of the Ace Editor / got the Code from the Ace Docs - https://ace.c9.io/#nav=howto
    service.aceChangeListener = function (aceEditor, callback) {
      aceEditor.on('change', function () {
        callback();
      });
    };

    // get the current code in the ace editor
    service.getInputCode = function (aceEditor) {
      var inputCode = aceEditor
        .getSession()
        .getValue()
        .replace(/ +/g, ' ')
        .replace(/\s*\;\s*$/g, ';')
        .split('\n');
      return inputCode;
    };

    // get the selected code in the ace editor
    service.getSelectedCode = function (aceEditor) {
      var selectedCode = aceEditor.getSelectedText();
      return selectedCode;
    };
  },
]);
