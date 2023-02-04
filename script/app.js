const containerListOne = document.querySelector(".list-containerOne");
const containerListTwo = document.querySelector(".list-containerTwo");
const buttonList = document.querySelector(".list-button");
const buttonMix = document.querySelector(".button-mix");
const input = document.querySelector(".input");
const listPlayers = document.querySelector(".list");
const containerTeams = document.querySelector(".container-teams");

let players = [];
let teamOne = [];
let teamTwo = [];

window.addEventListener("load",addPlayer)
buttonList.addEventListener("click", addPlayer);
buttonList.addEventListener("keydown", addPlayer);



function addPlayer() {
  const value = input.value;
  players.length > 2
    ? buttonMix.removeAttribute("disabled")
    : buttonMix.setAttribute("disabled", "");

  if (value === "") {
    return;
  } else {
    const li = document.createElement("li");
    li.innerHTML = `- ${value}` ;
    li.classList = "list-Players";
    listPlayers.appendChild(li);
    li.appendChild(deletePlayer());
    players.push(value);
    input.value = "";
  }
}

function deletePlayer() {
  const deletePlayer = document.createElement("button");
  deletePlayer.textContent = "X";
  deletePlayer.classList.add("btn-delete");

  deletePlayer.addEventListener("click", (e) => {
    players.splice(players.indexOf(e.target.textContent), 1);
    const item = e.target.parentElement;
    listPlayers.removeChild(item);
  });
  return deletePlayer;
}

buttonMix.addEventListener("click", (e) => {
  e.preventDefault();
  containerListOne.innerHTML = "";
  containerListTwo.innerHTML = "";

  mezclar();
});

function mezclar() {
  players.sort(() => Math.random() - 0.5);
  let divide = Math.floor(players.length / 2);
  let mixOne = players.slice(0, divide);
  let mixTwo = players.slice(divide);
  teamOne.push(mixOne);
  teamTwo.push(mixTwo);
  listPlayers.innerHTML = "";
  containerTeams.appendChild(deleteList());
  containerListOne.textContent = "Equipo 1: ";
  containerListTwo.textContent = "Equipo 2: ";

  mixOne.forEach((team1) => {
    const li = document.createElement("li");
    li.textContent = team1;
    containerListOne.appendChild(li);
  });
  mixTwo.forEach((team2) => {
    const li = document.createElement("li");
    li.textContent = team2;
    containerListTwo.appendChild(li);
  });
}
const deleteAll = document.createElement("button");

function deleteList() {
  deleteAll.innerHTML = "Eliminar Equipos";
  deleteAll.classList.add("delete-all");
  deleteAll.addEventListener("click", () => {
    players = [];
    containerListOne.innerHTML = "";
    containerListTwo.innerHTML = "";
  });
  return deleteAll;
}
