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
const tittleTeam = document.querySelector(".tittle-team");
const listPlayersContainer = document.querySelector(".list-players-container");

let players = [];

//Local Storage for players
function getPlayers() {
  let teamOnePlayers = JSON.parse(localStorage.getItem("teamOne"));
  let teamTwoPlayers = JSON.parse(localStorage.getItem("teamTwo"));
  console.log(teamOnePlayers);

  if (teamOnePlayers != null) {
    listPlayers.innerHTML = "";
    containerListOne.innerHTML = "Equipo 1: ";
    containerListTwo.innerHTML = "Equipo 2: ";
    containerDelete.appendChild(deleteList());

    teamOnePlayers.forEach((team1) => {
      const li = document.createElement("li");
      li.textContent = team1;
      containerListOne.appendChild(li);
    });
    teamTwoPlayers.forEach((team2) => {
      const li = document.createElement("li");
      li.textContent = team2;
      containerListTwo.appendChild(li);
    });
  } else {
    addPlayer();
  }
}

getPlayers();

window.addEventListener("load", addPlayer);
buttonList.addEventListener("click", (e) => {
  e.preventDefault();

  addPlayer();
});

function addPlayer() {
  let value = input.value;
  if (players.length > 0) {
    buttonMix.removeAttribute("disabled");
  }

  if (value === "") {
    return;
  } else {
    const li = document.createElement("li");
    li.innerHTML = `${players.length + 1} ${value}`;
    li.classList = "list-Players";
    listPlayers.appendChild(li);
    li.appendChild(deletePlayer());
    players.push(value);
    let jugadores = JSON.stringify(players);
    localStorage.setItem("players", jugadores);

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
  getPlayers();
  buttonMix.innerHTML = "Seguir Mezclando";
});

function mixTeams() {
  tittleTeam.innerHTML = `<h2>Equipos</h2>`;
  let getPlayers = JSON.parse(localStorage.getItem("players"));
  if (getPlayers != null) {
    console.log(getPlayers);
    getPlayers.sort(() => Math.random() - 0.5);
    let divide = Math.floor(getPlayers.length / 2);
    let mixOne = getPlayers.slice(0, divide);
    let mixTwo = getPlayers.slice(divide);
    let teamOne = JSON.stringify(mixOne);
    localStorage.setItem("teamOne", teamOne);
    let teamTwo = JSON.stringify(mixTwo);
    localStorage.setItem("teamTwo", teamTwo);
  } else {
    players.sort(() => Math.random() - 0.5);
    let divide = Math.floor(players.length / 2);
    let mixOne = players.slice(0, divide);
    let mixTwo = players.slice(divide);

    //teams to local storage
    let teamOne = JSON.stringify(mixOne);
    localStorage.setItem("teamOne", teamOne);
    let teamTwo = JSON.stringify(mixTwo);
    localStorage.setItem("teamTwo", teamTwo);
  }
}

function deleteList() {
  deleteAll.innerHTML = "Eliminar Equipos";
  deleteAll.classList.add("delete-all");
  deleteAll.addEventListener("click", (e) => {
    e.preventDefault();
    players = [];
    localStorage.clear();
    listPlayers.innerHTML = "";
    containerListOne.innerHTML = "";
    containerListTwo.innerHTML = "";
    containerDelete.innerHTML = "";
    tittleTeam.innerHTML = "";

    buttonMix.innerHTML = "Mezclar";
    buttonMix.setAttribute("disabled", "");
  });
  return deleteAll;
}
