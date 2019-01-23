const createTerm = () => {
    const container = document.getElementById("terms");

    const newTerm = document.createElement("div");
    newTerm.className = "term container";

    const termInput = document.createElement("input");
    termInput.type = "text";
    termInput.name = "terms";
    termInput.placeholder = "term";

    const definitionInput = document.createElement("input");
    definitionInput.type = "text";
    definitionInput.name = "definitions";
    definitionInput.placeholder = "definition";

    newTerm.appendChild(termInput);
    newTerm.appendChild(definitionInput);

    container.appendChild(newTerm);

    return newTerm;
}

const getLastInput = () => {
    const els = document.getElementsByClassName("term");
    return els[els.length - 1].getElementsByTagName("input")[1];
}

const createOnTab = (e) => {
    if(e.keyCode === 9){
        e.preventDefault();

        lastInput.removeEventListener("keydown", createOnTab);

        const el = createTerm();
        lastInput = el.getElementsByTagName("input")[1];

        lastInput.addEventListener("keydown", createOnTab);
        el.getElementsByTagName("input")[0].focus();
    }
}

let lastInput = getLastInput();
lastInput.addEventListener("keydown", createOnTab);

document.getElementById("add-term").addEventListener("click", () => {
    lastInput.removeEventListener("keydown", createOnTab);
    
    const el = createTerm();
    lastInput = el.getElementsByTagName("input")[1];

    lastInput.addEventListener("keydown", createOnTab);
    el.getElementsByTagName("input")[0].focus();
});
