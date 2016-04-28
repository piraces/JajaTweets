/**
 * Created by diego on 21/04/16.
 *
 * Manages the login endpoint.
 */
(function() {

    'use strict';

    var passport = require('passport');
    var mongoose = require('mongoose');

    module.exports = function(app) {

        app.get('/logout', function(req,res,next) {
           req.session = null;
        });

        /**
         * Offers the endpoint POST /login
         * Uses passport to authenticate the user
         * and returns a valid JWT.
         */
        app.post('/login',function(req, res, next) {
            passport.authenticate('local', function(err, user, info){
                var token;

                // If Passport throws/catches an error
                if (err) {
                    res.status(404).json(err);
                    return;
                }

                // If a user is found
                if(user){
                    token = user.generateJwt();
                    user.lastAccess = new Date();
                    user.save();
                    res.status(200);
                    req.session.jwt = token;
                    res.json({
                        "error": false,
                        "data": {
                            "token" : token,
                            "url": "http://localhost:3000/tweets"
                        }
                    });
                } else {
                    // If user is not found
                    res.status(401).json(info);
                }
            })(req, res);
        });

        // Return middleware.
        return function(req, res, next) {
            next();
        };
    };

})();