require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session=require("express-session");
const passport= require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const app=express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname+"/public"));
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  }));

var user;

app.use(passport.initialize());
app.use(passport.session());

  mongoose.connect("mongodb+srv://admin-toohina:test123@cluster0.kbrib.mongodb.net/diaryDB",{useNewUrlParser:true, useUnifiedTopology: true, useFindAndModify: false });
  mongoose.set("useCreateIndex",true);

  const entrySchema=new mongoose.Schema({   
        title: String,
        body: String
  });

  
  const Entry=mongoose.model("Entry",entrySchema);
  
  const diarySchema=new mongoose.Schema({
      username:String,
      password:String,
      entries: [entrySchema]
  });
  
  diarySchema.plugin(passportLocalMongoose);

  const Diary=mongoose.model("Diary",diarySchema); 

  passport.use(Diary.createStrategy());

  passport.serializeUser(Diary.serializeUser());
  passport.deserializeUser(Diary.deserializeUser());

app.get("/",function(req, res){
    res.render("home",{});
});

app.route("/register")
.get(function(req, res){
    res.render("register",{exists:false});
})
.post(function(req, res){
    let username=req.body.username;
    let password=req.body.password;

    Diary.register({username:username},password,function(err,diary){
        if(err){
            res.render("register",{exists:true});
        }
        else{
            passport.authenticate("local")(req,res,function(){
                user=username;
                res.redirect("/diary/"+username);
            });
        }
    });
});

app.get("/login/again",function(req,res){
    res.render("loginAgain",{});
});
app.route("/login")
.get(function(req, res){
    res.render("login",{});
})
.post(function(req,res){
    let username=req.body.username;

    Diary.findOne({username:username},function(err,diary){
        if(diary){
            req.login(diary,function(err){
                if(err){
                    console.log(err);
                    res.redirect("/login/again");
                }
                else{
                        valueOfExists=false;
                        user=username;
                         passport.authenticate("local",{
                          failureRedirect:"/login/again"   
                         })(req,res,function(){
                        res.redirect("/diary/"+diary.username);
                    });
                }
            });
        }else{
            res.redirect("/login/again");
        }
    });
});

app.get("/diary/:username",function(req, res){
    let username=req.params.username;
    if(req.isAuthenticated()&&user===username){ 
        Diary.findOne({username:username},function(err,diary){
            res.render("diary",{username:username,entries:diary.entries});
        });
    }else{
        res.redirect("/login");
    }
});

app.get("/write/:username",function(req,res){
    let username=req.params.username;
    if(req.isAuthenticated()&&user===username){ 
            res.render("write",{username:username});
    }else{
        res.redirect("/login");
    }
});

app.post("/write",function(req,res){
    let title = req.body.title;
    let body = req.body.body;
    let username=req.body.username;
    let entry=new Entry({
            title:title,
            body:body
       });
    Diary.findOneAndUpdate({'username':username},{'$push': {'entries':entry}},function (error, success) {
        if (error) {
            console.log(error);
        } else {
            res.redirect("/diary/"+username);
        }
    });
});

var titleGlobal;
var bodyGlobal;

app.get("/entry/:username/:id",function(req, res){
    let username=req.params.username;
    let id=req.params.id;
    let currentEntry;
    if(req.isAuthenticated()&&user===username){ 
        Diary.findOne({username:username},function(err,diary){
            let entries=diary.entries;
            entries.forEach(function(entry){
                if(entry.id===id){
                    currentEntry=entry;
                    titleGlobal=entry.title;
                    bodyGlobal=entry.body;
                }
            });
            res.render("entry",{entry:currentEntry,username:username});
        });
    }else{
        res.redirect("/login");
    }
});

app.get("/edit/:username/:entryId",function(req,res){
    let username=req.params.username;
    let entryId=req.params.entryId;
    if(req.isAuthenticated()&&user===username){
        res.render("edit",{title:titleGlobal,body:bodyGlobal,id:entryId,username:username});
    }else{
        res.redirect("/login");
    }
});

app.post("/edit",function(req,res){
    let username=req.body.username;
    let title=req.body.title;
    let body=req.body.body;
    let id=req.body.entryId;
    Diary.updateOne({'entries._id':id},{'$set': {'entries.$.title':title,'entries.$.body':body}},function (error, success) {
        if (error) {
            console.log(error);
        } else {
        }
    });
    res.redirect("/diary/"+username);
});

app.post("/delete",function(req, res){
    let username=req.body.username;
    let id=req.body.id;
    Diary.findOneAndUpdate({'username':username},{'$pull':{'entries':{'_id':id}}},function(err,success){
        if(err)console.log(err);
    });
    res.redirect("/diary/"+username);
});

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
});

app.listen(3000,function(){
    console.log("Server has started.");
});