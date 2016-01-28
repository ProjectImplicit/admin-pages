(function(angular){
    var app = angular.module('myApp',['smart-table','ui.bootstrap','ui.mask','ngBootstrap']);
    var rowCollection;
    var STATUS_PENDING = 'R';

    app.controller('requestCtrl', ['$scope','$http', 'piDialog', '$q', function ($scope, $http,piDialog, $q) {
        $scope.loading = false;
        $scope.row = {db:'test'};
        $scope.dateRange = {
            startDate: window.moment(0),
            endDate: window.moment()
        };

        $scope.requestDownload = requestDownload;
        $scope.moment = window.moment;




        function requestDownload(row){

            if (!row.studyId){
                return piDialog({
                     header: 'Request Download:',
                     content: 'The study ID is required in order to request a download.'
                });
            }

            row = angular.extend({},row, {
                startDate: $scope.dateRange.startDate && $scope.dateRange.startDate.toISOString(),
                endDate: $scope.dateRange.endDate && $scope.dateRange.endDate.toISOString()
            });

            $scope.loading = true;
            return $http.post('/dashboard/DashboardData', angular.extend({action:'download'}, row))
                .then(function(response){
                    var data = response.data;
                    if (data && data.error){
                        return $q.reject(data);
                    }

                    $scope.$emit('download:poll',row);
                })
                ['catch'](function(data){
                    return piDialog({header: 'Request Download Error',content: data.msg || 'Study not found'});
                })
                .finally(function(){
                    $scope.loading = false;
                });
        }
    }]);

    app.controller('dataCtrl', ['$scope','$http', '$rootScope', 'piDialog', '$q', function ($scope, $http,$rootScope,piDialog, $q) {
        var poll = debounce(pollServer, 5000);
        var deletedArr = []; // an array of deleted rows

        $scope.remove = removeRow;

        $rootScope.$on('download:poll', poll);
        $rootScope.$on('download:poll', function(e,row){console.log(row);$scope.rowCollection.unshift(row);}); // temporarily add row to the stack

        rowCollection = $scope.rowCollection = window.rowCollection || [];
        pollServer();

        function removeRow(row) {

            return piDialog({
                 header: 'Delete Request:',
                 content: [
                    'Are you sure you want to delete this request from your queue?',
                    '(don\'t worry, the data will stay on our servers and you can request it again in the future)'
                ].join('</br>'),
                 allowCancel: true
            }).then(function(){
                var rowCollection = $scope.rowCollection;
                deletedArr.push(row.id);

                // remove visible row
                for (var i = 0; i < rowCollection.length; i++){
                    !isNotDeleted(rowCollection[i]) && rowCollection.splice(i, 1);
                }

                // request server side remove
                return $http.post('/dashboard/DashboardData',angular.extend({action:'removeDownload'}, row))
                    .then(function(response){
                        var data = response.data || {};
                        if (data.error){
                            return $q.reject(response);
                        }
                    });
            })
            ['catch'](function(response){
                var data = response ? response.data : {};
                // return row to polling list
                var index = deletedArr.indexOf(row.id);
                index != -1 && deletedArr.splice(index,1);
                piDialog({header:'Delete Request', content:data.msg || 'Failed to delete request.'});
            });


        }

        function isNotDeleted(row){
            return deletedArr.indexOf(row.id) === -1;
        }

        function pollServer(){
            return $http.post('/dashboard/DashboardData',{action:'getAllDownloads'})
                .then(function(response){
                    var data = response.data;
                    if (data && data.error){
                        return $q.reject(data);
                    }

                    data = data ? data.filter(isNotDeleted) : [];
                    data.forEach(function(row){
                        row.creationDate = new Date(row.creationDate);
                        row.startDate = new Date(row.startDate);
                        row.endDate = new Date(row.endDate);
                    });

                    // there is a pending row
                    var isPending = data.some(function(row){return row.studyStatus === STATUS_PENDING;});

                    // count on debounce to delay this.
                    if (isPending) {poll();}

                    $scope.rowCollection = data;
                    $scope.displayedCollection = [].concat(data);
                })
                ['catch'](function(response){
                    return piDialog({header: 'Load data',content: response.msg || 'Could not access download data'});
                });
        }

		function debounce(func, wait, immediate) {
			var timeout;
			return function() {
				var context = this, args = arguments;
				var later = function() {
					timeout = null;
					if (!immediate) {func.apply(context, args);}
				};
				var callNow = immediate && !timeout;
				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
				if (callNow) {func.apply(context, args);}
			};
		}

    }]);


    app.config(['$sceProvider', function($sceProvider){
        $sceProvider.enabled(false);
    }]);

    app.factory('piDialog', function($modal){
        var alertTmp = [
            '<div class="modal-header alert alert-danger" style="backgrsound-color:#f2dede;">',
                '<h3 class="modal-title">',
                    '<span aria-hidden="true" class="glyphicon glyphicon-exclamation-sign"></span>',
                    '{{header || "Alert!"}}',
                '</h3>',
            '</div>',
            '<div class="modal-body">',
                '<p class="lead" ng-bind-html="content"></p>',
            '</div>',
            '<div class="modal-footer">',
                '<button class="btn btn-primary" ng-click="$close(closeValue)">OK</button>',
                '<button ng-if="allowCancel" class="btn btn-default" ng-click="$dismiss(dismissValue)">Cancel</button>',
            '</div>'
        ].join('\n');

        function dialog(options){
            var modalInstance = $modal.open({
                controller: function($scope){
                    angular.extend($scope, {
                        header: options.header,
                        content: options.content,
                        closeValue: options.closeValue,
                        dismissValue: options.dismissValue,
                        allowCancel: options.allowCancel
                    });
                },
                animation: true,
                template: alertTmp
            });

            return modalInstance.result;
        }

        return dialog;
    });

})(angular);
