(function(angular){
    var DEBUG = false;
    var app = angular.module('myApp',['smart-table','ui.mask']);

    app.controller('dataCtrl', ['$scope','$http', function ($scope, $http) {
        $scope.rowCollection = [];

        $http.post('/implicit/StudyData',{action:'getLast100PoolUpdates'})
            .success(function(data){
                data = data ? data : [];
                data.forEach(function(row){
                    row.creationDate = new Date(row.creationDate);
                });

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
                        updaterId:(0|Math.random()*9e6).toString(36),
                        creationDate:new Date(new Date() * Math.random()),
                        newStatus: ['R','P','S'][Math.floor(Math.random()*3)]
                    });
                }

                $scope.rowCollection = data;
                $scope.displayedCollection = [].concat(data);
            });


    }]);
})(angular);