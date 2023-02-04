const containerEquipo = document.querySelector(".equipo-1");
const containerList = document.querySelector(".list-container");
const containerList2 = document.querySelector(".list-container2");
const buttonList = document.querySelector(".list-button");
const button = document.querySelector(".button-mix");
const mostrar = document.querySelector(".mostrar");
const input = document.querySelector(".input");
const list = document.querySelector(".list");
const buttonDelete = document.querySelector(".delete");


const players = [];
const equipoUno = [];
const equipoDos = [];

    
buttonList.addEventListener("click", addPlayer);

function addPlayer() {
  const value = input.value;

  if (value === "") {
    return;
  } else {
    const li = document.createElement("li");
    li.textContent = value;
    li.classList=("flex")
    list.appendChild(li);
    li.appendChild(deletePlayer());
    players.push(value);
   
  }
}

function deletePlayer() {
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "X";
  deleteButton.classList.add("btn-delete");
  


  deleteButton.addEventListener("click", (e) => {
    players.splice(players.indexOf(e.target.textContent), 1);
    const item = e.target.parentElement;
    list.removeChild(item);
  });
  return deleteButton;
}

button.addEventListener("click", (e) => {
  e.preventDefault;
  containerList.innerHTML = "";
  containerList2.innerHTML = "";
  mezclar();
});

function mezclar() {
  players.sort(() => Math.random() - 0.5);
  let dividir = Math.floor(players.length / 2);
  let equipo1 = players.slice(0, dividir);
  let equipo2 = players.slice(dividir);
  equipoUno.push(equipo1);
  equipoDos.push(equipo2);
  console.log(players);
  containerList.textContent = "Equipo 1: ";
  containerList2.textContent = "Equipo 2: ";

  equipo1.forEach((team1) => {
    const li = document.createElement("li");
    li.textContent = team1;
    containerList.appendChild(li);
  });
  equipo2.forEach((team2) => {
    const li = document.createElement("li");
    li.textContent = team2;
    containerList2.appendChild(li);
  });
}
