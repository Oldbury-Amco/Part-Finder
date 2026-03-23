const FILTERS = [
  { key: "model", label: "Model" },
  { key: "colour", label: "Colour" },
  { key: "partType", label: "Part Type" },
  { key: "position", label: "Position" },
  { key: "side", label: "Side" },
  { key: "category", label: "Category" },
  { key: "subCategory", label: "Sub-Category" }
];

const state = {
  data: [],
  selected: Object.fromEntries(FILTERS.map(f => [f.key, ""]))
};

const el = {
  filters: document.getElementById("filters"),
  results: document.getElementById("results"),
  resultCount: document.getElementById("resultCount"),
  resultsNote: document.getElementById("resultsNote"),
  activeChips: document.getElementById("activeChips"),
  resetAllBtn: document.getElementById("resetAllBtn"),
  filterTemplate: document.getElementById("filterSectionTemplate"),
  cardTemplate: document.getElementById("resultCardTemplate")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const response = await fetch("parts_data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load parts_data.json");
    state.data = await response.json();
    bindEvents();
    render();
  } catch (error) {
    el.results.innerHTML = `<div class="empty-state">Could not load the data file.<br>${escapeHtml(error.message)}</div>`;
    el.resultsNote.textContent = "Check that parts_data.json is in the same folder as index.html.";
  }
}

function bindEvents() {
  el.resetAllBtn.addEventListener("click", () => {
    for (const filter of FILTERS) state.selected[filter.key] = "";
    render();
  });
}

function render() {
  renderFilters();
  renderActiveChips();
  renderResults();
}

function renderFilters() {
  el.filters.innerHTML = "";
  let narrowedData = state.data;

  FILTERS.forEach((filter, index) => {
    const options = getOptionsForFilter(filter.key, narrowedData);
    const selectedValue = state.selected[filter.key];
    const shouldShow = options.length > 1 || !!selectedValue;

    if (!shouldShow) {
      narrowedData = applyFiltersUntil(filter.key);
      return;
    }

    const section = el.filterTemplate.content.firstElementChild.cloneNode(true);
    section.querySelector(".filter-step").textContent = `Step ${index + 1}`;
    section.querySelector(".filter-title").textContent = filter.label;

    const clearBtn = section.querySelector(".clear-filter");
    clearBtn.disabled = !selectedValue;
    clearBtn.addEventListener("click", () => {
      clearFromFilter(filter.key);
      render();
    });

    const grid = section.querySelector(".button-grid");
    options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn--option" + (selectedValue === option ? " active" : "");
      button.textContent = formatLabel(option);
      button.addEventListener("click", () => {
        state.selected[filter.key] = state.selected[filter.key] === option ? "" : option;
        clearFollowingFilters(filter.key);
        render();
      });
      grid.appendChild(button);
    });

    el.filters.appendChild(section);
    narrowedData = narrowedData.filter(item => !selectedValue || item[filter.key] === selectedValue);
  });
}

function renderActiveChips() {
  const active = FILTERS.filter(f => state.selected[f.key]);
  el.activeChips.innerHTML = "";

  if (!active.length) {
    el.activeChips.innerHTML = '<span class="chip">No filters selected</span>';
    return;
  }

  active.forEach(filter => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${filter.label}: ${formatLabel(state.selected[filter.key])}`;
    el.activeChips.appendChild(chip);
  });
}

function renderResults() {
  const data = getFilteredResults();
  el.resultCount.textContent = data.length.toLocaleString();
  el.resultsNote.textContent = data.length ? "Tap copy to copy a part number." : "No matching parts for the current selection.";
  el.results.innerHTML = "";

  if (!data.length) {
    el.results.innerHTML = '<div class="empty-state">No parts match the filters selected.<br>Use Reset All or clear one of the filters above.</div>';
    return;
  }

  data
    .sort((a, b) => a.partNumber.localeCompare(b.partNumber))
    .forEach(item => {
      const card = el.cardTemplate.content.firstElementChild.cloneNode(true);
      card.querySelector(".result-card__number").textContent = item.partNumber;
      card.querySelector(".result-card__description").textContent = formatDescription(item.description);

      const copyBtn = card.querySelector(".copy-btn");
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.partNumber);
          showToast(`Copied ${item.partNumber}`);
        } catch {
          showToast("Copy failed on this device");
        }
      });

      el.results.appendChild(card);
    });
}

function getFilteredResults() {
  return state.data.filter(item =>
    FILTERS.every(filter => !state.selected[filter.key] || item[filter.key] === state.selected[filter.key])
  );
}

function getOptionsForFilter(filterKey, scopedData) {
  const scoped = applyEarlierSelections(filterKey, scopedData);
  const values = [...new Set(scoped.map(item => item[filterKey]).filter(Boolean))];
  return values.sort(sortOptions);
}

function applyEarlierSelections(filterKey, scopedData = state.data) {
  const index = FILTERS.findIndex(f => f.key === filterKey);
  return scopedData.filter(item => {
    return FILTERS.slice(0, index).every(filter => !state.selected[filter.key] || item[filter.key] === state.selected[filter.key]);
  });
}

function applyFiltersUntil(filterKey) {
  const index = FILTERS.findIndex(f => f.key === filterKey);
  return state.data.filter(item =>
    FILTERS.slice(0, index + 1).every(filter => !state.selected[filter.key] || item[filter.key] === state.selected[filter.key])
  );
}

function clearFollowingFilters(filterKey) {
  const index = FILTERS.findIndex(f => f.key === filterKey);
  FILTERS.slice(index + 1).forEach(filter => state.selected[filter.key] = "");
}

function clearFromFilter(filterKey) {
  const index = FILTERS.findIndex(f => f.key === filterKey);
  FILTERS.slice(index).forEach(filter => state.selected[filter.key] = "");
}

function sortOptions(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB);
  return bothNumeric ? numA - numB : String(a).localeCompare(String(b));
}

function formatLabel(value) {
  if (!value) return "";
  let text = String(value).trim().replace(/\s+/g, " ");

  const replacements = {
    "LH": "LH",
    "RH": "RH",
    "PDC": "PDC",
    "ROW": "ROW",
    "NAR": "NAR",
    "PLA": "PLA",
    "MY27": "MY27"
  };

  text = text
    .split(" ")
    .map(word => {
      const clean = word.replace(/[^\w/()-]/g, "");
      if (replacements[word.toUpperCase()]) return replacements[word.toUpperCase()];
      if (/^[A-Z0-9/-]{2,5}$/.test(word)) return word.toUpperCase();
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  text = text.replace(/\bSt James\b/i, "St James");
  text = text.replace(/\bSub-category\b/i, "Sub-Category");
  return text;
}

function formatDescription(value) {
  return formatLabel(value)
    .replace(/\bBy634\/5\b/g, "BY634/5")
    .replace(/\bLh\b/g, "LH")
    .replace(/\bRh\b/g, "RH")
    .replace(/\bPdc\b/g, "PDC");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

let toastTimeout;
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 1600);
}
