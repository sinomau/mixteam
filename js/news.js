const newsContainer = document.querySelector(".news-container");
const allNewsContainer = document.querySelector(".all-news-container");

const apikey = "pub_26486bb265635d713e2f42feb3fb43376796b";
const country = "ar,cl,es";
const category = "sports";
const apiUrl = `https://newsdata.io/api/1/news?apikey=${apikey}&country=${country}&category=${category}`;

const apiget = async () => {
  const dataLocalGet = JSON.parse(sessionStorage.getItem("data"));

  if (dataLocalGet) {
    // Si los datos ya están en sessionStorage, usarlos directamente
    const articles = dataLocalGet.results;
    console.log(articles);
    renderNews(articles);
    renderAllNews(articles);
  } else {
    // Si los datos no están en sessionStorage, hacer la petición a la API
    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        const dataLocalSet = JSON.stringify(data);
        sessionStorage.setItem("data", dataLocalSet);
        const articles = data.results;
        console.log(articles);
        renderNews(articles);
        renderAllNews(articles);
      })
      .catch((error) => {
        console.error("Error al realizar la solicitud:", error);
      });
  }
};

const renderNews = async (articles) => {
  try {
    if (newsContainer === null) {
      return;
    }

    let count = 0;
    const fragment = document.createDocumentFragment(); // Crear un fragmento
    const filterImg = articles.filter((article) => article.image_url !== null); // Filtrar los artículos que no tengan imagen
    filterImg.forEach((article) => {
      if (count >= 2) {
        return;
      }

      let { image_url, title, description, url, link } = article;
      if (description === null || description === "") {
        description = "Descripción no disponible";
      }

      const articleElement = document.createElement("article");
      articleElement.classList.add("card-all-news");
      articleElement.innerHTML = `
        <h6>${title}</h6>
        <img class="img-news"src="${image_url}" alt="${title}" />
        <div class="description-container">
          <p class="description">${description}</p>
        </div>
        <a href="${link || "#"}" target="_blank">Ver más</a>
      `;

      fragment.appendChild(articleElement); // Agregar el artículo al fragmento
      count++;
    });

    const moreNewsLink = document.createElement("a");
    moreNewsLink.setAttribute("href", "./pages/news.html");
    moreNewsLink.textContent = "Ver más noticias";
    fragment.appendChild(moreNewsLink); // Agregar el enlace "Ver más noticias" al fragmento

    newsContainer.appendChild(fragment); // Agregar todo el contenido al contenedor

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

    const fragment = document.createDocumentFragment(); // Crear un fragmento
    const filterImg = articles.filter((article) => article.image_url !== null); // Filtrar los artículos que no tengan imagen

    filterImg.forEach((article) => {
      let { image_url, title, description, url, link } = article;
      if (description === null || description === "") {
        description = "Descripción no disponible";
      }
      if (image_url === null) {
        image_url = "#";
      }
      const articleElement = document.createElement("article");
      articleElement.classList.add("card-all-news");
      articleElement.innerHTML = `
        <h1>${title}</h1>
        <img class="img-news" src="${image_url || "#"}" alt="${title}" />
        <div class="description-container">
          <p class="description">${description}</p>
        </div>
        <a href="${link || "#"}" target="_blank">Ver más</a>
      `;

      fragment.appendChild(articleElement); // Agregar el artículo al fragmento
    });

    allNewsContainer.appendChild(fragment); // Agregar todo el contenido al contenedor
  } catch (err) {
    console.log(err);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  apiget();
});

const newapi = async () => {
  const access_key = "4e5c2314acde3523e1ff723de3e0c83e";

  const link = `http://api.mediastack.com/v1/news?access_key=4e5c2314acde3523e1ff723de3e0c83e&countries=ar&categories=general`;

  const response = await fetch(link);
  const data = await response.json();
  console.log(data);
};

newapi();
