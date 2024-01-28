const newsContainer = document.querySelector(".news-container");
const allNewsContainer = document.querySelector(".all-news-container");

const url =
  "https://news67.p.rapidapi.com/v2/topic-search?languages=es&search=sports";
const options = {
  method: "GET",
  headers: {
    "X-RapidAPI-Key": "096dd435e0msh6bfd88bf3e8fc49p165b76jsnb0774225e9c4",
    "X-RapidAPI-Host": "news67.p.rapidapi.com",
  },
};
const apiget = async () => {
  const dataLocalGet = JSON.parse(sessionStorage.getItem("data"));

  if (dataLocalGet) {
    // Si los datos ya están en sessionStorage, usarlos directamente
    const articles = dataLocalGet;
    console.log(articles);
    await renderNews(articles);
    await renderAllNews(articles);
  } else {
    try {
      // Si los datos no están en sessionStorage, hacer la petición a la API
      const response = await fetch(url, options);
      const data = await response.json();

      if (data.news) {
        const articles = data.news;
        sessionStorage.setItem("data", JSON.stringify(articles));
        renderNews(articles);
        renderAllNews(articles);
      } else {
        console.error(
          "La respuesta de la API no contiene la propiedad 'news'."
        );
      }
    } catch (error) {
      console.error("Error al realizar la solicitud:", error);
    }
  }
};

const renderNews = async (articles) => {
  try {
    if (newsContainer === null) {
      return;
    }

    let count = 0;

    const fragment = document.createDocumentFragment(); // Crear un fragmento
    articles.forEach((article) => {
      if (count >= 2) {
        return;
      }

      let { Image, Title, Description, Url } = article;
      if (Description === null || Description === "") {
        Description = "Descripción no disponible";
      }

      const articleElement = document.createElement("article");
      articleElement.classList.add("card-all-news");
      articleElement.innerHTML = `
        <h6>${Title}</h6>
        ${Image ? `<img class="img-news" src="${Image}" alt="${Title}" />` : ""}
        <div class="description-container">
          <p class="description">${Description}</p>
        </div>
        <a href="${Url || "#"}" target="_blank">Ver más</a>
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

    articles.forEach((article) => {
      let { Image, Title, Description, Url } = article;
      if (Description === null || Description === "") {
        Description = "Descripción no disponible";
      }

      const articleElement = document.createElement("article");
      articleElement.classList.add("card-all-news");
      articleElement.innerHTML = `
        <h1>${Title}</h1>
        ${Image ? `<img class="img-news" src="${Image}" alt="${Title}" />` : ""}
        <div class="description-container">
          <p class="description">${Description}</p>
        </div>
        <a href="${Url || "#"}" target="_blank">Ver más</a>
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
