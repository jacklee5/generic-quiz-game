module.exports = (io, pool) => {
    //game stuff
    const games = {};

    //keep track of user data
    const playerData = {};

    //time per question in seconds
    const QUESTION_TIME = 10;
    const RESULTS_VIEW_TIME = 5;

    const getId = () => Math.random().toString(36).substr(2, 5);
    Array.prototype.choice = function() {
        return this[Math.floor(Math.random() * this.length)];
    }
    Array.prototype.shuffle = function(){
        const temp = [];
        let len = this.length;
        for(let i = 0; i < len; i++){
            let index = Math.floor(Math.random() * this.length);
            temp.push(this.splice(index, 1)[0]);
        }
        for(let i = 0; i < len; i++){
            this[i] = temp[i];
        }
    }
    const generateQuestion = (id) => {
        const result = {};
        const terms = games[id].terms;
        const temp = terms[games[id].questionsAsked];
        result.question = temp.term;

        result.answers = [];
        result.answers.push(temp.definition);
        const answer = temp.definition;

        const numAnswers = terms.length >= 4 ? 3 : terms.length - 1;
        for(let i = 0; i < numAnswers; i++){
            let temp = terms.choice();
            while(result.answers.indexOf(temp.definition) != -1){
                temp = terms.choice();
            }
            result.answers.push(temp.definition);
        }

        result.answers.shuffle();

        return [result, answer];
    }

    //determine if all players have answerd
    const allAnswered = (players) => {
        for(let i = 0; i < players.length; i++){
            if(!playerData[players[i]].answered) return false;
        }
        return true;
    }

    //ask new question
    const askQuestion = (gameId) => {
        //if no more questions, end the game
        if(games[gameId].questionsAsked >= games[gameId].terms.length){
            io.in(gameId).emit("game over");
            sendResults(gameId);
            
            //delete the data
            const players = games[gameId].players;
            for(let i = 0; i < players.length; i++){
                delete playerData[players[i]];
            }
            delete games[gameId];
            return;
        }

        const question = generateQuestion(gameId);
        io.in(gameId).emit("new question", question[0]);
        games[gameId].curQuestion = question;
        games[gameId].questionStartTime = Date.now();
        games[gameId].askingQuestion = true;
        games[gameId].questionsAsked++;
        games[gameId].showingResults = false;

        //reset all question status for users
        const players = games[gameId].players;
        for(let i = 0; i < players.length; i++){
            playerData[players[i]].answered = false;
        }
    }

    const sendResults = (id) => {
        const scores = [];
        const players = games[id].players;
        for(let i = 0; i < players.length; i++){
            const data = playerData[players[i]];
            scores[i] = {username: data.username, points: data.points}; 
        }
        scores.sort((a, b) => {
            return b.points - a.points;
        })
        io.in(id).emit("results", scores);
    }

    io.on('connection', function (socket) {
        console.log("a player connected");
        socket.on("new game", (setId, username) => {
            const id = getId();

            games[id] = {setId: setId, players: [socket.id], leader: socket.id, setId: setId};
            playerData[socket.id] = {};
            playerData[socket.id].room = id;
            playerData[socket.id].username = username;
            playerData[socket.id].points = 0;

            socket.emit("gameId", id);
            socket.join(id);

            socket.emit("add player", socket.id, username);
        })
        socket.on("new player", (id, username) => {
            id = id.toLowerCase();
            console.log("a player joined game " + id);
            if(!games[id]) return socket.emit("join err", "Incorrect code!")

            const players = games[id].players;

            players.push(socket.id);
            playerData[socket.id] = {};
            playerData[socket.id].room = id;
            playerData[socket.id].username = username;
            playerData[socket.id].points = 0;

            socket.join(id);
            socket.to(id).emit("add player", socket.id, username);
            for(let i = 0; i < players.length; i++){
                socket.emit("add player", players[i], playerData[players[i]].username);
            }
            socket.emit("join success");
        });
        socket.on("start game", () => {
            console.log("Starting game " + playerData[socket.id].room);
            const id = playerData[socket.id].room;

            //start loading set
            pool.query("SELECT term, definition FROM term WHERE term.set_id = ?", [games[id].setId], (err, results) => {
                if(err) return console.log(err);
                results.shuffle();
                games[id].terms = results;
                io.in(playerData[socket.id].room).emit("start game success");
                games[id].questionsAsked = 0;

                askQuestion(id);
            });
        });
        socket.on("answer", (answer) => {
            const id = playerData[socket.id].room;
            const correctAns = games[id].curQuestion[1];
            const points = Math.round(1000 - ((Date.now() - games[id].questionStartTime) / QUESTION_TIME));
            if(correctAns != answer){
                socket.emit("wrong answer", correctAns);
            }else{
                socket.emit("correct answer", correctAns, points);
                playerData[socket.id].points += points;
            }
            playerData[socket.id].answered = true;

            sendResults(id);
            
            if(allAnswered(games[id].players)){
                io.in(id).emit("question timeout");
                games[id].askingQuestion = false;
                games[id].resultsStartTime = Date.now();
                games[id].showingResults = true;
            }
        })
        socket.on("disconnect", () => {
            console.log("a player disconnected");
            if(!playerData[socket.id]) return;
            const game = playerData[socket.id].room;
            if(!games[game]) return;

            if(games[game].leader === socket.id){
                socket.to(game).emit("join err", "Leader left!");
                return delete games[game];
            }

            io.in(game).emit("remove player", socket.id);
            const players = games[game].players;
            players.splice(players.indexOf(socket.id), 1);
            delete playerData[socket.id];

            if(games[game] && games[game].players.length == 0){
                delete games[game];
            }
        })
    });

    //timer
    setInterval(() => {
        for(let i in games){
            if(Date.now() - games[i].questionStartTime >= QUESTION_TIME * 1000 && games[i].askingQuestion){
                io.in(i).emit("question timeout");
                games[i].askingQuestion = false;
                games[i].resultsStartTime = Date.now();
                games[i].showingResults = true;

                //tell all remaining players correct answer
                const players = games[i].players;
                for(let j = 0; j < players.length; j++){
                    if(!playerData[players[j]].answered) io.to(players[j]).emit("wrong answer", games[i].curQuestion[1]);
                }
            }
            if(Date.now() - games[i].resultsStartTime >= RESULTS_VIEW_TIME * 1000 && games[i].showingResults){
                askQuestion(i);
            }
        }
    }, 50);
}