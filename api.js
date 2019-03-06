module.exports = (isUserAuthenticated, pool) => {
    const express = require('express');
    const app = express.Router();
    const moment = require("moment");
    app.get("/set/:setid", (req, res) => {
        pool.query(`
        SELECT term, definition, termset.name, users.username
        FROM term, termset, users
        WHERE termset.set_id = ?
        AND term.set_id = termset.set_id
        AND (termset.creator_id = users.user_id OR termset.creator_id IS NULL)`, [req.params.setid], (err, results, fields) => {
            if (err) return console.log(err);
            if (results.length < 1) return res.send("an error occured but we don't know what");
            res.send(JSON.stringify({
                setTitle: results[0].name,
                creatorName: results[0].username,
                terms: results
            }));
        })
    });
    app.delete("/set/:setid", (req, res) => {
        pool.query("DELETE FROM termset WHERE termset.set_id = ?", [req.params.setid], err => {
            if(err) return console.log(err);
            res.send("ok");
        });
    });

    //get the sets of the current user
    app.get("/sets", isUserAuthenticated, (req, res) => {
        pool.query("SELECT set_id, name, set_creation_date FROM termset WHERE creator_id = ?", [req.user.user_id], (err, results, fields) => {
            if(err) return console.log(err);
            results = results.map(x => Object.assign({timeSinceCreated: moment(x.set_creation_date).fromNow()}, x));
            res.send(results);
        })
    });
    //get the friends of the current user
    app.get("/friends", isUserAuthenticated, (req, res) => {
        pool.query("SELECT user_id, photo, username FROM users, friends WHERE users.user_id = friends.friender AND friends.friendee = ?", [req.user.user_id], (err, results) => {
            if(err) return console.log(err);
            res.send(results);
        })
    });
    //get the friends of a specific user
    app.get("/friends/:userid", (req, res) => {
        pool.query("SELECT user_id, photo, username FROM users, friends WHERE users.user_id = friends.friender AND friends.friendee = ?", [req.params.userid], (err, results) => {
            if(err) return console.log(err);
            res.send(results);
        })
    })
    //get sets of other users
    app.get("/sets/:userid", (req, res) => {
        pool.query("SELECT set_id, name, set_creation_date FROM termset WHERE creator_id = ?", [req.params.userid], (err, results, fields) => {
            if(err) return console.log(err);
            results = results.map(x => Object.assign({timeSinceCreated: moment(x.set_creation_date).fromNow()}, x));
            res.send(results);
        })
    });

    //gets data (username and photo) of other users
    app.get("/user/:userid", (req, res) => {
        pool.query("SELECT username, photo FROM users WHERE user_id = ?", [req.params.userid], (err, results) => {
            if(err) return console.log(err);
            if(results.length === 0) return res.sendStatus(404);
            res.send(results[0]);
        })
    });
    app.get("/friend-code", isUserAuthenticated, (req, res) => {
        pool.query("SELECT friend_code FROM users WHERE user_id = ?", [req.user.user_id], (err, results) => {
            if(err) return console.log(err);
            if(results.length === 0) return res.sendStatus(404);
            if(results[0].friend_code === null){
                const id = Math.random().toString(36).substr(2, 5);
                res.send(id);
                pool.query("UPDATE users SET friend_code = ? WHERE user_id = ?", [id, req.user.user_id], (err) => {
                    if(err) return console.log(err);
                })
            }else{
                res.send(results[0].friend_code);
            }
        })
    })

    return app;
};