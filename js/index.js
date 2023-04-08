const containerListOne = document.querySelector(".list-containerOne");
const containerListTwo = document.querySelector(".list-containerTwo");
const buttonList = document.querySelector(".list-button");
const buttonMix = document.querySelector(".button-mix");
const form = document.querySelector(".form");
const deleteAll = document.createElement("button");
const input = document.querySelector(".input");
const ulList = document.querySelector(".ul-list");
const containerTeams = document.querySelector(".container-teams");
const containerDelete = document.querySelector(".container-delete");
const tittleTeam = document.querySelector(".tittle-team");
const listPlayersContainer = document.querySelector(".list-players-container");

let players = [];

//listeners
buttonList.addEventListener("click", (e) => {
  e.preventDefault();
  addPlayer();
});

//toogle mix button

function updateMixButtonState() {
  if (players.length <= 2) {
    buttonMix.setAttribute("disabled", "");
  } else {
    buttonMix.removeAttribute("disabled", "");
  }
}

//add players to list

function addPlayer() {
  let value = input.value;
  updateMixButtonState();

  if (value === "") {
    return;
  } else {
    const li = document.createElement("li");
    li.textContent = `${players.length + 1} - ${value}`;
    li.classList = "list-Players";
    ulList.appendChild(li);
    li.appendChild(deletePlayer());
    players.push(value);
    let stringPlayers = JSON.stringify(players);
    localStorage.setItem("players", stringPlayers);
    form.reset();
  }
}

//Local Storage for players
function getPlayers() {
  let teamOnePlayers = JSON.parse(localStorage.getItem("teamOne"));
  let teamTwoPlayers = JSON.parse(localStorage.getItem("teamTwo"));

  if (teamOnePlayers != null) {
    tittleTeam.innerHTML = `<h2>Equipos</h2>`;
    ulList.textContent = "";
    containerListOne.textContent = "Equipo 1: ";
    containerListTwo.textContent = "Equipo 2: ";
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

//delete player

function deletePlayer() {
  const deletePlayer = document.createElement("a");
  deletePlayer.textContent = "❌";
  deletePlayer.classList.add("btn-delete");

  deletePlayer.addEventListener("click", (e) => {
    players.splice(players.indexOf(e.target.textContent), 1);
    const item = e.target.parentElement;
    ulList.removeChild(item);
  });
  return deletePlayer;
}

buttonMix.addEventListener("click", (e) => {
  e.preventDefault();
  containerListOne.textContent = "";
  containerListTwo.textContent = "";
  mixTeams();
  getPlayers();

  buttonMix.textContent = "Seguir Mezclando";
});

function mixTeams() {
  let playersLocal = JSON.parse(localStorage.getItem("players"));

  console.log(playersLocal);
  tittleTeam.innerHTML = `<h2>Equipos</h2>`;
  if (playersLocal != null) {
    playersLocal.sort(() => Math.random() - 0.5);
    let divide = Math.floor(playersLocal.length / 2);
    let mixOne = playersLocal.slice(0, divide);
    let mixTwo = playersLocal.slice(divide);
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
  deleteAll.textContent = "Eliminar Equipos";
  deleteAll.classList.add("delete-all");
  deleteAll.addEventListener("click", (e) => {
    e.preventDefault();
    players = [];
    localStorage.clear();
    ulList.textContent = "";
    containerListOne.textContent = "";
    containerListTwo.textContent = "";
    containerDelete.textContent = "";
    tittleTeam.textContent = "";

    buttonMix.textContent = "Mezclar";
    buttonMix.setAttribute("disabled", "");
  });
  return deleteAll;
}
