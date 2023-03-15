const fixtureApi = document.querySelector(".fixture-api");
const localContainer = document.querySelector(".local-container");
const visitanteContainer = document.querySelector(".visitante-container");
const infoApiContainer = document.querySelector(".info-api-container");
const buttonStandings = document.querySelector(".table-api");
const buttonNextGames = document.querySelector(".next-api");
const buttonNowGames = document.querySelector(".now-api");

/* Event handlers */
buttonNowGames.addEventListener("click", getGamesToday);
buttonStandings.addEventListener("click", tablePositions);
buttonNextGames.addEventListener("click", nextGames);

async function tablePositions() {
  try {
    infoApiContainer.setAttribute("aria-busy", "true");
    const tableLocal = sessionStorage.getItem("apiData");
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
    console.log(error);
    infoApiContainer.innerHTML = `
    <h1>Contenido no disponible intente mas tarde</h1>
    `;
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
    infoApiContainer.setAttribute("aria-busy", "false");
  });
}

async function nextGames() {
  try {
    infoApiContainer.setAttribute("aria-busy", "true");
    const round = sessionStorage.getItem("round");
    if (round != null) {
      renderNextGames();
    } else {
      const options = {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": "ea8ec82cebb59731159876110f477704",
          "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
        },
      };

      const response = await fetch(
        "https://v3.football.api-sports.io/fixtures?league=128&season=2023&next=14&timezone=America/Argentina/Buenos_Aires",
        options
      );
      const data = await response.json();
      const resp = data.response;
      sessionStorage.setItem("Rounds", JSON.stringify(resp));
      renderNextGames();
    }
  } catch (error) {
    console.log(error);
    infoApiContainer.innerHTML = `
    <h1>Contenido no disponible intente mas tarde</h1>
    `;
  }
}

function renderNextGames() {
  infoApiContainer.innerHTML = "";
  const data = JSON.parse(sessionStorage.getItem("Rounds"));

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
    infoApiContainer.setAttribute("aria-busy", "false");
  });
}

//function getData and save to SessionStorage

async function getGamesToday() {
  try {
    infoApiContainer.setAttribute("aria-busy", "true");
    const gamesToday = sessionStorage.getItem("gamesToday");
    if (gamesToday != null) {
      renderTodayGames();
    } else {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      const options = {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": "ea8ec82cebb59731159876110f477704",
          "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
        },
      };

      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=128&season=2023&date=${formattedDate}&timezone=America/Argentina/Buenos_Aires`,
        options
      );
      const data = await response.json();
      const resp = data.response;
      sessionStorage.setItem("gamesToday", JSON.stringify(resp));
      console.log(resp);

      renderTodayGames();
    }
  } catch (error) {
    console.log(error);
    infoApiContainer.innerHTML = `
    <h1>Contenido no disponible intente mas tarde</h1>
    `;
  }
}

function renderTodayGames() {
  const data = JSON.parse(sessionStorage.getItem("gamesToday"));
  if (data.length === 0) {
    infoApiContainer.innerHTML = `
    <h1>No hay partidos definidos para el dia de hoy</h1>
    `;
    infoApiContainer.setAttribute("aria-busy", "false");
  } else {
    console.log(data);
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
  <p><img src="${homeLogo}"class="local-logo">${partidos.teams.home.name} -  ${goalHome}</p>
  <p><img src="${awayLogo}"class="local-logo">${partidos.teams.away.name} -  ${goalAway}</p>
  </div>
  <p>Estado de partido: ${partidos.fixture.status.elapsed} Min  ${partidos.fixture.status.long}</p>
  <p>Horario : ${dateArg}</p>
  <p>Arbitraje: ${partidos.fixture.referee}</p>
  <p>Estadio : ${partidos.fixture.venue.name} -- ${partidos.fixture.venue.city}</p>
  </div>
  </article>

  `;
      infoApiContainer.setAttribute("aria-busy", "false");
    });
  }
}
