'use strict';

/**
 *
 * @author Samuel Truniger
 * This controller handles the functionality regarding displaying all projects of a given course.
 */
angular.module('codeboardApp').controller('courseProjectsCtrl', [
  '$scope',
  '$route',
  'courseProjects',
  'UserSrv',
  'FilterSrv',
  function ($scope, $route, courseProjects, UserSrv, FilterSrv) {
    // courseProjects is fetched in app.js when the url /users/:username/courses/:courseId/projects is accessed
    $scope.courseId = '';
    $scope.courseProjects = '';
    $scope.username = $route.current.params.username;

    $scope.courseId = courseProjects.id;
    $scope.courseName = courseProjects.coursename;
    $scope.courseProjects = courseProjects.projectSet;
    $scope.filteredCourseProjects = courseProjects.projectSet;

    // used to make project config available
    $scope.currentUserIsSelf = UserSrv.isAuthenticated() && $scope.username === UserSrv.getUsername();

    // this filter function handles the filtering of both the projects and the courses
    $scope.searchTxt = '';
    $scope.filter = function (filter) {
      if (filter === 'reset') {
        $scope.searchTxt = '';
        $scope.filteredCourseProjects = $scope.courseProjects;
      }

      let data = {
        filter: filter,
        ownerSet: $scope.courseProjects,
        searchTxt: $scope.searchTxt,
      };

      $scope.filteredCourseProjects = FilterSrv.filter(data);
    };
  },
]);
