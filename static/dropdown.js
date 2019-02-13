window.onload = function() {
    console.log(document.getElementById("profile-button"))
    const getDropdownState = () => {
        return window.getComputedStyle(document.getElementById("profile-dropdown"), null).display;
    }
    document.getElementById("profile-button").addEventListener("click", (e) => {
        if(getDropdownState() === "none") {
            e.stopPropagation();
            document.getElementById("profile-dropdown").style.display = "block"
        };
    });
    document.body.addEventListener("click", (e) => {
        if(getDropdownState() === "block"){
            e.preventDefault();
            document.getElementById("profile-dropdown").style.display = "none";
        }
    })
}