// Favorites management functions - global scope
const getFavorites = () => {
  const favorites = localStorage.getItem('apod-favorites');
  return favorites ? JSON.parse(favorites) : [];
};

const addToFavorites = (path) => {
  const favorites = getFavorites();
  if (!favorites.includes(path)) {
    favorites.push(path);
    localStorage.setItem('apod-favorites', JSON.stringify(favorites));
  }
  return favorites;
};

const removeFromFavorites = (path) => {
  const favorites = getFavorites();
  const index = favorites.indexOf(path);
  if (index !== -1) {
    favorites.splice(index, 1);
    localStorage.setItem('apod-favorites', JSON.stringify(favorites));
  }
  return favorites;
};

const isFavorite = (path) => {
  const favorites = getFavorites();
  return favorites.includes(path);
};

document.addEventListener("DOMContentLoaded", async () => {
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
  const dateEl = card.querySelector("p.text-gray-400"); // Renamed variable
  const desc = card.querySelector("p.text-gray-300");
  const typeBadge = card.querySelector("span.bg-gray-700");
  const viewBtn = card.querySelector(".view-btn"); // Get view button

  // Use url first, fallback to hdurl
  const imageUrl = apod.url || apod.hdurl;
  const hdImageUrl = apod.hdurl || apod.url;

  img.setAttribute("data-src", imageUrl);
  img.setAttribute("alt", apod.title);
  card.setAttribute("data-hdurl", hdImageUrl);

  title.textContent = apod.title;
  // Add calendar icon to date
  dateEl.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    ${apod.date}
  `;
  desc.textContent = apod.explanation;

  // Add icon to type badge
  if (apod.media_type === "image") {
    typeBadge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      Image
    `;
  } else {
    typeBadge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      Video
    `;
  }

  // Add icon to View Details button
  viewBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
    View Details
  `;

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

// Function to open the modal with APOD details for a given card
async function openModalForCard(card) {
  const modal = document.getElementById("apod-modal");
  const closeModal = document.getElementById("close-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalDate = document.getElementById("modal-date");
  const modalCopyright = document.getElementById("modal-copyright");
  const modalExplanation = document.getElementById("modal-explanation");
  const modalNasaLink = document.getElementById("modal-nasa-link");
  const modalMediaContainer = document.getElementById("modal-media-container");
  const favoriteBtn = document.getElementById("modal-favorite-btn");
  const zoomBtn = document.getElementById("modal-zoom-btn");

  const path = card.getAttribute("data-path");
  if (!path) return; // Exit if path is not found

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to fetch APOD data for ${path}`);
    const apod = await response.json();

    // Add icon to modal title
    modalTitle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-2 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      ${apod.title}
    `;
    // Add icon to modal date
    modalDate.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      ${apod.date}
    `;
    // Display copyright if available
    if (apod.copyright) {
      modalCopyright.textContent = `Copyright: ${apod.copyright.trim()}`; // Trim whitespace
      modalCopyright.classList.remove('hidden'); // Show the element
    } else {
      modalCopyright.textContent = ""; // Clear content if no copyright
      modalCopyright.classList.add('hidden'); // Hide the element
    }
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

    // Store current APOD path in modal for favorite button
    modal.setAttribute('data-current-apod-path', path);

    // Update favorite button state based on whether it's already a favorite
    const favText = favoriteBtn.querySelector('.fav-text');
    const heartEmpty = favoriteBtn.querySelector('.icon-heart-empty');
    const heartFilled = favoriteBtn.querySelector('.icon-heart-filled');
    
    if (isFavorite(path)) {
      favText.textContent = "Added to Favorites";
      heartEmpty.classList.add('hidden');
      heartFilled.classList.remove('hidden');
      favoriteBtn.classList.add("bg-nasa-red/20", "text-nasa-red");
    } else {
      favText.textContent = "Add to Favorites";
      heartEmpty.classList.remove('hidden');
      heartFilled.classList.add('hidden');
      favoriteBtn.classList.remove("bg-nasa-red/20", "text-nasa-red");
    }

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  } catch (error) {
    console.error("Error loading APOD details:", error);
    modalMediaContainer.innerHTML =
      '<p class="text-red-400">Could not load media details.</p>';
    // Optionally show the modal even on error to display the message
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
}

function setupModal() {
  const modal = document.getElementById("apod-modal");
  const closeModal = document.getElementById("close-modal");
  const favoriteBtn = document.getElementById("modal-favorite-btn");

  // Use event delegation on the container for view buttons
  const container = document.getElementById("apod-container");
  container.addEventListener('click', function(event) {
    // Handle clicks on "View Details" button
    const viewBtn = event.target.closest('.view-btn');
    if (viewBtn) {
      const card = viewBtn.closest("[data-path]");
      if (card) {
        openModalForCard(card);
      }
      return; // Stop further processing if it was a view button click
    }

    // Handle clicks on the image container
    const imageContainer = event.target.closest('.aspect-h-9');
    if (imageContainer) {
       const card = imageContainer.closest("[data-path]");
       if (card) {
           // Check if the image itself or its container was clicked
           // We add a simple check to avoid triggering if clicking interactive elements inside (if any added later)
           if (event.target.tagName === 'IMG' || event.target === imageContainer) {
               openModalForCard(card);
           }
       }
    }
  });

  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    modal.removeAttribute('data-current-apod-path'); // Clear stored path
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
      modal.removeAttribute('data-current-apod-path'); // Clear stored path
    }
  });

  // Favorite functionality
  favoriteBtn.addEventListener("click", () => {
    const currentPath = modal.getAttribute('data-current-apod-path');
    if (!currentPath) return; // No APOD loaded

    const favText = favoriteBtn.querySelector('.fav-text');
    const heartEmpty = favoriteBtn.querySelector('.icon-heart-empty');
    const heartFilled = favoriteBtn.querySelector('.icon-heart-filled');

    // Check if it's already a favorite
    const isFavoriteAlready = isFavorite(currentPath);

    if (isFavoriteAlready) {
      // Remove from favorites
      removeFromFavorites(currentPath);
      favText.textContent = "Add to Favorites";
      heartEmpty.classList.remove('hidden');
      heartFilled.classList.add('hidden');
      favoriteBtn.classList.remove("bg-nasa-red/20", "text-nasa-red");
    } else {
      // Add to favorites
      addToFavorites(currentPath);
      favText.textContent = "Added to Favorites";
      heartEmpty.classList.add('hidden');
      heartFilled.classList.remove('hidden');
      favoriteBtn.classList.add("bg-nasa-red/20", "text-nasa-red");
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
        // Get favorite paths from localStorage
        const favorites = getFavorites();
        filterAPODs("", (apod) => {
          return favorites.includes(apod.path);
        });
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
