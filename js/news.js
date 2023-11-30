const newsContainer = document.querySelector(".news-container");
const allNewsContainer = document.querySelector(".all-news-container");

const apiget = async () => {
  const dataLocalGet = JSON.parse(sessionStorage.getItem("data"));

  if (dataLocalGet) {
    // Si los datos ya están en sessionStorage, usarlos directamente
    const articles = dataLocalGet;
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
    articles.filter((article) => article.image !== null).// Filtrar los artículos que no tengan imagen
    forEach((article) => {
      if (count >= 2) {
        return;
      }

      let { image, title, body, link } = article;
      if (body === null || body === "") {
        body = "Descripción no disponible";
      }

      const articleElement = document.createElement("article");
      articleElement.classList.add("card-all-news");
      articleElement.innerHTML = `
        <h6>${title}</h6>
        ${
          image
            ? `<img class="img-news" src="${image}" alt="${title}" />`
            : ""
        }
        <div class="description-container">
          <p class="description">${body}</p>
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
  console.log(articles);
  try {
    if (allNewsContainer === null) {
      return;
    }

    const fragment = document.createDocumentFragment(); // Crear un fragmento

    articles.filter((article) => article.image != null).forEach((article) => {
      let { image, title, body, link } = article;
      if (body === null || body === "") {
        description = "Descripción no disponible";
      }

      const articleElement = document.createElement("article");
      articleElement.classList.add("card-all-news");
      articleElement.innerHTML = `
        <h1>${title}</h1>
        ${image ? `<img class="img-news" src="${image}" alt="${title}" />` : ""}
        <div class="description-container">
          <p class="description">${body}</p>
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

window.addEventListener("scroll", function () {
  const btnScrollTop = document.getElementById("btn-scroll-top");
  const scrollY = window.scrollY;
  if (scrollY > 100) {
    btnScrollTop.style.display = "block";
  } else {
    btnScrollTop.style.display = "none";
  }
});
