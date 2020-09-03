//jshint esversion:6
//jshint esversion:6

require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption"); //level 2
//const md5= require("md5");//level 3
//const bcrypt =require("bcrypt");
//const saltRounds = 10;
const session=require('express-session');
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook');
const findOrCreate=require('mongoose-findorcreate');

const app = express();

//console.log(process.env.SECRET);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://admin-swapnil:sardeshmukh@94@todo.loq2u.mongodb.net/secretsDB", {useNewUrlParser: true,useUnifiedTopology: true });
mongoose.set('useCreateIndex',true);

//schema for secrets
const secretSchema = new mongoose.Schema({
  content: String
});

//model for secrets
const Secret = new mongoose.model("Secret", secretSchema);
//googleId:String added as duplicate key issues + secret

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId:String,
  facebookId:String,
  secret:[secretSchema]
});

//const secret=process.env.SECRET;

//mongoose encryption plugin
//userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
//plugin for local-mongoose
userSchema.plugin(passportLocalMongoose);
//plugin for local-mongoose-findOrCreate
userSchema.plugin(findOrCreate);

//user model
const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

//work for only passport-local

//passport.serializeUser(User.serializeUser());
//passport.deserializeUser(User.deserializeUser());

//work for all
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


//google stratergy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://mighty-reaches-64031.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id,username: profile.id }, function (err, user) {
      console.log(profile);
      return cb(err, user);
    });
  }
));

//facebook stratergy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://mighty-reaches-64031.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        console.log(profile);
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
res.render("home");
});

//auth/google
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

//////////////////////////////////////
app.get("/auth/facebook",
  passport.authenticate('facebook'));

app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){

  if(req.isAuthenticated()){

      User.find({ secret: { $exists: true, $ne: [] } }, function (err, usersfound) {
        if (err) {
          console.log(err);
        } else {
          console.log(usersfound);
          res.render("secrets", { usersHavingSecrets: usersfound });
        }
      });
    }else{
      res.redirect('/login');
    }
//work only for one secret by user
  // User.find({"secret": {$ne:null}}, function(err,foundUsers){
  //   if(err){
  //     console.log(err);
  //   }
  //   else{
  //     res.render("secrets",{userWithSecrets:foundUsers})
  //   }
  // });
//for secret.ejs
//<%  userWithSecrets.forEach(function(user){ %>
//    <p class="secret-text"><%= user.secret %></p>
//  <% }) %>


  //normal check
//   if(req.isAuthenticated()){
//     res.render("secrets");
//   }
//   else
//   {
//     res.redirect("login");
// }

});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else
  {
    res.redirect("login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res ,function(){

        User.find({ secret: { $ne: [] } }, function (err, usersfound) {
          if (err) {
            console.log(err);
          } else {
            console.log(usersfound);
            res.render("secrets", { usersHavingSecrets: usersfound });
          }
        })

      })
    }
  })

//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     // Store hash in your password DB.
//     const newUser =  new User({
//       email: req.body.username,
//     //  password: md5(req.body.password) //for md5
//       password:hash
//     });
//     newUser.save(function(err){
//       if (err) {
//         console.log(err);
//       } else {
//         res.render("secrets");
//       }
//     });
// });
});

app.post("/submit",function(req,res){


  const yourSecret = req.body.secret;
const newSecret = new Secret({
  content: yourSecret
})
// console.log(req.user);

User.findById(req.user.id, function (err, userfound) {
  if (err) {
    console.log(err);
  } else {
    if (userfound) {
      console.log(userfound);
      userfound.secret.push(newSecret);
      userfound.save(function () {
        res.redirect('/secrets');
      });
    }
  }
});
  // const submitedSecret=req.body.secret;
  // console.log(req.user);
  // User.findById(req.user.id,function(err,foundUser){
  //   if(err)
  //   {console.log(err)}
  //   else
  //     {
  //     foundUser.secret=submitedSecret;
  //     foundUser.save(function() {
  //       res.redirect("/secrets");
  //     }
  //     )}
  // })
})


app.post("/login", function(req, res){

  const user=new User(
    {
      username: req.body.username,
      password: req.body.password
    }
  )

  //passportlogonfunction
req.login(user,function(err){
  if(err)
  {
    console.log(err);
  }
  else
  {
    passport.authenticate("local",{ successRedirect: '/secrets',
                                   failureRedirect: '/login'})(req,res ,function(err){
      if(!err){
          res.redirect("/secrets");
      }
      else{
        console.log(err);

      }
    })
  }
})





  // const username = req.body.username;
  // const password = req.body.password;
  // //const password =  md5(req.body.password);//FOR MD5
  // User.findOne({email: username}, function(err, foundUser){
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //
  //           bcrypt.compare(password, foundUser.password, function(err, result) {
  //               // result == true
  //           if(result === true){
  //               res.render("secrets");
  //                   }
  //                     else{
  //               res.send("Error in user name and password");
  //             }
  //               });
  //               //UPTO md5
  //       //if (foundUser.password === password) {
  //       //  res.render("secrets");
  //       }
  //     }
  // });
  //
});







let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started ");
});
