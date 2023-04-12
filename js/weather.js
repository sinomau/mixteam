const asideContainer = document.querySelector("news-main");

const apiWeather = async () => {
  try {
    document
      .querySelector(".weather-container")
      .setAttribute("aria-busy", "true");
    const apikey = "92f1acb52c66fe442eea1eecf2a18cea";
    const lon = "-58.3772300";
    const lat = "-34.6131500";
    const units = "metric";
    const lang = "es";
    const weather = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&lang=${lang}&appid=${apikey}`
    );

    const response = await weather.json();
    renderData(response);
  } catch (err) {
    console.log(err);
  }
};

apiWeather();

const renderData = async (response) => {
  try {
    const { icon, description } = response.weather[0];
    const temp = response.main.temp;
    const humidity = response.main.humidity;
    const feelsLike = response.main.feels_like;
    const windSpeed = response.wind.speed;
    const uvIndex = response.main.uvi;
    const lat = response.coord.lat;
    const lon = response.coord.lon;
    let city = response.name;
    const sunrise = response.sys.sunrise;
    const sunset = response.sys.sunset;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    const weatherDescription = description.slice(0, 200) + "...";
    const uppercase = description.toUpperCase();
    if (city === "San Nicolas") {
      city = "Buenos Aires ";
    }

    document.querySelector(".weather-container").innerHTML = `
        
        <img class="img-card" src="${iconUrl}">
        <p>${temp}°</p>
        <p>  -  ${city}</p>
        
        `;
    document
      .querySelector(".weather-container")
      .setAttribute("aria-busy", "false");
  } catch (err) {
    console.log(err);
    document.querySelector(".weather-container").innerHTML = `
    <h1>Contenido no disponible intente mas tarde</h1>
    `;
  }
};

// const apiNews = async () => {
//   try {
//     const apikey = "41dca1972cc7453e9401a408e94faae4";
//     const country = "ar";
//     const category = "sports";

//     const news = await fetch(
//       `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${apikey}`
//     );

//     const response = await news.json();
//     const articles = response.articles;
//     console.log(articles);
//     renderNews(articles);
//     renderAllNews(articles);
//   } catch (err) {
//     console.log(err);
//   }
// };

// apiNews();

// const renderNews = async (articles) => {
//   const newsContainer = await document.querySelector(".news-container");

//   try {
//     if (newsContainer === null) {
//       return;
//     }

//     let count = 0;
//     articles.forEach((article) => {
//       if (count >= 2) {
//         return; // si ya se han agregado 2 noticias, detener la iteración
//       }

//       let { urlToImage, title, description, url } = article;
//       if (description === null) {
//         description = "";
//       }

//       newsContainer.innerHTML += `
//         <article class="card-news">
//           <h6>${title}</h6>
//           <p>${description}</p>
//           <a href="${url}" target="_blank">Ver más</a>
//         </article>
//       `;

//       count++;
//     });
//     newsContainer.innerHTML += `
//     <a href="./pages/news.html">Ver más noticias</a>
//   `;
//     newsContainer.setAttribute("aria-busy", "false");
//   } catch (err) {
//     console.log(err);
//     newsContainer.innerHTML = `
//       <h1>Contenido no disponible, intente más tarde</h1>
//     `;
//   }
// };

// const renderAllNews = async (articles) => {
//   const allNewsContainer = document.querySelector(".all-news-container");

//   try {
//     if (allNewsContainer === null) {
//       return;
//     }

//     articles.forEach((article) => {
//       let { urlToImage, title, description, url } = article;
//       if (description === null) {
//         description = "";
//       }

//       allNewsContainer.innerHTML += `
//       <article class="card-all-news">
//         <h6>${title}</h6>
//         <p>${description}</p>
//         <a href="${url}" target="_blank">Ver más</a>
//       </article>
//     `;
//     });
//   } catch (err) {
//     console.log(err);
//   }
// };
