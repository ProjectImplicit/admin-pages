(function(angular){
    var DEBUG = true;
    var app = angular.module('myApp',['smart-table','ui.bootstrap','ui.mask','ngBootstrap']);
    var rowCollection;
    var STATUS_PENDING = 'R';

    app.controller('requestCtrl', ['$scope','$http', 'piDialog', function ($scope, $http,piDialog) {
        $scope.row = {db:'test'};
        $scope.dateRange = {
            startDate:window.moment().subtract(1,'month'),
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

            return $http.post('/implicit/DashboardData', angular.extend({action:'download'}, row))
                .success(function(){
                    $scope.row = {db:'test'}; // reset row
                    $scope.$emit('download:poll',row);
                })
                .error(function(response){
                    return piDialog({header: 'Request Download Error',content: response.msg || 'Study not found'});
                });
        }
    }]);

    app.controller('dataCtrl', ['$scope','$http', '$rootScope', 'piDialog', function ($scope, $http,$rootScope,piDialog) {
        var poll = throttle(pollServer, 5000);
        var deletedArr = []; // an array of deleted rows

        $scope.remove = removeRow;

        $rootScope.$on('download:poll', poll);
        $rootScope.$on('download:poll', function(e,row){console.log(row);$scope.rowCollection.unshift(row);}); // temporarily add row to the stack

        rowCollection = $scope.rowCollection = window.rowCollection || [];
        poll();

        function removeRow(row) {

            return piDialog({
                 header: 'Cancel Download:',
                 content: 'Are you sure you want to cancel this download? (don\'t worry we keep all the data on our servers, you will be able to download it later).',
                 allowCancel: true
            }).then(function(){
                var rowCollection = $scope.rowCollection;
                deletedArr.push(row.id);

                // remove visible row
                for (var i = 0; i < rowCollection.length; i++){
                    !isNotDeleted(rowCollection[i]) && rowCollection.splice(i, 1);
                }

                // request server side remove
                return $http.post('/implicit/DashboardData',angular.extend({action:'removeDownload'}, row));
            })
            ['catch'](function(){
                // return row to polling list
                var index = deletedArr.indexOf(row.id);
                index != -1 && deletedArr.splice(index,1);
            });


        }

        function isNotDeleted(row){
            return deletedArr.indexOf(row.id) === -1;
        }

        function pollServer(){
            return $http.post('/implicit/DashboardData',{action:'getAllDownloads'})
                .success(function(data){
                    data = data ? data.filter(isNotDeleted) : [];
                    data.forEach(function(row){
                        row.creationDate = new Date(row.creationDate);
                    });

                    // there is a pending row
                    var isPending = data.some(function(row){return row.studyStatus === STATUS_PENDING;});
	
                    // count on debounce to delay this.
                    if (isPending) {poll();}

                    $scope.rowCollection = data;
                    $scope.displayedCollection = [].concat(data);
                })
                .error(function(e){
                    if (!DEBUG){
                        throw new Error(e);
                    }
                    var data = [];
                    for (var i=0; i<10; i++){
                        data.push({
                            id: Math.random(),
                            studyId:(0|Math.random()*9e6).toString(36),
                            studyUrl:(0|Math.random()*9e6).toString(36),
                            creationDate:new Date(new Date() * Math.random()),
                            studyStatus: ['R','C','X'][Math.floor(Math.random()*3)]
                        });
                    }

                    $scope.rowCollection = data;
                    $scope.displayedCollection = [].concat(data);
                });
        }

        function throttle (callback, limit) {
            var wait = false;                 // Initially, we're not waiting
		var callLater = false;
            return function () {              // We return a throttled function
                if (!wait) {                  // If we're not waiting
                    callback.call();          // Execute users function
                    wait = true;              // Prevent future invocations
                    setTimeout(function () {  // After a period of time
                       wait = false;
			if (callLater){
				callLater = false;
				callback.call();
			}
                    }, limit || 1000);
                } else {callLater = true}
            };
        }
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
                '<p class="lead">{{content}}</p>',
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
