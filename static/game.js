const answer = 'gay2';

const changeQuestionText = (text) => {
    var elem = document.getElementById("qstn");
    if (text === answer){
        elem.textContent = 'Correct!';
    } else {
        elem.textContent = 'No!';
    }
}