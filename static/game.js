//play noises from hell
var playSound = function(file) {
    var snd1 = new Audio();
    var src1 = document.createElement("source");
    src1.type = "audio/mpeg";
    src1.src = file;
    snd1.appendChild(src1);
    snd1.loop = true;
    snd1.play();
};
playSound("/static/kirb.mp3");

const showPage = (pageId) => {
    const pages = document.getElementsByClassName("page");
    for(let i = 0; i < pages.length; i++){
        pages[i].style.display = "none";
    }
    document.getElementById(pageId).style.display = "block";
}

const getSetId = () => {
    const params = window.location.pathname.split("/");
    return params[params.length - 1];
}

const socket = io();
const username = document.getElementById("username").textContent;
const usernames = {};

//join page stuff
document.getElementById("join-form").addEventListener("submit", (e) => {
    e.preventDefault();
    socket.emit("new player", document.getElementById("join-code").value, username);
    document.getElementById("game-id").textContent = document.getElementById("join-code").value;
})
socket.on("join err", (message) => {
    showPage("join");

    const errEl = document.getElementById("join-error");
    errEl.style.display = "block";
    errEl.textContent = message;

    document.getElementById("join-code").value = "";
})
socket.on("join success", () => {
    showPage("lobby");
})

//if they are the host, display the lobby and do host stuff
if(!isNaN(getSetId())){
    showPage("lobby");
    //ask for new game
    socket.emit("new game", Number(getSetId()), username);

    //display game code
    socket.on("gameId", (id) => {
        document.getElementById("game-id").textContent = id;
    });

    //start game button
    document.getElementById("start-game-button").addEventListener("click", () => {
        socket.emit("start game");
        showPage("loading");
    })
}else{
    showPage("join");
    document.getElementById("start-game-button").style.display = "none";
}

//lobby stuff
//handle player join
socket.on("add player", (id, username) => {
    usernames[id] = username;

    const playerEl = document.createElement("div");
    playerEl.className = "player"
    playerEl.textContent = username;
    playerEl.id = "player" + id;

    document.getElementById("player-list").appendChild(playerEl);
    document.getElementById("player-count").textContent = Object.keys(usernames).length;
})
//handle player leave
socket.on("remove player", (id) => {
    document.getElementById("player-list").removeChild(document.getElementById("player" + id));

    delete usernames[id];
    document.getElementById("player-count").textContent = Object.keys(usernames).length;
})

//game page stuff
//open game page if game starts
socket.on("start game success", () => {
    showPage("game");
});
//bind listeners to all buttons
for(let i = 1; i <= 4; i++){
    document.getElementById("btn" + i).addEventListener("click", function() {
        socket.emit("answer", this.textContent);
    })
}
//display questions
//time that last question started
let questionTime = 0;
//time that results started viewing
let resultsTime = 0;
const displayQuestion = (question) => {
    document.getElementById("qstn").textContent = question.question;
    for(let i = 1; i <= question.answers.length; i++){
        const button = document.getElementById("btn" + i);
        button.textContent = question.answers[i - 1];
    }
}
socket.on("new question", (question) => {
    showPage("game");
    displayQuestion(question);
    questionTime = Date.now();
    countDown = true;
    requestAnimationFrame(updateGameTimer);
})
socket.on("wrong answer", (ans) => {
    showPage("results");
    document.querySelector("#results header").className = "incorrect";
    document.querySelector("#results header .material-icons").textContent = "close";
    document.querySelector("#results header h1").textContent = "Incorrect";
    document.getElementById("feedback-text").textContent = "The correct answer was:"
    document.getElementById("answer-text").textContent = ans;document.getElementById("points-gained").textContent = 0;
});
socket.on("correct answer", (ans, points) => {
    showPage("results");

    document.querySelector("#results header").className = "correct";
    document.querySelector("#results header .material-icons").textContent = "check";
    document.querySelector("#results header h1").textContent = "Correct";
    document.getElementById("feedback-text").textContent = "You correctly said that the answer was:"
    document.getElementById("answer-text").textContent = ans;
    document.getElementById("points-gained").textContent = points;
});
//timer
//time per question in seconds
const QUESTION_TIME = 10;
const RESULTS_VIEW_TIME = 5;
let countDown = false;
let resultsCountDown = false;
//update game timer
const updateGameTimer = () => {
    if(!countDown) return;
    const percentDone = 100 - ((Date.now() - questionTime) / (QUESTION_TIME * 10));
    document.getElementById("timer").style.width = percentDone + "%";
    requestAnimationFrame(updateGameTimer);
}
requestAnimationFrame(updateGameTimer);

//update results timer
const updateResultsTimer = () => {
    if(!resultsCountDown) return;
    const percentDone = 100 - ((Date.now() - resultsTime) / (RESULTS_VIEW_TIME * 10));
    document.getElementById("results-timer").style.width = percentDone + "%";
    requestAnimationFrame(updateResultsTimer);
}

//respond if server says timeout
socket.on("question timeout", () => {
    document.getElementById("timer").style.width = "0%";
    countDown = false;
    resultsCountDown = true;
    resultsTime = Date.now();
    requestAnimationFrame(updateResultsTimer);
})

//display stats
document.getElementById("gameover_buttons").style.display = "none";
socket.on("results", (data) => {
    const tableEl = document.getElementById("results-table");
    tableEl.innerHTML = ""
    const hRow = document.createElement("tr");
    ["Rank", "Username", "Points"].map(x => {
        const thEl = document.createElement("th");
        thEl.textContent = x;
        hRow.appendChild(thEl);
    });
    tableEl.appendChild(hRow);
    for(let i = 0; i < data.length; i++){
        const row = document.createElement("tr");
        [i + 1, data[i].username, data[i].points].map(x => {
            const thEl = document.createElement("th");
            thEl.textContent = x;
            row.appendChild(thEl);
        });
        tableEl.appendChild(row);
    }
})

socket.on("game over", () => {
    showPage("results");
    const x = document.getElementById("results");
    x.className = "background-primary";
    x.style.height = "100vh";
    document.getElementById("results-table").style.background = "#f2efea";
    document.getElementById("timer-bar").style.display = "none";
    document.getElementById("results-banner").style.display = "none";
    document.getElementById("gameover_buttons").style.display = "block";

    
})
