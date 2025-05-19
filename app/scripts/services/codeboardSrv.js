/**
 * This service allows access to various variables within the project.
 *
 * @author Samuel Truniger
 */

angular.module('codeboardApp').service('CodeboardSrv', [
  'ProjectFactory',
  function (ProjectFactory) {
    var service = this;
    var enabledActions = [];
    var variableMap = {};
    var currentFile;

    // this function gets all current disabledActions
    // those actions can be set in the following places:
    // - course settings
    // - codeboard.json
    service.getDisabledActions = () => {
      let disabledActions = [];
      // check for disabled action in the context of a course
      let courseData = ProjectFactory.getProject().courseData;
      if (typeof courseData !== 'undefined' && courseData.hasOwnProperty('courseOptions')) {
        let courseUserDisabledActions = courseData.courseOptions.find((o) => o.option === 'userDisabledActions');
        if (typeof courseUserDisabledActions !== 'undefined') {
          disabledActions = disabledActions.concat(courseUserDisabledActions.value.split('|'));
        }
      }

      // check for disabled actions in the context of a project
      if (ProjectFactory.hasConfig('userDisabledActions')) {
        disabledActions = disabledActions.concat(ProjectFactory.getConfig().userDisabledActions);
      }

      return disabledActions;
    };

    // this functions checks if an action is disabled (in course settings / codeboard.json)
    service.checkDisabledActions = (action) => {
      let disabledActions = service.getDisabledActions();
      if (disabledActions.includes(action)) {
        return true;
      }
      return false;
    };

    // this function gets all current enabled actions of a project
    // those actions are set in the codeboard.json
    // Example: if a action is disabled in the course settings, but enabled in the codeboard.json
    // the action is enabled in the project
    service.getEnabledActions = () => {
      if (ProjectFactory.hasConfig('userEnabledActions')) {
        enabledActions = ProjectFactory.getConfig().userEnabledActions;
      }

      return enabledActions;
    };

    // this function checks if an action is enabled (in codeboard.json)
    service.checkEnabledActions = (action) => {
      let enabledActions = service.getEnabledActions();
      if (enabledActions.includes(action)) {
        return true;
      }
      return false;
    };

    // function which returns the variableMap needed for the IdeCtrl
    service.getVariableMap = function () {
      return variableMap;
    };

    // function which sets the variableMap based on the result of the ideNavBarRightCodingAssistantCtrl
    service.setVariableMap = function (newVariableMap) {
      variableMap = newVariableMap;
    };

    // function which returns the current opened file
    service.getFile = function () {
      return currentFile;
    };

    // function which sets the current opened file
    service.setFile = function (file) {
      currentFile = file;
    };

    // available disabled actions (can be set in "new course" / "course settings")
    service.actions = [
      { name: 'ai-compiler', desc: 'If enabled compiler error message gets explained using chatgpt' },
      { name: 'ai-hints', desc: 'If enabled relevant hint gets selected using chat-gpt' },
      { name: 'ai-qa', desc: 'If enabled the question gets answered using chat-gpt' },
      { name: 'beautify', desc: 'If enabled the beautify button is available in the IDE' },
      { name: 'codeReview', desc: 'If enabled the code is reviews by chatgpt after a successful submission' },
      { name: 'compile', desc: 'If enabled the run-button is available in the IDE' },
      { name: 'compiler', desc: 'If enabled the compiler-tab is available in the IDE' },
      { name: 'edit', desc: 'Edit button' },
      { name: 'editor-settings', desc: 'If enabled the settings-button is available in the IDE' },
      { name: 'explanation', desc: 'If enabled the coding-assistant tab is available in the IDE' },
      { name: 'full-screen', desc: 'If enabled the full-screen button is available in the IDE' },
      { name: 'home', desc: 'If enabled the home-button ("Zurück zur Übersicht") is available in the IDE' },
      { name: 'info', desc: 'If enabled the info tab is available in the IDE' },
      { name: 'lecturer-qa', desc: 'If enabled the questions are answered by the lecturer' },
      { name: 'reset', desc: 'If enabled the reset button (Original wiederherstellen) is available in the IDE' },
      { name: 'run', desc: 'If enabled the run-button is available in the IDE' },
      { name: 'sampleSolution', desc: 'If enabled the sample-solution tab is available in the IDE' },
      { name: 'save', desc: 'If enabled the save project button is available in the IDE' },
      {
        name: 'syntax-checker',
        desc: 'If enabled the syntax-checker which highlights errors on the left side of the editor is available in the IDE',
      },
      { name: 'test', desc: 'If enabled the test tab is available in the IDE' },
      { name: 'tips', desc: 'If enabled the tips tab is available in the IDE' },
      { name: 'tree-view', desc: 'If enabled the tree-view on the left side is available in the IDE' },
      { name: 'unredo', desc: 'If enabled the unredo button is available in the IDE' },
      { name: 'varScope', desc: 'If enabled the variable scope button is available in the IDE' },
    ];
  },
]);
