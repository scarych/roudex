'use strict';

var defaultParams = {
    stackName: '$$',
    koaStateStack: true,
}

var RouDEx = function (params) {
    var app;
    if (!params.app) {
        throw new Error('Application server is not defined!');
    } else {
        app = params.app;
    }
    var db;
    if (!params.db) {
        throw new Error('Storage db is not defined!');
    } else {
        db = params.db;
    }
    /** define error codes */
    var errors = {
        dataSource: 'data source is not defined',
        extraction: 'data extraction error',
        noData:     'data not found',
    };
    /** set stack name */
    var stackName = params.stackName || defaultParams.stackName;
    /** save into stack if only koaStateStack !== false */
    var koaStateStack = !(params.koaStateStack===false);

    var extractFunc;
    /** define the storage db and set extract function   */
    var storageEngineName = db.constructor.name.toLowerCase();
    switch (storageEngineName) {
        case 'mongoose':
            extractFunc = function (modelName, idValue, cb) {
                var model = db.models[modelName];
                if (!model) {                    
                    var err = new Error(errors.noData);
                    err.code = 500;
                    cb(err, null);
                } else {
                    return model.findOne({_id:idValue}).exec(function (err, result) {
                        if (err) {
                            err.code = 500;
                            cb(err, null);
                        }
                        if (!err && !result) {
                            err = new Error(errors.noData);
                            err.code = 404;
                            cb(err, null);
                        }
                        if (!err && result) {
                            cb(null, result);
                        }
                    });
                }
            }
            break;
        default:
            throw new Error('Storage db is not supported');
    }
    var routerFunc;
    var errorFunc;
    switch (app) {
        case 'express':   // is express?
            errorFunc = params.onerror || function(err, req, res, next) {
                res.status(err.code).send(err.message);
            }

            routerFunc = function(storageName, paramName, objName) {
                if (!objName) {
                    objName = storageName;
                }
                return function (req, res, next) {
                    if (!req[stackName]) {
                        req[stackName] = {};
                    }
                    var paramValue;
                    if (!req.params[paramName]) {
                        throw new Error('Parameter `'+paramName+'` is exists in request');
                    } else {
                        paramValue = req.params[paramName];
                    }
                    extractFunc(storageName, paramValue, function (err, resultObject) {
                        if (err!==null) {
                            errorFunc(err, req, res, next);
                        } else {
                            req[stackName][objName] = resultObject;
                            next();
                        }
                    })
                }
            }
            break;
        case 'koa':     // is koa ?

            errorFunc = params.onerror || function(err, ctx, next) {
                ctx.status = err.code;
                ctx.body = err.message;                
            }

            routerFunc = function(storageName, paramName, objName) {
                if (!objName) {
                    objName = storageName;
                }
                return function* (next) {
                    var ctx = this;
                    var dataStack;
                    if (koaStateStack) {
                        if (!ctx.state[stackName]) {
                            ctx.state[stackName] = {};
                        }
                        dataStack = ctx.state[stackName]; 
                    } else {
                        if (!ctx[stackName]) {
                            ctx[stackName] = {};
                        }
                        dataStack = ctx[stackName]; 
                    }

                    var paramValue;
                    if (!ctx.params) {
                        throw new Error('Parameters is required!');
                    } else if (!ctx.params[paramName]) {
                        throw new Error('Parameter `'+paramName+'` is exists in request');
                    } else {
                        paramValue = ctx.params[paramName];
                    }
                    var resultObject = yield extractFunc(storageName, paramValue, function(err, resultObject) {
                        if (err!==null) {
                            errorFunc(err, ctx, next);
                        } else {
                            dataStack[objName] = resultObject;
                            return resultObject;
                        }
                    }).then(function (resultObject) {
                        dataStack[objName] = resultObject;
                        return resultObject;
                    }).catch(function (err) { 
                        if (err!==null) {
                            errorFunc(err, ctx, next);
                        }
                    });
                    
                    if (resultObject!==null) {
                        yield next;
                    }
                    
                }
            }
            break;
        case 'koa2':     // is koa2 ?

            errorFunc = params.onerror || function(err, ctx, next) {
                ctx.throw(err.message, err.code);
            }
        
            routerFunc = function(storageName, paramName, objName) {
                if (!objName) {
                    objName = storageName;
                }
                return function (ctx, next) {
                    var dataStack;
                    if (koaStateStack) {
                        if (!ctx.state[stackName]) {
                            ctx.state[stackName] = {};
                        }
                        dataStack = ctx.state[stackName]; 
                    } else {
                        if (!ctx[stackName]) {
                            ctx[stackName] = {};
                        }
                        dataStack = ctx[stackName]; 
                    }
                    var paramValue;
                    if (!ctx.params) {
                        throw new Error('Parameters is required!');
                    } else if (!ctx.params[paramName]) {
                        throw new Error('Parameter `'+paramName+'` is exists in request');
                    } else {
                        paramValue = ctx.params[paramName];
                    }

                    return extractFunc(storageName, paramValue, function (err, resultObject) {
                        if (err!==null) {
                            ctx.throw(err[1], err[0]);
                        } else {
                            dataStack[objName] = resultObject;
                            console.log (resultObject);
                            return next();
                        }
                    }).then(function (resultObject) {

                    }).catch(function (err) {
                        if (err!==null) {
                            
                        }
                    });
                }
            }        
            break;
        default:
            throw new Error('Application is not supported');
    }

    return routerFunc;
}

module.exports = RouDEx;