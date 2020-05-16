//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require('passport');
const uniqueValidator = require("mongoose-unique-validator");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const saltRounds = 12; // the higher the rounds the more time it takes

const homeStartingContent = "This blog is part of a coding project. See the project site at {github link}. " +
                            "Users can only be registered by someone with an existing account. " +
                            "Once registered you can compose new posts and delete exsiting ones. " +
                            "See README.md at the GitHub site for details.";

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
mongoose.set('useFindAndModify', false);

app.use(session({
   secret: process.env.SESSION_SECRET,
   resave: false,
   saveUninitialized: false
 }));
app.use(passport.initialize());
app.use(passport.session());

// initialize mongoose mongodb server
mongoose.connect(process.env.MONGO_ATLAS_PATH,
                {useNewUrlParser: true, useUnifiedTopology: true})
                .catch((err) => {
                  console.log("MongoDB error name: " + err.name);
                  console.log("MongoDB error message: " + err.message);
                  console.log("Make sure 'mongod' is running, or connected to a MongoDB server.");
                  // process.exit(1); // exit program if db connection fails
                });
mongoose.set("useCreateIndex", true);
// above satisfies (node:19620) DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.

// set up schema
const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please check data entry, no title specified."]
  },
  content: {
    type: String,
    required: [true, "Please check data entry, no content provided."]
  },
  postTimestamp: {
    type: String
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "No email specified."],
    unique: true
  },
  passwordhash: {
    type: String,
    required: [true, "No password specified."]
  },
  lastMessage: {
    type: Date
  }
});

userSchema.plugin(uniqueValidator); // allows us to enforce unique constraints
// compare submitted password to the stored hash
userSchema.methods.validPassword = async function(password) {
  await bcrypt.compare(password, this.passwordhash).then(function(result) {
    return result;
  });
};
// automatically generate user's password hash from their password
userSchema.virtual("password").set(function(value) {
  this.passwordhash = bcrypt.hashSync(value, saltRounds);
});

// create collections based on schema
const Post = mongoose.model("Post", blogSchema);
const User = mongoose.model("User", userSchema);

// create serializations based on _id rather than whole document to save memory
passport.serializeUser(function(user, done) {
  done(null, user._id);
});
passport.deserializeUser(function(userId, done) {
  User.findById(userId, (err, user) => done(err, user));
});

const local = new LocalStrategy((username, password, done) => {
  User.findOne({username})
    .then(user => {
      if (!user || !user.validPassword(password)) {
        done(null, false, { message: "Invalid email or password." });
      } else {
        done(null, user);
      }
    })
    .catch(e => done(e));
});
passport.use("local", local);

// create middleware to handle authenticated and not authenticated routes
const loggedInOnly = (req, res, next) => {
  if (req.isAuthenticated()) next();
  else res.redirect("/login");
};
const loggedOutOnly = (req, res, next) => {
  if (req.isUnauthenticated()) next();
  else res.redirect("/compose");
};

const posts = []

app.get("/", function(request, response) {
  const auth = request.isAuthenticated();

  Post.find({}, function(err, posts) {
    response.render("home", {
      descriptionContent: homeStartingContent,
      posts: posts,
      loggedin: auth
    });
  });

});

app.get("/compose", loggedInOnly, (req, res) => {
  const auth = req.isAuthenticated();
  res.render("compose", {loggedin: auth});
});

app.post("/compose", function(request, response) {
  const numberTimestamp = Number(new Date());
  const stringTimestamp =new Date(numberTimestamp).toDateString();

  const post = new Post ({
    title: request.body.postTitle,
    content: request.body.postBody,
    postTimestamp: stringTimestamp
  });

  post.save(function(err) {
    if(!err) {
      response.redirect("/");
    }
  });

});

app.get("/posts/:postId", function(request, response) {
  const auth = request.isAuthenticated();
  const requestedPostId = request.params.postId;
  Post.findOne({_id: requestedPostId}, function(err, post) {
    response.render("post", {
      title: post.title,
      content: post.content,
      postTimestamp: post.postTimestamp,
      loggedin: auth
    });
  });
});

app.post("/posts/delete", loggedInOnly, function(request, response) {
  // parst the request json for the blog post path so I can get the header from the last element
  const requestedPostIdArray = request.headers.referer.split("/")
  const requestedPostId = requestedPostIdArray[requestedPostIdArray.length - 1]

  Post.deleteOne({_id: requestedPostId}, (err, msg) => {
    if (err) {
      console.log(err);
    } else {
      response.redirect("/");
    }
  });
});

app.get("/login", function(req, res) {
  const auth = req.isAuthenticated();
  res.render("login", {loggedin: auth});
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

app.get("/register", loggedInOnly, function(req, res) {
  const auth = req.isAuthenticated();
  res.render("register", {loggedin: auth});
});

app.post("/register", (req, res, next) => {
  const { username, password } = req.body;

  User.create({ username, password })
    .then(user => {
      req.login(user, err => {
        if (err) next(err);
        else res.redirect("/compose");
      });
    })
    .catch(err => {
      if (err.name === "ValidationError") {
        console.log(err.message);
        res.redirect("/register");
      } else {
        console.log(err);
        next(err);
      }
    });

}); // end post function

app.all("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

// start server; listen on heroku port or 3000 if that doesn't exist.
app.listen(process.env.PORT || 3000, function() {
  var d = new Date();
  console.log(d.toLocaleTimeString() + " Server is running on port 3000");
});
