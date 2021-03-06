/**
 * Authors: Diego Ceresuela, Raúl Piracés and Luis Jesús Pellicer.
 * Date: 16-05-2016
 * Name file: statistics.js
 * Description: This file contains functions to generate twitter graphs (of system user, all accounts).
 */
'use strict';

angular.module('myApp.statistics', ['ngRoute','chart.js','angularSpinners'])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/statistics', {
            templateUrl: 'statistics/statistics.html',
            controller: 'statisticsCtrl',
            controllerAs: 'stats'
        });
    }])

    .controller('statisticsCtrl', statisticsCtrl);

statisticsCtrl.$inject = ['$http', '$scope', 'authentication', '$location', 'errorsService', 'spinnerService'];

/**
 * Main function of the controller. Generates multiple graphs/statistics of current status of twitter accounts.
 * @param $http
 * @param authentication
 * @param $location
 * @param errorsService
 * @param spinnerService
 */
function statisticsCtrl($http, $scope, authentication, $location, errorsService, spinnerService) {

    var vm = this;

    // Bar chart 1
    vm.labels = [];
    vm.array1 = [];
    vm.array2 = [];
    vm.data = [vm.array1, vm.array2];
    vm.series = ['Tweets in app', 'Total Tweets'];
    // Doughnut chart 1
    vm.labels1 = ["Tweets by App", "Total Tweets"];
    vm.data1 = [];
    // Bar chart 2
    vm.labels2 = [];
    vm.array11 = [];
    vm.array22 = [];
    vm.data2 = [vm.array11, vm.array22];
    vm.series2 = ['Followers', 'Following'];
    // Doughnut chart 2
    vm.labels3 = ["Mentions", "Tweets"];
    vm.data3 = [1, 1];
    vm.tweets = 1;
    vm.mentions = 1;
    // Twitter accounts
    vm.accounts = null;
    $scope.averages = [];
    // Line plot 1
    $scope.labels3 = [];
    $scope.series3 = [];
    $scope.data3 = [];
    // Pie chart 1
    $scope.labels4 = [];
    $scope.data4 = [];
    vm.accountsCount = 0;
    vm.count = 0;
    vm.count2 = 0;
    vm.partialContent = [];
    vm.array=[];

    lastDays();

    // Gets the label of last eight days
    function lastDays() {
        for (var i=7; i>=0; i--) {
            var d = new Date();
            d.setDate(d.getDate() - i);
            $scope.labels3.push(d.getDate()+'/'+d.getMonth());
        }
    }

    // Array prototipe for removing duplicates in an array
    Array.prototype.getUnique = function(){
        var u = {}, a = [];
        for(var i = 0, l = this.length; i < l; ++i){
            if(u.hasOwnProperty(this[i])) {
                continue;
            }
            a.push(this[i]);
            u[this[i]] = 1;
        }
        return a;
    };

    // Checks if user is loggged in
    if (!authentication.isLoggedIn()) {
        errorsService.errorCode = 401;
        errorsService.errorMessage = "Unauthorized operation.";
        $location.path('errors');
    }

    // Gets user info
    $http.get('/users/' + authentication.getId(), {
        headers: {
            'Authorization': 'Bearer ' + authentication.getToken()
        }
    }).error(function (data, status, headers, config) {
        console.log("GET users error");
        errorsService.errorCode = status;
        errorsService.errorMessage = data.data.message || "Undefined error";
        $location.path('errors');
    }).then(function (data) {
        vm.data1[0] = data.data.data.tweet_app | 0;
        vm.data1[1] = data.data.data.tweet_total | 0;
    });

    // Gets all twitter accounts of current user
    $http.get('/twitter/', {
        headers: {
            'Authorization': 'Bearer ' + authentication.getToken()
        }
    }).error(function (data, status, headers, config) {
        console.log("GET twitter accounts error");
        errorsService.errorCode = status;
        errorsService.errorMessage = data.data.message || "Undefined error";
        $location.path('errors');
    }).then(function (data) {
        vm.accounts = data.data.data.content;
        angular.forEach(data.data.data.content, function (value, key) {
            vm.labels.push('@' + value.screen_name);
            vm.labels2.push('@' + value.screen_name);
            vm.array1.push(value.tweet_app);
            vm.array2.push(value.statuses_count);
            vm.array11.push(value.followers_count);
            vm.array22.push(value.friends_count);
        });
        vm.accountsCount = vm.accounts.length;
        angular.forEach(vm.accounts, function (value, key) {
            vm.createTable(value.id_str);
            vm.createPlot(value.id_str, value.screen_name);
            vm.createPie(value.id_str);
        });
    });

    // Creates a table with the stats by day of all twitter accounts
    vm.createTable = function(id) {
        $http.get('/twitter/' + id + '/statsDay',{
            headers: {
                'Authorization': 'Bearer ' + authentication.getToken()
            }
        }).error(function(data, status, headers, config) {
            console.log("Create table error");
            errorsService.errorCode = status;
            errorsService.errorMessage = data.data.message || "Undefined error";
            $location.path('errors');
        }).then(function(data) {
            var content = data.data.data.content;
            $scope.averages.push({account: content.screen_name, avgTweetsDay: content.avgTweetsDay,
                avgRetweetsDay: content.avgRetweetsDay, avgFavoritesDay: content.avgFavoritesDay});
        });
    };

    // Creates a plot with mentions on the last days
    vm.createPlot = function(id, screen_name) {
        $http.get('/twitter/' + id + '/statsMentions',{
            headers: {
                'Authorization': 'Bearer ' + authentication.getToken()
            }
        }).error(function(data, status, headers, config) {
            console.log("Create plot error");
            errorsService.errorCode = status;
            errorsService.errorMessage = data.data.message || "Undefined error";
            $location.path('errors');
        }).then(function(data) {
            var content = data.data.data.content;
            $scope.series3.push('@'+screen_name);
            var aux = [];
            angular.forEach($scope.labels3, function(value, key){
                var found = false;
                for(var value2 in content){
                    if(value==value2){
                        aux.push(content[value]);
                        found = true;
                    }
                }
                if(!found){
                    aux.push(0);
                }
            });
            $scope.data3.push(aux);
        });
    };

    // Create a pie with region of followers
    vm.createPie = function(id) {
        $http.get('/twitter/' + id + '/followers',{
            headers: {
                'Authorization': 'Bearer ' + authentication.getToken()
            }
        }).error(function(data, status, headers, config) {
            console.log("Create pie error");
            errorsService.errorCode = status;
            errorsService.errorMessage = data.data.message || "Undefined error";
            $location.path('errors');
        }).then(function(data) {
            var content = data.data.data.content;
            createLabelsForPie(content);
            vm.partialContent.push(content);
            vm.count = vm.count + 1;
            if(vm.count == vm.accountsCount){
                angular.forEach($scope.labels4, function(value, key){
                    vm.array.push(0);
                });
                for(var partial in vm.partialContent){
                    createDataForPie(vm.partialContent[partial]);
                }
            }
        });
    };

    // Function that creates the data for the followers by region pie graph
    function createDataForPie(content){
        var i = 0;
        angular.forEach($scope.labels4, function(value, key){
            var found = false;
            for(var value2 in content){
                if(value==content[value2].time_zone || (content[value2].time_zone == "" && value == "No time_zone")){
                    vm.array[i] += 1;
                    found = true;
                }
            }
            if(!found){
                vm.array[i] += 0;
            }
            i++;
        });
        vm.count2 = vm.count2 + 1;
        if(vm.count2==vm.accountsCount) {
            $scope.data4 = vm.array;
        }
    }

    // Function that creates the labels for the followers by region pie graph
    function createLabelsForPie(content){
        angular.forEach(content, function(value, key) {
            if(value.time_zone!=null) {
                if(value.time_zone==""){
                    $scope.labels4.push("No time_zone");
                } else {
                    $scope.labels4.push(value.time_zone);
                }
            }
        });
        $scope.labels4 = $scope.labels4.getUnique();
    }
}