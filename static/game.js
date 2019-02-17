const answer = 'gay2';

const changeQuestionText = (text) => {
    var elem = document.getElementById("qstn");
    if (text === answer){
        elem.textContent = 'Correct!';
    } else {
        elem.textContent = 'No!';
    }
}

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
    socket.emit("new game", Number(getSetId), username);

    //display game code
    socket.on("gameId", (id) => {
        document.getElementById("game-id").textContent = id;
    });

    //start game button
    document.getElementById("start-game-button").addEventListener("click", () => {
        socket.emit("start game");
    })
}else{
    showPage("join");
    document.getElementById("start-game-button").style.display = "none";
}

//lobby stuff
//handle player join
socket.on("add player", (id, username) => {
    console.log(id);
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
socket.on("game start success", () => {
    showPage("game");
})