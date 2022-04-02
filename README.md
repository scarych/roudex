## RouDEx: ROUting Data is EXists

Allow to check for data existings by the way of your routing.

Supported ORM: 
- Mongoose

Compatible with: 
- Express
- Koa and Koa2.

Very comfortable with using routing bridges ([urouter](https://www.npmjs.com/package/urouter), [koa-router-bridge](https://www.npmjs.com/package/koa-router-bridge)) ;-) 

## Initiation
``` javascript
import mongoose from 'mongoose';
mongoose.connect('your_database');
import roudex from 'roudex';
let isExists = roudex({
    /** app - your application server, 'ko2' for Koa v2 'koa' for Koa v1, 'express' for Express */
    app: 'koa2',
    /** store - your ORM object with all models and data */
    store: mongoose,
    /** stackName - name for object for saving found data, default '$$'
      * For access to data use in next routes: 
      * req[stackName] for Express
      * ctx.state[stackName] for Koa
      */
    stackName: '_g',
    /** onerror - function called on data extraction errors
      * default value throw standart error code for related app server
      * arguments:
      * (err, req, res, next) => {} for Express
      * (err, ctx, next) => {} for Koa
      * err - is Error object
      * err.code = code of error (404, 500)
      * err.message = desciption of error (data not found, data source is not exists, etc) 
      */
    oerror: function (err, ... ) {},
    /** for Koa only, defaut true 
      * if true then save data into ctx.state[stackName] else save ctx[stackName] 
      */
    koaStateStack: false 
});
```
Now you have ready middleware function for your router. Function accept three arguments: `modelName`, `paramName`, `objectName`.
- `modelName` - is name of your model into ORM where your data stored, e.g. Users, Locations, etc
- `paramName` - name of your router parameters (without ':')
- `objName` - specific name for saving result object, if not defined will be use `modelName` value

Let use it!

``` javascript
import router from 'koa-router';
/** use with Koa2 */
var isExists = roudex({
    app: 'koa2',
    store: mongoose,
    stackName: '_g',
});
router.get('/user/:userId', [isExists('Users', 'userId'), (ctx, next)=> {
    console.log (ctx.state.Users);
}]);

/** use with Koa */
var isExists = roudex({
    app: 'koa',
    store: mongoose,
    /** now use default stackName but don't save into this.state */
    koaStateStack: false,
});

router.get('/user/:userId', [isExists('Users', 'userId', 'User'), * (next)=> {
    console.log (this.$$.User);
    this.body = this.$$.User.username;
}]);
/** use with Express */
var app = express();
var isExists = roudex({
    app: 'express',
    store: mongoose,
    /** overload onerror function */
    onerror: (err, req, res, next) => {
        res.render('errorPage', err);
    }
});
/** same way */
app.get('/user/:userId', [isExists('Users', 'userId', 'User'), (req, res, next)=> {
    res.json(req.$$.User);
}]);
// or
app.use('/user/:userId', isExists('Users', 'userId', 'User'));
app.get('/user/:userId', (req, res, next)=> {
    res.json(req.$$.User);
});
```
##### Bonus: usage with bridges
```js
/** use with koa-router-bridge */
import RouterBridge from 'koa-router-bridge';
import Router from 'koa-router';
import routes from './routes.js';
let BridgedRouter = RouterBridge(Router);
let router = BridgedRouter();

router.bridge('/users', (router)=> {
    router.get('/', routes.users.index);
    router.bridge('/:userId', isExists('Users', 'userId'), (router)=>{ 
        // routes will be accessible only if Users.userId was found
        // data allowed into local routes into routes.state._g.Users 
        router.get('/', routes.users.view);
        router.post('/', routes.users.save);
    });
});
```
##### P.S.
Email holstinnikov@gmail.com to ask questions, report about some issues or request other ORM and routes.
