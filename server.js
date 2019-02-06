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
        clientID: '610620061218-7o8o31ebmroqhnfa5n9rp16h3a3s65as.apps.googleusercontent.com',
        clientSecret: 'eyr1llCNsCEvwVaBqqLmZ7Nz',
        callbackURL: 'http://localhost:8000/auth/google/callback'
    },
    (accessToken, refreshToken, profile, done) => {
        done(null, profile); // passes the profile data to serializeUser
    }
));

//store google data for users that haven't been created yet
const googleData = {}

// Used to stuff a piece of information into a cookie
passport.serializeUser((user, done) => {
    if(user.provider) googleData[user.id] = user;
    done(null, user.id);
});

// Used to decode the received cookie and persist session
passport.deserializeUser((id, done) => {
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
        done(null, {
            user_id: results[0].id,
            id: results[0].google_id,
            username: results[0].username,
            photo: results[0].photo
        });
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
    connectionLimit : 10,
    host            : 'den1.mysql1.gear.host',
    user            : 'genericquizgame',
    password        : 'Pd234wVLHe~?',
    database        : 'genericquizgame',
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
    res.render("create-set");
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
    pool.query("INSERT INTO TermSet (name, creator_id) VALUES (?, ?)", [req.body.setname, req.user.user_id], (err, results, fields) => {
        if(err) return console.log(err);
        let insertId = results.insertId;
        termData = termData.map(x => [insertId, x[1], x[2]]);
        pool.query("INSERT INTO Term (set_id, term, definition) VALUES ?", [termData], (err, results, fields) => {
            if(err) return console.log(err);
            res.redirect("/show-set/" + insertId);
        })
    })
})

//show set route
app.get("/show-set/:setid", (req, res) => {
    pool.query(`
    SELECT term, definition, TermSet.name, Users.username
    FROM Term, TermSet, Users
    WHERE TermSet.set_id = ?
    AND Term.set_id = TermSet.set_id
    AND (TermSet.creator_id = users.id OR TermSet.creator_id IS NULL)`, [req.params.setid], (err, results, fields) => {
        if(err) return console.log(err);
        if(results.length < 1) return res.send("an error occured but we don't know what");
        res.render("show-set", {setTitle: results[0].name, creatorName: results[0].username, terms: results});
    })
})

//account route
app.get("/account", isUserAuthenticated, (req, res) => {
    pool.query("SELECT set_id, name FROM termset WHERE creator_id = ?", [req.user.user_id], (err, results, fields) => {
        if(err) return console.log(err);
        res.render("account.ejs", {
            username: req.user.username,
            pfp: req.user.photo,
            sets: results
        });
    })
});

// create account route
app.get('/create-account', (req, res) => {
    if(!req.user) return res.redirect("/");
    res.render("create-account");
});
app.post("/create-account", (req, res) => {
    if (!req.user) return res.redirect("/");
    pool.query("INSERT INTO users (username, google_id, photo) VALUES (?, ?, ?)", [req.body.username, req.user.id, req.user.photo], (err) => {
        if(err) return console.log(err), res.render("create-account", {display: req.user.displayName, err: "Username already exists!"});
        console.log(`Successfully created new account:\n\tUsername: ${req.body.username}\n\tGoogle ID: ${req.user.id}\n\tPhoto: ${req.user.photo}`);
        res.redirect("/account");
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