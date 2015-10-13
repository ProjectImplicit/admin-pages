(function(angular){
    var DEBUG = true;
    var app = angular.module('myApp',['smart-table','ui.bootstrap','ui.mask']);
    var rowCollection;

    app.controller('requestCtrl', ['$scope','$http', 'piDialog', function ($scope, $http,piDialog) {
        $scope.row = {db:'test'};

        $scope.requestDownload = requestDownload;

        function requestDownload(row){
            if (!row.studyId){
                return piDialog({
                     header: 'Request Download:',
                     content: 'The study ID is required in order to request a download.'
                });
            }

            return $http.post('/implicit/DashboardData', angular.extend({action:'download'}, row))
                .success(function(){
                    $scope.row = {db:'test'}; // reset row
                    $scope.$emit('download:poll');
                })
                .error(function(response){
                    return piDialog({header: 'Request Download Error',content: response.msg || 'Study not found'});
                });
        }

    }]);

    app.controller('dataCtrl', ['$scope','$http', '$rootScope', function ($scope, $http,$rootScope) {
        var poll = throttle(pollServer, 5000);

        $rootScope.$on('download:poll', poll);
        rowCollection = $scope.rowCollection = window.rowCollection || [];
        poll();

        function pollServer(){
            return $http.post('/implicit/DashboardData',{action:'getAllDownloads'})
                .success(function(data){
                    data = data ? data : [];
                    data.forEach(function(row){
                        row.creationDate = new Date(row.creationDate);
                    });

                    var pending = data.some(function(row){return row.Status === 'P';});
                    // count on the debounce to delay this.
                    if (pending) {pollServer();}

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
            return function () {              // We return a throttled function
                if (!wait) {                  // If we're not waiting
                    callback.call();          // Execute users function
                    wait = true;              // Prevent future invocations
                    setTimeout(function () {  // After a period of time
                        wait = false;         // And allow future invocations
                    }, limit);
                }
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