const state = {
  parts: [],
  filteredParts: [],
  selectedModel: "",
  searchText: ""
};

const elements = {
  modelButtons: document.getElementById("modelButtons"),
  searchInput: document.getElementById("searchInput"),
  resultsList: document.getElementById("resultsList"),
  emptyState: document.getElementById("emptyState"),
  resultCount: document.getElementById("resultCount"),
  resultsTitle: document.getElementById("resultsTitle"),
  activeFilters: document.getElementById("activeFilters"),
  clearFilters: document.getElementById("clearFilters")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadData() {
  try {
    const response = await fetch("parts_data.json");
    const data = await response.json();
    state.parts = data.parts || [];
    renderModelButtons(data.models || []);
    applyFilters();
  } catch (error) {
    elements.resultsList.innerHTML = '<div class="empty-state"><h3>Unable to load data</h3><p>Check that parts_data.json is in the same folder as this page.</p></div>';
  }
}

function renderModelButtons(models) {
  elements.modelButtons.innerHTML = "";

  const allButton = createChip("All Models", !state.selectedModel, () => {
    state.selectedModel = "";
    applyFilters();
  });
  elements.modelButtons.appendChild(allButton);

  models.forEach((model) => {
    const button = createChip(model, state.selectedModel === model, () => {
      state.selectedModel = model;
      applyFilters();
    });
    elements.modelButtons.appendChild(button);
  });
}

function createChip(label, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `chip${active ? " is-active" : ""}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function applyFilters() {
  const search = state.searchText.trim().toLowerCase();

  state.filteredParts = state.parts.filter((part) => {
    const matchesModel = !state.selectedModel || part.model === state.selectedModel;
    const haystack = `${part.material} ${part.description}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesModel && matchesSearch;
  });

  state.filteredParts.sort((a, b) => {
    if (a.material === b.material) return a.description.localeCompare(b.description);
    return a.material.localeCompare(b.material);
  });

  refreshControls();
  renderResults();
}

function refreshControls() {
  const chipButtons = [...elements.modelButtons.querySelectorAll(".chip")];
  chipButtons.forEach((button) => {
    const active = (button.textContent === "All Models" && !state.selectedModel)
      || button.textContent === state.selectedModel;
    button.classList.toggle("is-active", active);
  });

  const active = [];
  if (state.selectedModel) active.push(`<span class="filter-pill">Model: ${escapeHtml(state.selectedModel)}</span>`);
  if (state.searchText.trim()) active.push(`<span class="filter-pill">Search: ${escapeHtml(state.searchText.trim())}</span>`);

  elements.activeFilters.innerHTML = active.join("");
  elements.resultsTitle.textContent = state.selectedModel ? `${state.selectedModel} parts` : "All parts";
  elements.resultCount.textContent = `${state.filteredParts.length} part${state.filteredParts.length === 1 ? "" : "s"}`;
}

function renderResults() {
  if (!state.filteredParts.length) {
    elements.resultsList.innerHTML = "";
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;
  elements.resultsList.innerHTML = state.filteredParts.map((part) => `
    <article class="result-card">
      <div class="result-card__top">
        <div class="part-number">${escapeHtml(part.material)}</div>
        <button class="copy-btn" type="button" data-copy="${escapeHtml(part.material)}">Copy</button>
      </div>
      <p class="description">${escapeHtml(part.description)}</p>
      <div class="meta-row">
        <span class="meta-pill">${escapeHtml(part.model)}</span>
        ${part.partType ? `<span class="meta-pill">${escapeHtml(part.partType)}</span>` : ""}
        ${part.colour ? `<span class="meta-pill">${escapeHtml(part.colour)}</span>` : ""}
      </div>
    </article>
  `).join("");

  elements.resultsList.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy");
      try {
        await navigator.clipboard.writeText(value);
        const previous = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => button.textContent = previous, 1200);
      } catch {
        button.textContent = "Copy failed";
        setTimeout(() => button.textContent = "Copy", 1200);
      }
    });
  });
}

elements.searchInput.addEventListener("input", (event) => {
  state.searchText = event.target.value || "";
  applyFilters();
});

elements.clearFilters.addEventListener("click", () => {
  state.selectedModel = "";
  state.searchText = "";
  elements.searchInput.value = "";
  applyFilters();
});

loadData();
