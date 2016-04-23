/**
 * Created by piraces on 22/04/16.
 */
(function() {

    'use strict';

    var passport = require('passport');
    var mongoose = require('mongoose');
    var request = require('request');
    var OAuth = require('oauth').OAuth;
    var atob = require('atob');
    var Tweet = mongoose.model('tweets');
    var User = mongoose.model('users');
    var user_required = require('../../config/policies.config').user_required;

    // TODO: Quit in production
    var util = require('util');


    module.exports = function(app) {

        /**
         * Init OAuth object with the twitter application consumer key and secret.
         * It establishes a callback URL to receive Twitter response.
         * @param callback is the callback object, containing the OAuth object initialized.
         */
        function initTwitterOauth(callback) {
            var oa = new OAuth(
                "https://twitter.com/oauth/request_token"
                , "https://twitter.com/oauth/access_token"
                , process.env.TWITTER_CONSUMER_KEY
                , process.env.TWITTER_CONSUMER_SECRET
                , "1.0A"
                , "http://localhost:3000/auth/twitter/callback"
                , "HMAC-SHA1"
            );
            callback(oa);
        }

        /**
         * Function for posting a new tweet using OAuth, user token and secret.
         * It needs an initial OAuth object with the twitter application consumer key and secret.
         * @param user is the local user object (from database).
         * @param body is the body of the request made.
         * @param callback is the callback object, containing response of Twitter.
         */
        function makeTweet(user, body, callback) {
            initTwitterOauth(function(oa)
            {
                oa.post(
                    "https://api.twitter.com/1.1/statuses/update.json"
                    , user.token
                    , user.secret
                    // Tweet content
                    , {
                        "status": body.status
                        //"in_reply_to_status_id": body.in_reply_to_status_id,
                        //"lat": body.lat,
                        //"long": body.long,
                        //"place_id": body.place_id
                    }
                    , function (error, data, response) {
                        if (error){
                            callback(error);
                        } else {
                            callback(JSON.parse(data));
                        }
                    }
                );
            });
        }

        /**
         * Gets an unique tweet from Twitter by unique id.
         * Requires user authentication.
         * @param user is the local user.
         * @param params are the params of the request.
         * @param callback is the callback object, containing the resultant tweet data.
         */
        function getTweet(user, params, callback){
            initTwitterOauth(function(oa)
            {
                oa.get(
                    "https://api.twitter.com/1.1/statuses/show.json?" +
                    "id=" + params.id
                    , user.token
                    , user.secret
                    , function (error, data, response) {
                        if (error){
                            callback(error);
                        } else {
                            callback(JSON.parse(data));
                        }
                    }
                );
            });
        }

        /**
         * Retweet an unique tweet from Twitter by unique id.
         * Requires user authentication.
         * @param user is the local user.
         * @param params are the params of the request.
         * @param callback is the callback object, containing the resultant tweet data (and retweet data).
         */
        function makeRetweet(user, params, callback){
            initTwitterOauth(function(oa)
            {
                oa.post(
                    "https://api.twitter.com/1.1/statuses/retweet/" + params.id + ".json"
                    , user.token
                    , user.secret
                    // Content
                    , {
                        "id": params.id
                    }
                    , function (error, data, response) {
                        if (error){
                            callback(error);
                        } else {
                            callback(JSON.parse(data));
                        }
                    }
                );
            });
        }



        /**
         * Converts a JWT in request to a JSON Object.
         * @param req is the request containing the JWT.
         * @param callback is the object callback, a user from database.
         * @constructor constructor.
         */
        function getUserFromJWT(req, callback){
            var payload = req.headers.authorization.split('.')[1];
            payload = atob(payload);
            payload = JSON.parse(payload);
            User.findOne({email: payload.email}, function(err, doc){
                    if(err) {
                        callback(err);
                    } else {
                        callback(doc);
                    }
                });
        }

        // Luis
        app.get('/tweets',function(req, res, next) {

        });

        /**
         * Endpoint that updates a twitter status (post a tweet).
         * Requires a local user account with at least one twitter account associated.
         * Body parameters required:
         * - date: javascript date object (timestamp or string).
         * - status: status to put on the tweet.
         */
        app.post('/tweets', user_required.before, function(req, res, next) {
            var date = new Date();
            if(req.body.date && new Date(req.body.date) > date) {
                // If tweet date is posterior of current date, the tweet is saved for posterior posting
                getUserFromJWT(req, function(user) {
                    var newTweet = new Tweet({
                        "status": req.body.status,
                        "date": req.body.date,
                        "user": user._id
                    });
                    newTweet.save(function(err){
                        if(err){
                            res.status(500).json({
                                "error": true,
                                "data" : {
                                    "message": "Could not save tweet in database",
                                    "url": "http://localhost:3000/"
                                }
                            });
                        } else {
                            res.json({
                                "error": false,
                                "data" : {
                                    "message": "Tweet saved succesfully",
                                    "url": "http://localhost:3000/tweets"
                                }
                            });
                        }
                        next();
                    });
                });
            } else {
                // If tweet date is before or equal to current date, its updated directly
                getUserFromJWT(req, function(user){
                    makeTweet(user, req.body, function(result){
                        if(result.id_str){
                            res.json({
                                "error": false,
                                "data" : {
                                    "message": "Tweet post successful",
                                    "id_str": result.id_str,
                                    "url": "http://twitter.com/" + "statuses/" + result.id_str
                                }
                            });
                        } else if(result.statusCode && result.statusCode != 200){
                            res.status(result.statusCode).json({
                                "error": true,
                                "data" : {
                                    "message": "Tweet post unsuccessful",
                                    "url": "http://localhost:3000/"
                                }
                            });
                        } else {
                            res.status(500).json({
                                "error": true,
                                "data" : {
                                    "message": "Cannot post the specified tweet",
                                    "url": "http://localhost:3000/"
                                }
                            });
                        }
                        next();
                    });
                })
            }

        }, user_required.after);

        /**
         * Gets a tweet by the unique tweet id, and provides the data of it.
         * Requires a local user account with at least one twitter account associated.
         * Get parameters required:
         * - id: unique tweet id (from Twitter "id_str").
         */
        app.get('/tweets/:id', user_required.before, function(req, res, next) {
            getUserFromJWT(req, function(user){
                getTweet(user, req.params, function(result){
                    if(result.statusCode && result.statusCode != 200){
                        res.status(result.statusCode).json({
                            "error": true,
                            "data" : {
                                "message": "Cannot get tweet with id: " + req.params.id,
                                "url": "http://localhost:3000/"
                            }
                        });
                    } else {
                        res.json({
                            "error": false,
                            "data" : {
                                "message": "Tweet get successful",
                                "url": "http://twitter.com/" + "statuses/" + result.id_str,
                                "content": result
                            }
                        });
                    }
                });
            });
        }, user_required.after);

        // Luis
        app.put('/tweets/:id',function(req, res, next) {

        });

        // Luis
        app.delete('/tweets/:id',function(req, res, next) {

        });

        /**
         * Makes a retweet on a specific tweet (with determinated user account).
         * Requires a local user account with at least one twitter account associated.
         * Get parameters required:
         * - id: unique tweet id (from Twitter "id_str").
         */
        app.get('/tweets/:id/retweet', user_required.before, function(req, res, next) {
            getUserFromJWT(req, function(user){
                makeRetweet(user, req.params, function(result){
                    if(result.statusCode && result.statusCode != 200){
                        res.status(result.statusCode).json({
                            "error": true,
                            "data" : {
                                "message": "Cannot retweet with id: " + req.params.id,
                                "url": "http://localhost:3000/"
                            }
                        });
                    } else {
                        res.json({
                            "error": false,
                            "data" : {
                                "message": "Retweet successful",
                                "url": "http://twitter.com/" + "statuses/" + result.id_str,
                                "content": result
                            }
                        });
                    }
                });
            });
        }, user_required.after);

        // Luis
        app.get('/tweets/own',function(req, res, next) {

        });

        // Luis
        app.get('/tweets/pending',function(req, res, next) {

        });

        // Raúl
        app.get('/tweets/subscribed',function(req, res, next) {

        });

        // Raúl
        app.get('/tweets/subscribed/:id',function(req, res, next) {

        });

        // Return middleware.
        return function(req, res, next) {
            next();
        };
    };

})();