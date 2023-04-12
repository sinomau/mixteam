const newsContainer = document.querySelector(".news-container");
const allNewsContainer = document.querySelector(".all-news-container");

const apiNews = async () => {
  try {
    const apikey = "41dca1972cc7453e9401a408e94faae4";
    const country = "ar";
    const category = "sports";

    const news = await fetch(
      `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${apikey}`
    );

    const response = await news.json();
    const articles = response.articles;

    renderNews(articles);
    renderAllNews(articles);
  } catch (err) {
    console.log(err);
  }
};

apiNews();

const renderNews = async (articles) => {
  try {
    if (newsContainer === null) {
      return;
    }

    let count = 0;
    articles.forEach((article) => {
      if (count >= 2) {
        return; // si ya se han agregado 2 noticias, detener la iteración
      }

      let { urlToImage, title, description, url } = article;
      if (description === null) {
        description = "";
      }

      newsContainer.innerHTML += `
        <article class="card-news">
          <h6>${title}</h6>
          <p>${description}</p>
          <a href="${url}" target="_blank">Ver más</a>
        </article>
      `;

      count++;
    });
    newsContainer.innerHTML += `
    <a href="./pages/news.html">Ver más noticias</a>
  `;
    newsContainer.setAttribute("aria-busy", "false");
  } catch (err) {
    console.log(err);
    newsContainer.innerHTML = `
      <h1>Contenido no disponible, intente más tarde</h1>
    `;
  }
};

const renderAllNews = async (articles) => {
  try {
    if (allNewsContainer === null) {
      return;
    }

    articles.forEach((article) => {
      let { urlToImage, title, description, url } = article;
      if (description === null) {
        description = "";
      }

      allNewsContainer.innerHTML += `
      <article class="card-all-news">
        <h6>${title}</h6>
        <p>${description}</p>
        <a href="${url}" target="_blank">Ver más</a>
      </article>
    `;
    });
  } catch (err) {
    console.log(err);
  }
};
