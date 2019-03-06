// Required dependencies 
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const cookieSession = require('cookie-session');
const fs = require("fs");
const mysql = require('mysql');
const bodyParser = require("body-parser");

//dev or prod
const PROD = process.env.NODE_ENV;

// cookieSession config
app.use(cookieSession({
    maxAge: 24 * 60 * 60 * 1000, // One day in milliseconds
    keys: ['wowiearandomstring']
}));

app.use(passport.initialize()); // Used to initialize passport
app.use(passport.session()); // Used to persist login sessions

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Strategy config
passport.use(new GoogleStrategy({
        clientID: '610620061218-7o8o31ebmroqhnfa5n9rp16h3a3s65as.apps.googleusercontent.com',
        clientSecret: 'eyr1llCNsCEvwVaBqqLmZ7Nz',
        callbackURL: PROD ? 'http://genericquizgame.herokuapp.com/auth/google/callback' : 'http://localhost:8000/auth/google/callback'
    },
    (accessToken, refreshToken, profile, done) => {
        const id = profile.id;
        if(cache[id]){
            done(null, cache[id]);
            return;
        }
        pool.query("SELECT * FROM users WHERE google_id = ?", [id], (err, results, fields) => {
            if(err) return console.log(err);
            if(!results[0]){
                done(null, {
                    id: googleData[id].id,
                    photo: googleData[id].photos[0].value
                });
                return;
            }
            if(googleData[id]) delete googleData[id];
            const data = {
                user_id: results[0].user_id,
                id: results[0].google_id,
                username: results[0].username,
                photo: results[0].photo
            }
            done(null, data);
            cache[id] = data;
        });
    }
));

//store google data for users that haven't been created yet
const googleData = {}

//cache users
const cache = {}

// Used to stuff a piece of information into a cookie
passport.serializeUser((user, done) => {
    if(user.provider) googleData[user.id] = user;
    done(null, user.id);
});

// Used to decode the received cookie and persist session
passport.deserializeUser((id, done) => {
    if(cache[id]){
        done(null, cache[id]);
        return;
    }
    pool.query("SELECT * FROM users WHERE google_id = ?", [id], (err, results, fields) => {
        if(err) return console.log(err);
        if(!results[0]){
            done(null, {
                id: googleData[id].id,
                photo: googleData[id].photos[0].value
            });
            return;
        }
        if(googleData[id]) delete googleData[id];
        const data = {
            user_id: results[0].user_id,
            id: results[0].google_id,
            username: results[0].username,
            photo: results[0].photo
        }
        done(null, data);
        cache[id] = data;
    });
});

// Middleware to check if the user is authenticated
function isUserAuthenticated(req, res, next) {
    if (req.user && !googleData[req.user.id]) {
        next();
    } else {
        res.redirect("/auth/google");
    }
}

const pool  = mysql.createPool({
    connectionLimit : 2,
    host            : 'xefi550t7t6tjn36.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user            : 'c775jh0bg1jqkuc8',
    password        : 'rckafl6fx34b2ewf',
    database        : 'cza7ebt0ijtm6ttm',
    multipleStatements: true
});

//static
app.use("/static", express.static("static"));

// passport.authenticate middleware is used here to authenticate the request
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile'] // Used to specify the required data
}));

// The middleware receives the data from Google and runs the function on Strategy config
app.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
    pool.query("SELECT username FROM users WHERE google_id = ?", [req.user.id], (err, result) => {
        if(err) return console.log(err), res.send("an error occured");
        if(result[0]){
            res.redirect("/account");
        }else{
            res.redirect("/create-account");
        }
    });
});

// Routes
app.get('/', (req, res) => {
    if (req.user && !googleData[req.user.id]) res.redirect("/account");
    res.render("login");
});

//create set
app.get("/create-set", isUserAuthenticated, (req, res) => {
    res.render("create-set", {username: req.user.username});
});
app.post("/create-set", isUserAuthenticated, (req, res) => {
    let termData = [];
    if(typeof req.body.terms === "string"){
        req.body.terms = [req.body.terms];
        req.body.definitions = [req.body.definitions];
    }
    for(let i = 0; i < req.body.terms.length; i++){
        termData.push([0, req.body.terms[i], req.body.definitions[i]]);
    }

    //set -> set_id, name
    //term -> term_id, set_id, term, definition
    pool.query("INSERT INTO termset (name, creator_id, set_creation_date) VALUES (?, ?, ?)", [req.body.setname, req.user.user_id, Date.now()], (err, results, fields) => {
        if(err) return console.log(err);
        let insertId = results.insertId;
        termData = termData.map(x => [insertId, x[1], x[2]]);
        pool.query("INSERT INTO term (set_id, term, definition) VALUES ?", [termData], (err, results, fields) => {
            if(err) return console.log(err);
            res.redirect("/show-set/" + insertId);
        })
    })
})

//show set route
app.get("/show-set/:setid", (req, res) => {
    res.render("show-set", {username: req.user.username});
})

//game stuff
app.get(["/play", "/play/*"], isUserAuthenticated, (req, res) => {
    res.render("game", {username: req.user.username});
});
require("./game-server")(io, pool);


app.get("/game", (req, res) => {
    res.render("game");
})

//account route
app.get("/account", isUserAuthenticated, (req, res) => {
    res.render("account.ejs", {
        username: req.user.username,
        pfp: req.user.photo
    });
});
app.get("/account/:userid", isUserAuthenticated, (req, res) => {
    res.render("account.ejs", {
        username: req.user.username,
        pfp: req.user.photo
    });
})

// create account route
app.get('/create-account', (req, res) => {
    if(!req.user) return res.redirect("/");
    res.render("create-account");
});
app.post("/create-account", (req, res) => {
    if (!req.user) return res.redirect("/");
    pool.query("INSERT INTO users (username, google_id, photo, friend_code) VALUES (?, ?, ?, ?)", [req.body.username, req.user.id, req.user.photo, Math.random().toString(36).substr(2, 5)], (err) => {
        if(err) return console.log(err), res.render("create-account", {display: req.user.displayName, err: "Username already exists!"});
        console.log(`Successfully created new account:\n\tUsername: ${req.body.username}\n\tGoogle ID: ${req.user.id}\n\tPhoto: ${req.user.photo}`);
        res.redirect("/account");
    });
});

//friend
app.get("/friend/:friendcode", isUserAuthenticated, (req, res) => {
    pool.query("SELECT user_id FROM users WHERE friend_code = ?", [req.params.friendcode], (err, results) => {
        if(err) return console.log(err);
        console.log(results);
        if(results[0].user_id === req.user.user_id) return;
        pool.query("INSERT INTO friends (friender, friendee) VALUES ?", [[[req.user.user_id, results[0].user_id], [results[0].user_id, req.user.user_id]]], err => {
            if(err) {
                console.log(err);
                if(err.code === "ER_DUP_ENTRY"){
                    res.send("you're already friends");
                }else{
                    res.send("uh oh it didn't work");
                }
                return;
            }
            res.send("ay it worked");
        })
    });
})

// Logout route
app.get('/logout', (req, res) => {
    req.logout(); 
    res.redirect('/');
});

//api
app.use("/api", require("./api.js")(isUserAuthenticated, pool));

app.get("*", (req, res) => {
    res.render("404");
})

const PORT = process.env.PORT || 8000;
http.listen(PORT, function () {
    console.log('Server started on port:' + PORT);
});