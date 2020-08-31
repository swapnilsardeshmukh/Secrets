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

const app = express();

//console.log(process.env.SECRET);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: 'keyboard cat.',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/secretsDB", {useNewUrlParser: true,useUnifiedTopology: true });
mongoose.set('useCreateIndex',true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});

//const secret=process.env.SECRET;

//mongoose encryption plugin
//userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if(req.isAuthenticated()){
    res.render("secrets");
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
        res.render("/secrets");
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







app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
