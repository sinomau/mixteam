const newsContainer = document.querySelector(".news-container");
const allNewsContainer = document.querySelector(".all-news-container");

const apikey = "pub_26486bb265635d713e2f42feb3fb43376796b";
const country = "ar";
const category = "sports";
const apiUrl = `https://newsdata.io/api/1/news?apikey=${apikey}&country=${country}&category=${category}`;

const apiget = async () => {
  const dataLocalGet = JSON.parse(sessionStorage.getItem("data"));

  if (dataLocalGet) {
    // Si los datos ya están en sessionStorage, usarlos directamente
    const articles = dataLocalGet.results;
    renderNews(articles);
    renderAllNews(articles);
  } else {
    // Si los datos no están en sessionStorage, hacer la petición a la API
    fetch(apiUrl, {
      method: "GET",
      headers: {
        "Permissions-Policy": "interest-cohort=()",
      },
    })
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
    articles.forEach((article) => {
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
        ${
          image_url
            ? `<img class="img-news" src="${image_url}" alt="${title}" />`
            : ""
        }
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

    articles.forEach((article) => {
      let { image_url, title, description, url, link } = article;
      if (description === null || description === "") {
        description = "Descripción no disponible";
      }

      const articleElement = document.createElement("article");
      articleElement.classList.add("card-all-news");
      articleElement.innerHTML = `
        <h1>${title}</h1>
        ${
          image_url
            ? `<img class="img-news" src="${image_url}" alt="${title}" />`
            : ""
        }
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

window.addEventListener("scroll", function () {
  const btnScrollTop = document.getElementById("btn-scroll-top");
  const scrollY = window.scrollY;
  if (scrollY > 100) {
    btnScrollTop.style.display = "block";
  } else {
    btnScrollTop.style.display = "none";
  }
});
