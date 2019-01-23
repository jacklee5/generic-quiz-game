const createTerm = () => {
    const container = document.getElementById("terms");

    const newTerm = document.createElement("div");
    newTerm.className = "term";

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
}

