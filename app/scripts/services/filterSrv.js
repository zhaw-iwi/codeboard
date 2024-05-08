/**
 * This service handles filtering of courses/projects/images
 *
 * @author Samuel Truniger
 */

"use strict";

angular.module("codeboardApp").service("FilterSrv", [
  "$rootScope",
  function ($rootScope) {
    var service = this;
    var filters = {
      searchTxt: "",
      sortByName: false,
      sortByCreatedAt: false,
    };
    var dataSet = {};
    var id = null;
    var filteredElements = {};

    var applyFilters = function () {
      let result = [...dataSet];

      // SEARCH FILTER (INPUT)
      if (filters.searchTxt) {
        result = result.filter((e) => {
          var txt = filters.searchTxt.toLowerCase();
          return (
            (e.projectname && e.projectname.toLowerCase().includes(txt)) ||
            (e.id && e.id.toString().includes(txt)) ||
            (e.coursename && e.coursename.toLowerCase().includes(txt)) ||
            (e.imgName && e.imgName.toLowerCase().includes(txt))
          );
        });
      }

      // SORT BY NAME FILTER
      if (filters.sortByName) {
        result.sort((a, b) => {
          return (
            (a.projectname && a.projectname.localeCompare(b.projectname)) ||
            (a.coursename && a.coursename.localeCompare(b.coursename)) ||
            (a.imgName && a.imgName.localeCompare(b.imgName))
          );
        });
      }

      // SORT BY CREATEDAT FILTER
      if (filters.sortByCreatedAt) {
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      filteredElements = result;
    };

    service.filter = function (data) {
      dataSet = data.ownerSet || data.imgSet;
      id = data.id || null;
      switch (data.filter) {
        case "input":
          filters.searchTxt = data.searchTxt;
          break;
        case "name":
          filters.sortByName = true;
          filters.sortByCreatedAt = false;
          break;
        case "createdAt":
          filters.sortByCreatedAt = true;
          filters.sortByName = false;
          break;
        case "reset":
          filters = {
            searchTxt: "",
            sortByName: false,
            sortByCreatedAt: false,
          };
          break;
      }
      applyFilters();
      return filteredElements;
    };
  }
]);
