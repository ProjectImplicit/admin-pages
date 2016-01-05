(function(angular){
    var STATUS_STOPPED = 'S';
    var STATUS_PAUSED = 'P';
    var STATUS_RUNNING = 'R';
    var DEBUG = true;

    var app = angular.module('myApp',['smart-table','ui.bootstrap','ui.mask']);
    var rowCollection;

    /**
     * Initiate data
     */
    app.controller('dataCtrl', ['$scope','$http', function ($scope, $http) {

    	rowCollection = $scope.rowCollection = window.rowCollection || [];

        $http.post('/implicit/StudyData',{action:'getAllPoolStudies'})
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
                        studyUrl:(0|Math.random()*9e6).toString(36),
                        rulesUrl:(0|Math.random()*9e6).toString(36),
                        creationDate:new Date(new Date() * Math.random()),
                        studyStatus: Math.random()>0.5?'R':'P'
                    });
                }

                $scope.rowCollection = data;
                $scope.displayedCollection = [].concat(data);
            });
    }]);

    /**
     * Table controller
     * Responsible for the remove/play/pause functions
     */
    app.controller('tableCtrl', tableCtrl);
    function tableCtrl($scope, $http, piDialog){
        $scope.remove = remove;
        $scope.pause = pause;
        $scope.play = play;

        function remove(row) {
        	piDialog({
        		 header: 'Remove study:',
        		 content: 'Are you sure you want to remove "' + row.studyId +'"?',
        		 allowCancel: true
        	}).then(function(){
	        	return updateRow(row, STATUS_STOPPED);
        	})
            .then(function(){
                var index = $scope.rowCollection.indexOf(row);
                if (index !== -1) {
                    $scope.rowCollection.splice(index, 1);
                }
            });
        }

        function pause(row) {
            piDialog({
                 header: 'Pause study:',
                 content: 'Are you sure you want to pause "' + row.studyId +'"?',
                 allowCancel: true
            }).then(function(){
                return updateRow(row, STATUS_PAUSED);
            });
        }

        function play(row) {
            piDialog({
                 header: 'Continue study:',
                 content: 'Are you sure you want to continue "' + row.studyId +'"?',
                 allowCancel: true
            }).then(function(){
                return updateRow(row, STATUS_RUNNING);
            });
        }

        function updateRow(row, targetStatus){
        	row.newStatus = targetStatus;
            row.$pending = true;

            return $http
            	// update rules table
                .post('/implicit/StudyData',angular.extend({action:'updateRulesTable'},row))
                // on success
                .success(function(response){
                    row.studyStatus = targetStatus;
                    row.$pending = false;
                })
                .error(function(response, status){
                	row.$pending = false;

                    if (status === 403){
                        return piDialog({header: 'Forbidden action',content: 'You do not have permission to make this change.'});
                    } else {
                        return piDialog({header: 'Update error!',content: 'An error occurred on our servers, please contact your web administrator.'});
                    }
                });
        }
    }

    /**
     * Add study
     */
    app.controller('addStudyCtrl', addStudyCtrl);
    function addStudyCtrl($scope, $http, $q, $modal, piDialog){
    	// setup an empty row
    	$scope.row = {};

    	$scope.add = add;

        function add(){
            var modal = $modal.open({
                templateUrl: 'addPoolStudy.jst',
                controller: function($scope){
                    // these are left here in case we want to reimplement autocomplete
                    $scope.ruleArr = [];
                    $scope.pauseArr = [];

                    $scope.study = {
                        rulesUrl: $scope.ruleArr[0],
                        pauseUrl: $scope.pauseArr[0]
                    };

                    $scope.submit = function(){
                        $scope.submitted = true;

                        if ($scope.studyForm.$invalid) {
                            return false;
                        } else {
                            $scope.pending = true;
                            postAdd($scope.study)
                                .then(function(response){
                                    response && response.success && $scope.$close();
                                })
                                ['finally'](function(){
                                    $scope.pending = false;
                                });
                        }
                    };
                }
            }); // found in the html

            return modal.result;
        }

    	function postAdd(row){

            var studyId;

			$scope.pending = true;

            row.creationDate = new Date();
            row.studyStatus = STATUS_RUNNING;

            return $http.post('/implicit/StudyData', angular.extend({action:'getStudyId'},row))
                .then(function(response){
                    var data = response.data;
                    studyId = data.studyId;

                    if (!data || data.error){
                        return piDialog({
                            header: 'Add study error!',
                            content: 'There was a problem retrieving the study ID, please make sure that it is set correctly in your expt file.',
                            forceCancel: true
                        });
                    } else {
                        return piDialog({
                            header: 'Confirm study ID:',
                            content: 'Please make sure that this is the correct study ID: "' + studyId +'".',
                            type: 'info',
                            allowCancel: true
                        });
                    }
                })
                .then(function(){
                    return $http.post('/implicit/StudyData', angular.extend({action:'insertRulesTable'},row));
                })
    			.then(function(response){
                    var data = response.data;
                    switch (data.error){
                        case 1 : return piDialog({header: 'Duplicate record', content: 'The ID "' + studyId + '" Already exists.', forceCancel:true});
                        case 2 : return piDialog({header: 'Missing study', content: 'The study at "' + row.studyUrl + '" could not be found.', forceCancel:true});
                        case 3 : return piDialog({header: 'Missing rule file', content: 'The rule file at "' + row.rulesUrl + '" could not be found.', forceCancel:true});
                        case 4 : return piDialog({header: 'Missing rule file', content: 'The file at "' + row.rulesUrl + '" does not fit the "research" schema.', forceCancel:true});
                        case 5 : return piDialog({header: 'Error updating production pool', content: 'Please refresh manually or contact Andy. This error is caused when the research pool DB is correctly updated, but dev2 is unable to notify the prod servers of the change.', forceCancel:true});
                    }

                    row.studyId = studyId;

                    $scope.displayedCollection.unshift(row);
    				$scope.rowCollection.push(row);
    				$scope.row = {};

                    return {success:true};
    			})
                ['catch'](function(response){
                    if (response && response.status === 403){
                    	return piDialog({header: 'Forbidden action',content: 'You do not have permission to make this change.', forceCancel:true});
                    }

                    if (response && response.status != 200){
                        return piDialog({header: 'Add error!', content: 'An error occurred on our servers, please contact your web administrator.', forceCancel:true});
                    }
    			})
    			['finally'](function(response){
		    		$scope.pending = false;
                    return response;
		    	});
    	}
    }

    app.factory('piDialog', function($modal){
    	var alertTmp = [
			'<div class="modal-header alert alert-{{type}}" style="backgrsound-color:#f2dede;">',
	            '<h3 class="modal-title">',
	            	'<span aria-hidden="true" class="glyphicon glyphicon-exclamation-sign"></span>',
		            '{{header || "Alert!"}}',
	            '</h3>',
	        '</div>',
	        '<div class="modal-body">',
	        	'<p class="lead">{{content}}</p>',
	        '</div>',
	        '<div class="modal-footer">',
	            '<button ng-if="!forceCancel" class="btn btn-primary" ng-click="$close(closeValue)">OK</button>',
	            '<button ng-if="allowCancel || forceCancel" class="btn btn-default" ng-click="$dismiss(dismissValue)">Close</button>',
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
						allowCancel: options.allowCancel,
                        forceCancel: options.forceCancel,
                        type: options.type || 'danger'
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