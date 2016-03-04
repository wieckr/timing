(function(ng) {
  angular.module('myApp', ['ngAnimate', 'smart-table', 'ui.bootstrap', 'ngRoute'])
    .controller('mainCtrl', ['$scope', '$http', function($scope, $http, $uibModal) {

      //function getURLParameter(name) {
      //  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
      //}

      $scope.itemsByPage = 15;

      $scope.collection = [];
      $scope.origInput = [];
      $scope.displayed = [].concat($scope.collection);
      $http.get("race_name_results_2015.json").success(function(data) {

        $scope.origInput = data;
        $scope.eventName = $scope.origInput[0].raceName.replace("Results", "");
        $scope.eventCity = $scope.origInput[0].eventCity;
        $scope.eventDate = $scope.origInput[0].eventDate;

        $scope.collection = $scope.origInput[0].athletes;
        $scope.origInput = [];

        $scope.resetFilters = function() {
          //hacky at the moment, but just changes $scope.collection so the watch gets refreshed upon clicking      
          $scope.collection[0].clear = 'cleared on' + Date.now();
        }
        angular.forEach(data, function(row, key) {
          $scope.collection[key].ageGroupEdit = $scope.collection[key].ageGroup.replace(/^[0-9]+ /, "");
          $scope.collection[key].ageGroupPlace = String($scope.collection[key].ageGroup.match(/^[0-9]+/));
        });
      });
    }])


  .controller('ModalDemoCtrl', function($scope, $uibModal, $log) {

    $scope.animationsEnabled = true;

    $scope.open = function(athlete) {

      var modalInstance = $uibModal.open({
        animation: $scope.animationsEnabled,
        templateUrl: 'myModalContent1.html',
        controller: 'ModalInstanceCtrl',
        //size: size,
        resolve: {
          items: function() {
            return athlete;
          },
          eventInfo: function() {
            return [$scope.eventName, $scope.eventCity, $scope.eventDate];
          }
        }
      });
    }

  })

  .controller('ModalInstanceCtrl', function($scope, $uibModalInstance, items, eventInfo) {
      var insertItems = items;
      //insertItems.ageGroupPlace = String(items.ageGroup.match(/^[0-9]+/));
      //insertItems.ageGroupEdit = items.ageGroup.replace(/^[0-9]+ /, "");
      $scope.items = insertItems;
      $scope.eventCity = eventInfo[1];
      $scope.eventName = eventInfo[0];
      $scope.eventDate = eventInfo[2];



      $scope.close = function() {
        $uibModalInstance.close('close');
      };
    })
    .directive('stSelectDistinct', [function() {
      return {
        restrict: 'E',
        require: '^stTable',
        scope: {
          collection: '=',
          predicate: '@',
          predicateExpression: '='
        },
        template: '<select ng-model="selectedOption" ng-change="optionChanged(selectedOption)" ng-options="opt for opt in distinctItems"></select>',
        link: function(scope, element, attr, table) {
          var getPredicate = function() {
            var predicate = scope.predicate;
            if (!predicate && scope.predicateExpression) {
              predicate = scope.predicateExpression;
            }
            return predicate;
          }

          scope.$watch('collection', function(newValue) {
            var predicate = getPredicate();

            if (newValue) {
              var temp = [];
              scope.distinctItems = ['All'];

              angular.forEach(scope.collection, function(item) {
                var value = item[predicate];

                if (predicate == "ageGroup") {
                  value = value.replace(/^[0-9]+ /, "");
                }

                if (value && value.trim().length > 0 && temp.indexOf(value) === -1) {

                  temp.push(value);
                }
              });
              temp.sort();

              scope.distinctItems = scope.distinctItems.concat(temp);
              scope.selectedOption = scope.distinctItems[0];
              scope.optionChanged(scope.selectedOption);
            }
          }, true);

          scope.optionChanged = function(selectedOption) {
            var predicate = getPredicate();

            var query = {};

            query.distinct = selectedOption;

            if (query.distinct === 'All') {
              query.distinct = '';
            }
            if (predicate == "ageGroup") {
              table.search(query.distinct);
            } else {
              table.search(query, predicate);
            }
          };
        }
      }
    }])
    .directive('stRatio', function() {
      return {
        link: function(scope, element, attr) {
          var ratio = +(attr.stRatio);

          element.css('width', ratio + '%');

        }
      };
    })
    .directive('stSelectMultiple', [function() {
      return {
        restrict: 'E',
        require: '^stTable',
        scope: {
          collection: '=',
          predicate: '@',
          predicateExpression: '='
        },
        templateUrl: 'stSelectMultiple.html',
        link: function(scope, element, attr, table) {
          scope.dropdownLabel = '';
          scope.filterChanged = filterChanged;

          initialize();

          function initialize() {
            bindCollection(scope.collection);
          }

          function getPredicate() {
            var predicate = scope.predicate;
            if (!predicate && scope.predicateExpression) {
              predicate = scope.predicateExpression;
            }
            return predicate;
          }

          function getDropdownLabel() {
            var allCount = scope.distinctItems.length;

            var selected = getSelectedOptions();

            if (allCount === selected.length || selected.length === 0) {
              return 'All';
            }

            if (selected.length === 1) {
              return selected[0];
            }

            return selected.length + ' items';
          }

          function getSelectedOptions() {
            var selectedOptions = [];

            angular.forEach(scope.distinctItems, function(item) {
              if (item.selected) {
                selectedOptions.push(item.value);
              }
            });

            return selectedOptions;
          }

          function bindCollection(collection) {
            var predicate = getPredicate();
            var distinctItems = [];

            angular.forEach(collection, function(item) {
              var value = item[predicate];
              fillDistinctItems(value, distinctItems);
            });

            distinctItems.sort(function(obj, other) {
              if (obj.value > other.value) {
                return 1;
              } else if (obj.value < other.value) {
                return -1;
              }
              return 0;
            });

            scope.distinctItems = distinctItems;

            filterChanged();
          }

          function filterChanged() {
            scope.dropdownLabel = getDropdownLabel();

            var predicate = getPredicate();

            var query = {
              matchAny: {}
            };

            query.matchAny.items = getSelectedOptions();
            var numberOfItems = query.matchAny.items.length;
            if (numberOfItems === 0 || numberOfItems === scope.distinctItems.length) {
              query.matchAny.all = true;
            } else {
              query.matchAny.all = false;
            }

            table.search(query, predicate);
          }

          function fillDistinctItems(value, distinctItems) {
            if (value && value.trim().length > 0 && !findItemWithValue(distinctItems, value)) {
              distinctItems.push({
                value: value,
                selected: true
              });
            }
          }

          function findItemWithValue(collection, value) {
            var found = _.find(collection, function(item) {
              return item.value === value;
            });

            return found;
          }
        }
      }
    }])

  .directive('stNumberRange', ['$timeout', function($timeout) {
      return {
        restrict: 'E',
        require: '^stTable',
        scope: {
          lower: '=',
          higher: '='
        },
        templateUrl: 'stNumberRange.html',
        link: function(scope, element, attr, table) {
          var inputs = element.find('input');
          var inputLower = ng.element(inputs[0]);
          var inputHigher = ng.element(inputs[1]);
          var predicateName = attr.predicate;

          [inputLower, inputHigher].forEach(function(input, index) {

            input.bind('blur', function() {
              var query = {};

              if (scope.lower) {
                query.lower = scope.lower;
              }

              if (scope.higher) {
                query.higher = scope.higher;
              }

              scope.$apply(function() {
                table.search(query, predicateName)
              });
            });
          });
        }
      };
    }])
    .filter('ageGroupParse', function() {
      return function(item) {
        return item.replace(/^[0-9]+ /, '');
        //return item;
      }
    })
    .filter('uniqueq', function() {
      return function(arr, field) {
        return _.uniq(arr, function(a) {
          return a[field];
        });
      };
    })
    .filter('uniquez', function() {
      return function(input, key) {
        var unique = {};
        var uniqueList = [];

        for (var i = 0; i < input.length; i++) {

          if (typeof unique[input[i][key]] == "undefined") {
            unique[input[i][key]] = "";
            uniqueList.push(input[i]);
          }
        }
        return uniqueList;
      };
    })
    .filter('customFilter', ['$filter', function($filter) {
      var filterFilter = $filter('filter');
      var standardComparator = function standardComparator(obj, text) {
        text = ('' + text).toLowerCase();
        return ('' + obj).toLowerCase().indexOf(text) > -1;
      };

      return function customFilter(array, expression) {
        function customComparator(actual, expected) {

          var isBeforeActivated = expected.before;
          var isAfterActivated = expected.after;
          var isLower = expected.lower;
          var isHigher = expected.higher;
          var higherLimit;
          var lowerLimit;
          var itemDate;
          var queryDate;

          if (ng.isObject(expected)) {
            //exact match
            if (expected.distinct) {
              if (!actual || actual.toLowerCase() !== expected.distinct.toLowerCase()) {
                return false;
              }

              return true;
            }

            //matchAny
            if (expected.matchAny) {
              if (expected.matchAny.all) {
                return true;
              }

              if (!actual) {
                return false;
              }

              for (var i = 0; i < expected.matchAny.items.length; i++) {
                if (actual.toLowerCase() === expected.matchAny.items[i].toLowerCase()) {
                  return true;
                }
              }

              return false;
            }

            //date range
            if (expected.before || expected.after) {
              try {
                if (isBeforeActivated) {
                  higherLimit = expected.before;

                  itemDate = new Date(actual);
                  queryDate = new Date(higherLimit);

                  if (itemDate > queryDate) {
                    return false;
                  }
                }

                if (isAfterActivated) {
                  lowerLimit = expected.after;


                  itemDate = new Date(actual);
                  queryDate = new Date(lowerLimit);

                  if (itemDate < queryDate) {
                    return false;
                  }
                }

                return true;
              } catch (e) {
                return false;
              }

            } else if (isLower || isHigher) {
              //number range
              if (isLower) {
                higherLimit = expected.lower;

                if (actual > higherLimit) {
                  return false;
                }
              }

              if (isHigher) {
                lowerLimit = expected.higher;
                if (actual < lowerLimit) {
                  return false;
                }
              }

              return true;
            }
            //etc

            return true;

          }
          return standardComparator(actual, expected);
        }

        var output = filterFilter(array, expression, customComparator);
        return output;
      };
    }]);
})(angular);