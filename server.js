// Required dependencies 
const express = require('express');
const app = express();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const cookieSession = require('cookie-session');
const fs = require("fs");
const mysql = require('mysql');
const bodyParser = require("body-parser");

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
        clientID: '610620061218-qh6dr7f6hibsd5aubpajqrvon6qsjnfm.apps.googleusercontent.com',
        clientSecret: 'T2_8zmww7jx7BieRCbVVw-gi',
        callbackURL: 'http://localhost:8000/auth/google/callback'
    },
    (accessToken, refreshToken, profile, done) => {
        done(null, profile); // passes the profile data to serializeUser
    }
));

// Used to stuff a piece of information into a cookie
passport.serializeUser((user, done) => {
    done(null, user);
});

// Used to decode the received cookie and persist session
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Middleware to check if the user is authenticated
function isUserAuthenticated(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.send('You must login!');
    }
}

const pool  = mysql.createPool({
    connectionLimit : 10,
    host            : 'den1.mysql1.gear.host',
    user            : 'genericquizgame',
    password        : 'Pd234wVLHe~?',
    database        : 'genericquizgame'
});
pool.query('SELECT * FROM users', function (error, results, fields) {
    if (error) throw error;
    console.log('Result ', results);
});


// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// passport.authenticate middleware is used here to authenticate the request
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile'] // Used to specify the required data
}));

// The middleware receives the data from Google and runs the function on Strategy config
app.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
    pool.query("SELECT username FROM users WHERE google_id = ?", [req.user.id], (err, result) => {
        if(err) return console.log(err), res.send("an error occured");
        if(result[0]){
            res.send(`welcome back, ${result[0].username}`);
        }else{
            res.redirect("/create-account");
        }
    });
});

// Secret route
app.get('/create-account', isUserAuthenticated, (req, res) => {
    res.render("create-account", {displayName: req.user.displayName});
});

// create account route
app.post("/create-account", (req, res) => {
    pool.query("INSERT INTO users (username, google_id, photo) VALUES (?, ?, ?)", [req.body.username, req.user.id, req.user.photos[0].value], (err) => {
        if(err) return console.log(err), res.render("create-account", {display: req.user.displayName, err: "Username already exists!"});
        console.log(`Successfully created new account:\n\tUsername: ${req.body.username}\n\tGoogle ID: ${req.user.id}\n\tPhoto: ${req.user.photos[0].value}`);
        res.send("created your account!");
    });
})

// Logout route
app.get('/logout', (req, res) => {
    req.logout(); 
    res.redirect('/');
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}!`);
});