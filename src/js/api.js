const fixtureApi = document.querySelector(".fixture-api");
const localContainer = document.querySelector(".local-container");
const visitanteContainer = document.querySelector(".visitante-container");
const infoApiContainer = document.querySelector(".info-api-container");
const buttonStandings = document.querySelector(".table-api");
const buttonNextGames = document.querySelector(".next-api");

buttonStandings.addEventListener("click", tablePositions);

async function tablePositions() {
  const tableLocal = sessionStorage.getItem("apiData");
  try {
    if (tableLocal != null) {
      // Si la información ya existe en SessionStorage, la muestra en pantalla
      renderTable();
    } else {
      const options = {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": "ea8ec82cebb59731159876110f477704",
          "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
        },
      };
      const response = await fetch(
        "https://v3.football.api-sports.io/standings?league=128&season=2023",
        options
      );
      const data = await response.json();
      const standings = data.response[0].league.standings[1];
      sessionStorage.setItem("apiData", JSON.stringify(standings));
      renderTable();
    }
  } catch (error) {
    console.error(error);
  }
}

async function renderTable() {
  infoApiContainer.innerHTML = "";
  const apiData = JSON.parse(sessionStorage.getItem("apiData"));
  infoApiContainer.innerHTML = `
    <tbody class="tbody-container">
    <figure>
      <table class="table-container">
        <thead class="thead-container">
      <tr>
          <th>Posicion</th>
          <th><span></span></th>
          <th>Club</th>
          <th>PJ</th>
          <th>G</th>
          <th>E</th>
          <th>P</th>
          <th>GF</th>
          <th>GC</th>
          <th>DG</th>
          <th>Pts</th>
          </tr>
        </thead>
      </table>
    </figure>
  </tbody>
`;
  const thead = document.querySelector(".thead-container");
  const tableContainer = document.querySelector(".table-container");

  await apiData.map((positions) => {
    thead.innerHTML += `
            <tr>
            <td>${positions.rank}</td>
            <td><img class="logo-tabla"src="${positions.team.logo}"></td>
            <td>${positions.team.name}</td>
            <td>${positions.all.played}</td>
            <td>${positions.all.win}</td>
            <td>${positions.all.draw}</td>
            <td>${positions.all.lose}</td>
            <td>${positions.all.goals.for}</td>
            <td>${positions.all.goals.against}</td>
            <td>${positions.goalsDiff}</td>
            <td>${positions.points}</td>
            </tr>          `;

    tableContainer.append(thead);
  });
}

buttonNextGames.addEventListener("click", nextGames);

function nextGames() {
  const round = sessionStorage.getItem("round");
  if (round != null) {
    renderRounds();
  } else {
    const options = {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": "ea8ec82cebb59731159876110f477704",
        "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
      },
    };

    fetch(
      "https://v3.football.api-sports.io/fixtures?league=128&season=2023&next=14&timezone=America/Argentina/Buenos_Aires",
      options
    )
      .then((response) => response.json())
      .then((response) => {
        const data = response.response;
        sessionStorage.setItem("Rounds", JSON.stringify(data));
        renderRounds();
      })

      .catch((err) => console.log(err));
  }
}

function renderRounds() {
  const data = JSON.parse(sessionStorage.getItem("Rounds"));

  infoApiContainer.innerHTML = "";
  data.forEach((fixture) => {
    const gameTime = fixture.league.round;
  });

  data.forEach((partidos) => {
    const dateGame = new Date(partidos.fixture.date);
    const dateArg = dateGame.toLocaleString("en-GB");
    const homeLogo = partidos.teams.home.logo;
    const awayLogo = partidos.teams.away.logo;

    let goalHome = partidos.goals.home;
    let goalAway = partidos.goals.away;
    if (goalAway === null || goalHome === null) {
      goalAway = 0;
      goalHome = 0;
    }
    infoApiContainer.innerHTML += ` 
  <article class="article-container">
  <div class="info-container">
  <p>Partido de la fecha : ${partidos.league.round}</p>
  <div class="teams-container">
  <img src="${homeLogo}"class="local-logo"><p>${partidos.teams.home.name}</p>
  <img src="${awayLogo}"class="local-logo"><p>${partidos.teams.away.name}</p>
  </div>
  <p>Horario : ${dateArg}</p>
  <p>Estadio : ${partidos.fixture.venue.name}</p>
  </div>
  </article>

  `;
  });
}

//function getData and save to SessionStorage

function getData() {
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "ea8ec82cebb59731159876110f477704",
      "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
    },
  };

  fetch(
    "https://v3.football.api-sports.io/standings?league=128&season=2023",
    options
  )
    .then((response) => response.json())
    .then((response) => {
      const info = response.response;
      const data = sessionStorage.setItem(info);
    });
}
