const fixtureApi = document.querySelector(".fixture-api");
const localContainer = document.querySelector(".local-container");
const visitanteContainer = document.querySelector(".visitante-container");
const infoApiContainer = document.querySelector(".info-api-container");
const buttonStandings = document.querySelector(".table-api");
const buttonLastGames = document.querySelector(".last-api");
const buttonNextGames = document.querySelector(".next-api");
const buttonNowGames = document.querySelector(".now-api");
const buttonLiveGames = document.querySelector(".live-api");
const liveMatchContainer = document.querySelector(".live-matchs");
const topContainer = document.querySelector(".top-container");

/* Event handlers */

buttonNowGames.addEventListener("click", getGamesToday);
buttonStandings.addEventListener("click", tablePositions);
buttonNextGames.addEventListener("click", nextGames);
buttonLiveGames.addEventListener("click", getGameLive);
buttonLastGames.addEventListener("click", lastGames);

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
        "https://v3.football.api-sports.io/standings?league=1032&season=2024",
        options
      );
      const data = await response.json();
      const standings = data.response[0].league.standings;

      sessionStorage.setItem("apiData", JSON.stringify(standings));
      console.log(standings);
      renderTable();
    }
  } catch (error) {
    console.log(error);
    infoApiContainer.innerHTML = `
    <h1>Contenido no disponible intente mas tarde</h1>
    `;
  }
}

function renderTable() {
  infoApiContainer.innerHTML = "";
  const apiData = JSON.parse(sessionStorage.getItem("apiData"));
  infoApiContainer.innerHTML = `
    <tbody class="tbody-container">
    <h1>Grupo A</h1>
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

  <tbody class="tbody-container-b">
  <h1>Grupo B</h1>
  <figure>
    <table class="table-container-b">
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
  const tableContainerB = document.querySelector(".table-container-b");
  // Renderizar para apiData[0]
  apiData[0].forEach((positions) => {
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
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
    `;
    tableContainer.appendChild(newRow);
  });

  // Renderizar para apiData[1]
  apiData[1].forEach((positions) => {
    const newRowB = document.createElement("tr");
    newRowB.innerHTML = `
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
    `;
    tableContainerB.appendChild(newRowB);
  });

  infoApiContainer.setAttribute("aria-busy", "false");
}

async function nextGames() {
  try {
    infoApiContainer.setAttribute("aria-busy", "true");
    const round = sessionStorage.getItem("Rounds");
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
        "https://v3.football.api-sports.io/fixtures?league=1032&season=2024&next=14&timezone=America/Argentina/Buenos_Aires",
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
  data.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

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
    if (partidos.fixture.referee === null) {
      partidos.fixture.referee = "Sin Informacion";
    }

    infoApiContainer.innerHTML += ` 
      <article class="article-container">
      <table>
        <thead>
          <tr>
            <th scope="col">${partidos.league.round}</th>
            <th scope="col"></th>
            <th scope="col"></th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><img src="${homeLogo}" class="local-logo">${partidos.teams.home.name}</td>
            <td>VS</td>
            <td></td>
            <td><img src="${awayLogo}" class="local-logo">${partidos.teams.away.name}</td>
          </tr>
          <tr>
            <td colspan="6">${dateArg}</td>
          </tr>
          <tr>
            <td colspan="6">Arbitraje: ${partidos.fixture.referee}</td>
          </tr>
          <tr>
            <td colspan="6">Estadio: ${partidos.fixture.venue.name} - ${partidos.fixture.venue.city}</td>
          </tr>
        </tbody>
      </table>
    </article>
  `;
    infoApiContainer.setAttribute("aria-busy", "false");
  });
}

async function lastGames() {
  try {
    infoApiContainer.setAttribute("aria-busy", "true");
    const round = sessionStorage.getItem("lastGames");
    if (round != null) {
      renderLastGames();
    } else {
      const options = {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": "ea8ec82cebb59731159876110f477704",
          "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
        },
      };

      const response = await fetch(
        "https://v3.football.api-sports.io/fixtures?league=1032&season=2024&last=15&timezone=America/Argentina/Buenos_Aires",
        options
      );
      const data = await response.json();
      const resp = data.response;
      sessionStorage.setItem("lastGames", JSON.stringify(resp));
      renderLastGames();
    }
  } catch (error) {
    console.log(error);
    infoApiContainer.innerHTML = `
    <h1>Contenido no disponible intente mas tarde</h1>
    `;
  }
}

function renderLastGames() {
  infoApiContainer.innerHTML = "";
  const data = JSON.parse(sessionStorage.getItem("lastGames"));
  data.sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));

  const filterFixture = data.filter(
    (data) => data.fixture.status.long === "Match Finished"
  );
  filterFixture.forEach((partidos) => {
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

    if (partidos.fixture.referee === null) {
      partidos.fixture.referee = "Sin Informacion";
    }

    if (partidos.fixture.status.long === "Second Half") {
      partidos.fixture.status.long = "Segundo Tiempo";
    } else if (partidos.fixture.status.long === "First Half") {
      partidos.fixture.status.long = "Primer Tiempo";
    } else if (partidos.fixture.status.long === "Halftime") {
      partidos.fixture.status.long = "Entretiempo";
    } else if (partidos.fixture.status.long === "Match Finished") {
      partidos.fixture.status.long = "Terminado";
    }

    infoApiContainer.innerHTML += ` 
     <article class="article-container">
     <table>
       <thead>
         <tr>
           <th scope="col">${partidos.league.round}</th>
           <th scope="col">${partidos.fixture.status.long}</th>
           <th scope="col"></th>
           <th scope="col"></th>
           <th scope="col"></th>
         </tr>
       </thead>
       <tbody>
         <tr>
           <td><img src="${homeLogo}" class="local-logo">${partidos.teams.home.name}</td>
           <td>${goalHome}</td>
           <td>${goalAway}</td>
           <td><img src="${awayLogo}" class="local-logo">${partidos.teams.away.name}</td>
         </tr>
         <tr>
           <td colspan="6">${dateArg}</td>
         </tr>
         <tr>
           <td colspan="6">Arbitraje: ${partidos.fixture.referee}</td>
         </tr>
         <tr>
           <td colspan="6">Estadio: ${partidos.fixture.venue.name} - ${partidos.fixture.venue.city}</td>
         </tr>
       </tbody>
     </table>
   </article>
 `;

    infoApiContainer.setAttribute("aria-busy", "false");
  });
}

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
        `https://v3.football.api-sports.io/fixtures?league=1032&season=2024&date=${formattedDate}&timezone=America/Argentina/Buenos_Aires`,
        options
      );
      const data = await response.json();
      const resp = data.response;
      sessionStorage.setItem("gamesToday", JSON.stringify(resp));
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
  data.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

  if (data.length === 0) {
    infoApiContainer.innerHTML = `
    <h1>No hay partidos definidos para el día de hoy</h1>
    `;
    infoApiContainer.setAttribute("aria-busy", "false");
  } else {
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
      <table>
        <thead>
          <tr>
            <th scope="col">${partidos.league.round}</th>
            <th scope="col"></th>
            <th scope="col"></th>
            <th scope="col"></th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><img src="${homeLogo}" class="local-logo">${partidos.teams.home.name}</td>
            <td>${goalHome}</td>
            <td>${goalAway}</td>
            <td><img src="${awayLogo}" class="local-logo">${partidos.teams.away.name}</td>
          </tr>
          <tr>
            <td colspan="6">${dateArg}</td>
          </tr>
          <tr>
            <td colspan="6">Arbitraje: ${partidos.fixture.referee}</td>
          </tr>
          <tr>
            <td colspan="6">Estadio: ${partidos.fixture.venue.name} - ${partidos.fixture.venue.city}</td>
          </tr>
        </tbody>
      </table>
    </article>
  `;
      infoApiContainer.setAttribute("aria-busy", "false");
    });
  }
}

async function getGameLive() {
  try {
    liveMatchContainer.setAttribute("aria-busy", "true");
    const gameLive = sessionStorage.getItem("gameLive");
    if (gameLive != null) {
      renderGameLive();
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
        `https://v3.football.api-sports.io/fixtures?&live=1032-129-130-131-132-133-134-517-13-541-11-134-5262-5607-4949-4947-4878-5267-5074-5082-5067-5348-5389-4994-5066-5367-5419-5284-5323-4944-5060-5076-5577&timezone=America/Argentina/Buenos_Aires`,
        options
      );
      const data = await response.json();
      const resp = data.response;
      sessionStorage.setItem("gameLive", JSON.stringify(resp));
      console.log(data);
      renderGameLive();
    }
  } catch (error) {
    console.log(error);
  }
}

function renderGameLive() {
  const data = JSON.parse(sessionStorage.getItem("gameLive"));
  data.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

  if (data.length === 0) {
    liveMatchContainer.innerHTML = `
    <h2>No hay partidos en vivo en este momento.</h2>
    `;
    liveMatchContainer.setAttribute("aria-busy", "false");
  } else {
    liveMatchContainer.innerHTML = "";
  }

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

    if (partidos.fixture.referee === null) {
      partidos.fixture.referee = "Sin Informacion";
    }

    if (partidos.fixture.status.long === "Second Half") {
      partidos.fixture.status.long = "Segundo Tiempo";
    } else if (partidos.fixture.status.long === "First Half") {
      partidos.fixture.status.long = "Primer Tiempo";
    } else if (partidos.fixture.status.long === "Halftime") {
      partidos.fixture.status.long = "Entretiempo";
    } else if (partidos.fixture.status.long === "Match Finished") {
      partidos.fixture.status.long = "Terminado";
    }

    liveMatchContainer.innerHTML += ` 
      <article class="article-container">
      <div class="live-container">
      <div class="home-container-live">
      <img src="${homeLogo}" class="local-logo-live">
      <p>${partidos.teams.home.name}</p>
      <p>${goalHome}</p>
      </div>
      <div class="status-container-live">
      <div class="status-container-img">
      <img src=${partidos.league.logo} class="local-logo-live">
      </div>
      <p>${partidos.league.name}</p>
      <p>${partidos.fixture.status.elapsed} Min del ${partidos.fixture.status.long}</p>
      <h5></h5>
      </div>
      <div class="away-container-live">
      <img src="${awayLogo}" class="local-logo-live">
      <p>${partidos.teams.away.name}</p>
      <p>${goalAway}</p>
      </div>
      </div>
      </article>
  `;
    liveMatchContainer.setAttribute("aria-busy", "false");
  });
}
