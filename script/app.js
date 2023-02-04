const containerListOne = document.querySelector(".list-containerOne");
const containerListTwo = document.querySelector(".list-containerTwo");
const buttonList = document.querySelector(".list-button");
const buttonMix = document.querySelector(".button-mix");
const form = document.querySelector(".form");
const deleteAll = document.createElement("button");
const input = document.querySelector(".input");
const listPlayers = document.querySelector(".list");
const containerTeams = document.querySelector(".container-teams");
const containerDelete = document.querySelector(".container-delete");


let players = [];
let teamOne = [];
let teamTwo = [];

window.addEventListener("load", addPlayer);
buttonList.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("object");
  addPlayer();
});

function addPlayer() {
  const value = input.value;
  players.length > 2
    ? buttonMix.removeAttribute("disabled")
    : buttonMix.setAttribute("disabled", "");
  if (value === "") {
    return;
  } else {
    const li = document.createElement("li");
    li.innerHTML = `${players.length +1} ${value}`;
    li.classList = "list-Players";
    listPlayers.appendChild(li);
    li.appendChild(deletePlayer());
    players.push(value);
    form.reset();
  }
}

function deletePlayer() {
  const deletePlayer = document.createElement("a");
  deletePlayer.innerHTML = "❌";
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

  mixTeams();
});

function mixTeams() {
  players.sort(() => Math.random() - 0.5);
  let divide = Math.floor(players.length / 2);
  let mixOne = players.slice(0, divide);
  let mixTwo = players.slice(divide);
  teamOne.push(mixOne);
  teamTwo.push(mixTwo);
  listPlayers.innerHTML = "";
  containerListOne.innerHTML = "Equipo 1: ";
  containerListTwo.innerHTML = "Equipo 2: ";
  containerDelete.appendChild(deleteList())

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

function deleteList() {
  deleteAll.innerHTML = "Eliminar Equipos";
  deleteAll.classList.add("delete-all");
  deleteAll.addEventListener("click", (e) => {
    e.preventDefault();
    players = [];
    listPlayers.innerHTML = "";
    containerListOne.innerHTML = "";
    containerListTwo.innerHTML = "";
    
  });
  return deleteAll;
}
