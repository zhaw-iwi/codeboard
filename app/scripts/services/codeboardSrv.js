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
    // todo: this function gets called multiple times (performance?)
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

    // this function gets all current enabled actions of a project
    service.getEnabledActions = () => {
      if (ProjectFactory.hasConfig('userEnabledActions')) {
        enabledActions = ProjectFactory.getConfig().userEnabledActions;
      }

      return enabledActions;
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
      { name: 'ai-compiler', desc: 'If enabled compiler error message gets explained using chat-gpt' },
      { name: 'ai-hints', desc: 'If enabled relevant hint gets selected using chat-gpt' },
      { name: 'beautify', desc: 'Beautify button' },
      { name: 'codeReview', desc: 'The code review tab (Code-Review)' },
      { name: 'compile', desc: 'Compile button (Run)' },
      { name: 'compiler', desc: 'The compiler tab (Compiler)' },
      { name: 'edit', desc: 'Edit button' },
      { name: 'editor-settings', desc: 'The settings of the ace editor' },
      { name: 'error-chatbox', desc: 'The error-chatboxes generated by the Coding-Assistant' },
      { name: 'explanation', desc: 'The explanation tab (Erklärungen)' },
      { name: 'full-screen', desc: 'Full-screen button' },
      { name: 'home', desc: 'The home button ("Zurück zur Übersicht")' },
      { name: 'info', desc: 'The info tab (Info)' },
      { name: 'questions', desc: 'The questions tab (Fragen)' },
      { name: 'reset', desc: 'Reset button (Original wiederherstellen)' },
      { name: 'run', desc: 'Run button' },
      { name: 'sampleSolution', desc: 'The sample-solution tab (Musterlösung)' },
      { name: 'save', desc: 'Save project button' },
      { name: 'syntax-checker', desc: 'The syntax-checker which highlights errors on the left side of the editor' },
      { name: 'test', desc: 'The test tab (Test)' },
      { name: 'tips', desc: 'The tips tab (Tipps)' },
      { name: 'tree-view', desc: 'Tree-view on the left side' },
      { name: 'unredo', desc: 'Unredo button' },
      { name: 'varScope', desc: 'Variable Scope button' },
    ];
  },
]);
