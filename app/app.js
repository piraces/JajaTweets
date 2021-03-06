'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
    'ngRoute',
    'ngCookies',
    'angularSpinners',
    'myApp.signin',
    'myApp.errors',
    'myApp.signup',
    'myApp.version',
    'myApp.graphs',
    'myApp.accounts',
    'myApp.twitterAccounts',
    'myApp.dashboard',
    'myApp.twitterSubscriptions',
    'myApp.shortener',
    'myApp.profile',
    'myApp.statistics'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/signin'});
}]);
