const addTerm = (term, definition) => {
    const container = document.getElementById("terms");

    const newTerm = document.createElement("div");
    newTerm.className = "term container";

    const termInput = document.createElement("input");
    termInput.type = "text";
    termInput.value = term;
    termInput.readOnly = true;

    const definitionInput = document.createElement("input");
    definitionInput.type = "text";
    definitionInput.value = definition;
    termInput.readOnly = true;

    newTerm.appendChild(termInput);
    newTerm.appendChild(definitionInput);

    container.appendChild(newTerm);

    return newTerm;
}

//get set id from url
const getSetId = () => {
    const params = window.location.pathname.split("/");
    return params[params.length - 1];
}

const loadTerms = () => {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(xhttp.responseText);
            document.getElementById("set-title").textContent = data.setTitle;
            document.title = data.setTitle;
            document.getElementById("creator-name").textContent = data.creatorName;
            const terms = data.terms;
            for(let i = 0; i < terms.length; i++){
                addTerm(terms[i].term, terms[i].definition);
            }
            document.getElementById("loading").style.display = "none";
            document.getElementById("content").style.display = "block";
        }
    };
    xhttp.open("GET", "/api/get-set/" + getSetId(), true);
    xhttp.send();
}

loadTerms();