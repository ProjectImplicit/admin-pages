(function(angular){
	var app = angular.module('myApp');

    app.filter('stCustomFilter', function($filter){
        return function(arr, predicateObject){
            var globalFilter = $filter('filter');
            var result;

            result = arr.filter(function(row){
                var predicate = predicateObject.creationDate || {};
                return betweenDateFilter(row.creationDate, predicate.afterDate, predicate.beforeDate);
            });

            result = globalFilter(result, predicateObject.$);

            return result;

            function betweenDateFilter(date, after, before){
                date = new Date(date);
                after = new Date(after);
                before = new Date(before);

                // if the date is bad
                if (isNaN(date)){
                    return false;
                }

                if (!isNaN(after) && after > date){
                    return false;
                }

                if (!isNaN(before) && before < date){
                    return false;
                }

                return true;
            }
        };
    });

    app.directive('stBetweenDates', function(){
        return {
            require: ['^stTable'],
            link: function(scope, element, attr, ctrl){
                var column = attr.stBetweenDates;
                var table = ctrl[0];
                scope.$watch('beforeDate', search);
                scope.$watch('afterDate', search);

                function search(){
                    table.search({beforeDate:scope.beforeDate, afterDate:scope.afterDate},column);
                }
            }
        };
    });
})(angular)