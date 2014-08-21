var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session      = require('express-session');
//var cookieParser = require('cookie-parser');



var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

//authentication libraries
//
////
/////



var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

//auth
app.use(session());


app.get('/', 
function(req, res) {
  res.render('index');
});

app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', checkUser, loadUser,
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login', function(req, res){
  //render login page
  res.render('login.ejs');
});

app.post('/signup', function(req, res){
  var username = request.body.username;
  var password = request.body.password;

  //if( username)
  User.authenticate(username, password).then(function(user){
    //set the uid in session
    req.session.uid = user.id;
    res.redirect('/');
  }, function(e){
    req.session.uid = null;
    res.statusCode = 404;
    res.render('/signup', { error: e.message });
  });
});

app.get('/signup', function(req, res){
  //render signup page
  res.render('signup.ejs');
});

app.get('logout', function(req, res){
  req.logout();
  res.redirect('/');
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

// function isLoggedIn(req, res, next){
//   if(req.isAuthenticated()){
//     return next();
//   }

//   res.redirect('/');
// }

function checkUser(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

function loadUser(req, res, next){
  // if (req.session.username ){
  //   new User({username: req.session.username}).fetch()
  //       .then(function(user){
  //         req.user = user;
  //         next();
  //       });
  // }
  if ( req.session.uid ){
    new User({ id: req.session.uid }).fetch()
        .then(function(user){
          req.user = user;
          next();
        });
  } 
  else {
    return next();
  }

}


console.log('Shortly is listening on 4568');
app.listen(4568);
