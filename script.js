document.addEventListener("DOMContentLoaded", async () => {
  // Theme Toggle
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let darkMode =
    localStorage.getItem("darkMode") === "true" ||
    (localStorage.getItem("darkMode") === null && prefersDark);

  function applyTheme() {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      themeIcon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
    } else {
      document.documentElement.classList.remove("dark");
      themeIcon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />';
    }
  }

  themeToggle.addEventListener("click", () => {
    darkMode = !darkMode;
    localStorage.setItem("darkMode", darkMode);
    applyTheme();
  });

  applyTheme();

  // Load APOD data
  const container = document.getElementById("apod-container");
  const loadingMore = document.getElementById("loading-more");
  const noResults = document.getElementById("no-results");
  const totalCount = document.getElementById("total-count");
  const lastUpdated = document.getElementById("last-updated");
  const skeletonTemplate = document.getElementById("skeleton-template");

  // Show loading skeletons
  for (let i = 0; i < 8; i++) {
    container.appendChild(skeletonTemplate.content.cloneNode(true));
  }

  try {
    const response = await fetch("apod_index.json");
    if (!response.ok) throw new Error("Failed to load data");

    const apodIndex = await response.json();
    totalCount.textContent = apodIndex.length;
    lastUpdated.textContent = new Date().toLocaleString();

    // Clear skeletons
    container.innerHTML = "";

    if (apodIndex.length === 0) {
      noResults.classList.remove("hidden");
      return;
    }

    // Load APODs with lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target;
            const img = card.querySelector("img");
            const dataSrc = img.getAttribute("data-src");

            if (dataSrc) {
              img.src = dataSrc;
              img.removeAttribute("data-src");
              img.classList.add("lazy");

              img.onload = () => {
                img.classList.add("loaded");
                card.classList.add("animate-fadein");
              };

              img.onerror = () => {
                const hdUrl = card.getAttribute("data-hdurl");
                if (hdUrl) img.src = hdUrl;
              };
            }

            observer.unobserve(card);
          }
        });
      },
      { threshold: 0.1 }
    );

    apodIndex.forEach((apod, index) => {
      const card = document.createElement("div");
      card.className =
        "bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 opacity-0";
      card.setAttribute("data-date", apod.date);
      card.setAttribute("data-path", apod.path);

      card.innerHTML = `
                <div class="aspect-h-9 bg-gray-700/50 flex items-center justify-center">
                    <img 
                        data-src="" 
                        alt="Loading..." 
                        class="object-cover w-full h-full"
                        loading="lazy"
                    >
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-lg mb-2 line-clamp-2">Loading...</h3>
                    <p class="text-gray-400 text-sm mb-3">${apod.date}</p>
                    <p class="text-gray-300 text-sm line-clamp-3">Loading description...</p>
                    <div class="mt-4 flex justify-between items-center">
                        <span class="text-xs px-2 py-1 bg-gray-700 rounded-full text-blue-300">
                            Loading...
                        </span>
                        <button class="text-blue-400 hover:underline text-sm view-btn">
                            View Details
                        </button>
                    </div>
                </div>
            `;

      container.appendChild(card);
      observer.observe(card);

      // Load APOD data individually
      loadAPODData(apod.path, card);
    });

    // Setup modal
    setupModal();

    // Setup filters
    setupFilters(apodIndex);
  } catch (error) {
    console.error("Error:", error);
    container.innerHTML = `
            <div class="col-span-full bg-red-900/50 border border-red-700 rounded-lg p-4 max-w-md mx-auto">
                <p class="text-red-300">Failed to load APOD data. Please try again later.</p>
            </div>
        `;
  }
});

async function loadAPODData(path, card) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error("Failed to load APOD");

    const apod = await response.json();
    updateCard(card, apod);
  } catch (error) {
    console.error("Error loading APOD:", error);
    card.querySelector("h3").textContent = "Failed to load";
    card.querySelector("p:last-child").textContent =
      "Could not load this APOD data";
  }
}

function updateCard(card, apod) {
  const img = card.querySelector("img");
  const title = card.querySelector("h3");
  const date = card.querySelector("p.text-gray-400");
  const desc = card.querySelector("p.text-gray-300");
  const typeBadge = card.querySelector("span.bg-gray-700");

  // Use url first, fallback to hdurl
  const imageUrl = apod.url || apod.hdurl;
  const hdImageUrl = apod.hdurl || apod.url;

  img.setAttribute("data-src", imageUrl);
  img.setAttribute("alt", apod.title);
  card.setAttribute("data-hdurl", hdImageUrl);

  title.textContent = apod.title;
  date.textContent = `${apod.date}${
    apod.copyright ? ` • ${apod.copyright}` : ""
  }`;
  desc.textContent = apod.explanation;
  typeBadge.textContent = apod.media_type === "image" ? "Image" : "Video";

  // Trigger lazy load if card is visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target.querySelector("img");
          const dataSrc = img.getAttribute("data-src");

          if (dataSrc) {
            img.src = dataSrc;
            img.removeAttribute("data-src");
            img.classList.add("lazy");

            img.onload = () => {
              img.classList.add("loaded");
              card.classList.add("animate-fadein");
            };

            img.onerror = () => {
              const hdUrl = card.getAttribute("data-hdurl");
              if (hdUrl) img.src = hdUrl;
            };
          }

          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(card);
}

function setupModal() {
  const modal = document.getElementById("apod-modal");
  const closeModal = document.getElementById("close-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalDate = document.getElementById("modal-date");
  const modalCopyright = document.getElementById("modal-copyright");
  const modalExplanation = document.getElementById("modal-explanation");
  const modalNasaLink = document.getElementById("modal-nasa-link");
  const modalMediaContainer = document.getElementById("modal-media-container");
  const favoriteBtn = document.getElementById("modal-favorite-btn");
  const zoomBtn = document.getElementById("modal-zoom-btn"); // Get the zoom button

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", async function () {
      const card = this.closest("[data-path]");
      const path = card.getAttribute("data-path");

      try {
        const response = await fetch(path);
        const apod = await response.json();

        modalTitle.textContent = apod.title;
        modalDate.textContent = apod.date;
        modalCopyright.textContent = apod.copyright
          ? `Copyright: ${apod.copyright}`
          : "";
        modalExplanation.textContent = apod.explanation;

        const nasaDate = apod.date.replace(/-/g, "");
        modalNasaLink.href = `https://apod.nasa.gov/apod/ap${nasaDate.substring(
          2
        )}.html`;

        modalMediaContainer.innerHTML = ""; // Clear previous content
        zoomBtn.classList.add("hidden"); // Hide zoom button by default

        if (apod.media_type === "image") {
          const imageUrl = apod.url || apod.hdurl; // Use standard URL first
          const hdImageUrl = apod.hdurl || apod.url; // HD URL for linking

          const link = document.createElement("a");
          link.href = hdImageUrl;
          link.target = "_blank"; // Open in new tab
          link.rel = "noopener noreferrer";

          const img = document.createElement("img");
          img.src = imageUrl; // Display standard image
          img.alt = apod.title;
          img.className = "w-full h-full object-contain max-h-[70vh]";

          link.appendChild(img); // Wrap image in link
          modalMediaContainer.appendChild(link);

          // Setup and show zoom button
          zoomBtn.href = hdImageUrl;
          zoomBtn.classList.remove("hidden");
        } else if (apod.media_type === "video") {
          const iframe = document.createElement("iframe");
          iframe.src = apod.url;
          iframe.className = "w-full aspect-video";
          iframe.setAttribute("allowfullscreen", "");
          modalMediaContainer.appendChild(iframe);
        }

        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } catch (error) {
        console.error("Error loading APOD details:", error);
        // Handle error display if needed
        modalMediaContainer.innerHTML =
          '<p class="text-red-400">Could not load media.</p>';
      }
    });
  });

  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  });

  // Favorite functionality
  favoriteBtn.addEventListener("click", () => {
    const currentText = favoriteBtn.textContent.trim();
    if (currentText === "♡ Add to Favorites") {
      favoriteBtn.textContent = "♥ Added to Favorites";
      favoriteBtn.classList.add("bg-nasa-red/20", "text-nasa-red");
    } else {
      favoriteBtn.textContent = "♡ Add to Favorites";
      favoriteBtn.classList.remove("bg-nasa-red/20", "text-nasa-red");
    }
  });
}

function setupFilters(apodIndex) {
  const searchInput = document.getElementById("search-input");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const container = document.getElementById("apod-container");

  // Filter by search
  searchInput.addEventListener(
    "input",
    debounce(() => {
      const searchTerm = searchInput.value.toLowerCase();
      filterAPODs(searchTerm);
    }, 300)
  );

  // Filter by button
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) =>
        b.classList.remove("bg-nasa-blue", "text-white")
      );
      btn.classList.add("bg-nasa-blue", "text-white");

      const filter = btn.getAttribute("data-filter");
      applyFilter(filter);
    });
  });

  function applyFilter(filter) {
    switch (filter) {
      case "recent":
        filterAPODs("", (apod) => {
          const apodDate = new Date(apod.date.replace(/\//g, "-"));
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return apodDate > oneYearAgo;
        });
        break;
      case "favorites":
        // Implement favorites functionality
        filterAPODs("", () => false); // Placeholder
        break;
      default:
        filterAPODs("");
    }
  }

  function filterAPODs(searchTerm = "", customFilter = null) {
    const cards = container.querySelectorAll("[data-path]");
    let visibleCount = 0;

    cards.forEach((card) => {
      const path = card.getAttribute("data-path");
      const apod = apodIndex.find((a) => a.path === path);

      const matchesSearch =
        searchTerm === "" ||
        (apod &&
          (apod.title.toLowerCase().includes(searchTerm) ||
            apod.explanation.toLowerCase().includes(searchTerm) ||
            apod.date.includes(searchTerm)));

      const matchesFilter = customFilter ? customFilter(apod) : true;

      if (matchesSearch && matchesFilter) {
        card.classList.remove("hidden");
        visibleCount++;
      } else {
        card.classList.add("hidden");
      }
    });

    noResults.classList.toggle("hidden", visibleCount > 0);
  }

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
}
