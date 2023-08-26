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
    const url =
      "https://newsi-api.p.rapidapi.com/api/category?category=sport&language=es&country=ar&sort=top&page=1&limit=20";
    const options = {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": "096dd435e0msh6bfd88bf3e8fc49p165b76jsnb0774225e9c4",
        "X-RapidAPI-Host": "newsi-api.p.rapidapi.com",
      },
    };

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      const filteredResult = result.filter((article) => article.image !== null && article.image !== "" && article.body !== null && article.body !== "" && article.title !== null && article.title !== "" && article.link !== null && article.link !== "");

      const dataLocalSet = sessionStorage.setItem(
        "data",
        JSON.stringify(filteredResult)
      );

      console.log(result);
    } catch (error) {
      console.error(error);
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
