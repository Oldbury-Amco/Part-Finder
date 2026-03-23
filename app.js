const DATA_FILE = 'bentley_bumper_catalog_data.json';

const filtersContainer = document.getElementById('filtersContainer');
const resultsEl = document.getElementById('results');
const resultsCountEl = document.getElementById('resultsCount');
const activeFiltersEl = document.getElementById('activeFilters');
const resetAllBtn = document.getElementById('resetAllBtn');
const clearTextBtn = document.getElementById('clearTextBtn');
const textSearchEl = document.getElementById('textSearch');
const cardTemplate = document.getElementById('resultCardTemplate');

let appData = null;
let parts = [];
let selectedFilters = {};
let searchText = '';

const filterOrder = ['model', 'variant', 'colour', 'partType', 'category', 'subCategory'];

function normalise(value) {
  return String(value ?? '').trim().toLowerCase();
}

function includesText(part, query) {
  const haystack = [
    part.material,
    part.materialDescription,
    part.model,
    part.variant,
    part.colour,
    part.partType,
    part.category,
    part.subCategory,
    part.supplierName
  ].join(' ').toLowerCase();

  return haystack.includes(query);
}

function getLabel(key) {
  return appData?.fieldLabels?.[key] || key;
}

function initSelectedFilters() {
  selectedFilters = {};
  filterOrder.forEach(key => {
    selectedFilters[key] = new Set();
  });
}

function getFilteredParts() {
  return parts.filter(part => {
    const textMatch = !searchText || includesText(part, searchText);

    const filterMatch = filterOrder.every(key => {
      const selections = selectedFilters[key];
      if (!selections || selections.size === 0) return true;
      return selections.has(String(part[key] ?? ''));
    });

    return textMatch && filterMatch;
  });
}

function getPreviewParts(excludeKey = null) {
  return parts.filter(part => {
    const textMatch = !searchText || includesText(part, searchText);

    const filterMatch = filterOrder.every(key => {
      if (key === excludeKey) return true;
      const selections = selectedFilters[key];
      if (!selections || selections.size === 0) return true;
      return selections.has(String(part[key] ?? ''));
    });

    return textMatch && filterMatch;
  });
}

function toggleSelection(key, value) {
  const set = selectedFilters[key];
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  render();
}

function clearAll() {
  initSelectedFilters();
  searchText = '';
  textSearchEl.value = '';
  render();
}

function removeChip(key, value) {
  selectedFilters[key].delete(value);
  render();
}

function buildFilters() {
  filtersContainer.innerHTML = '';

  filterOrder.forEach(key => {
    const group = document.createElement('section');
    group.className = 'filter-group';

    const title = document.createElement('h3');
    title.textContent = getLabel(key);
    group.appendChild(title);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    const previewParts = getPreviewParts(key);
    const availableValues = new Set(previewParts.map(part => String(part[key] ?? '')).filter(Boolean));
    const allValues = appData.filters[key] || [];

    allValues.forEach(value => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn';
      btn.textContent = value;

      const isActive = selectedFilters[key].has(value);
      const isAvailable = availableValues.has(value);

      if (isActive) btn.classList.add('active');
      if (!isAvailable && !isActive) btn.classList.add('disabled');

      btn.addEventListener('click', () => toggleSelection(key, value));
      buttonGroup.appendChild(btn);
    });

    group.appendChild(buttonGroup);
    filtersContainer.appendChild(group);
  });
}

function buildActiveChips() {
  activeFiltersEl.innerHTML = '';

  const entries = [];
  filterOrder.forEach(key => {
    selectedFilters[key].forEach(value => {
      entries.push({ key, value });
    });
  });

  if (searchText) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = `Search: ${searchText} ×`;
    chip.addEventListener('click', () => {
      searchText = '';
      textSearchEl.value = '';
      render();
    });
    activeFiltersEl.appendChild(chip);
  }

  entries.forEach(({ key, value }) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = `${getLabel(key)}: ${value} ×`;
    chip.addEventListener('click', () => removeChip(key, value));
    activeFiltersEl.appendChild(chip);
  });
}

function copyText(value, button) {
  navigator.clipboard.writeText(value).then(() => {
    const original = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => (button.textContent = original), 1200);
  });
}

function buildResults() {
  const filtered = getFilteredParts();
  resultsEl.innerHTML = '';
  resultsCountEl.textContent = `${filtered.length} part${filtered.length === 1 ? '' : 's'} found`;

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<strong>No matching parts found.</strong><br>Try removing a filter or broadening your search.';
    resultsEl.appendChild(empty);
    return;
  }

  filtered.forEach(part => {
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.part-number').textContent = part.material || 'Unknown';
    node.querySelector('.part-description').textContent = part.materialDescription || '';

    const copyBtn = node.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => copyText(part.material || '', copyBtn));

    const metaGrid = node.querySelector('.meta-grid');

    const fields = [
      ['Model', part.model],
      ['Variant', part.variant],
      ['Colour', part.colour],
      ['Part Type', part.partType],
      ['Category', part.category],
      ['Subcategory', part.subCategory],
      ['Supplier', part.supplierName]
    ];

    fields.forEach(([label, value]) => {
      if (!value) return;
      const item = document.createElement('div');
      item.className = 'meta-item';
      item.innerHTML = `
        <div class="meta-label">${label}</div>
        <div class="meta-value">${value}</div>
      `;
      metaGrid.appendChild(item);
    });

    resultsEl.appendChild(node);
  });
}

function render() {
  buildFilters();
  buildActiveChips();
  buildResults();
}

async function init() {
  try {
    const response = await fetch(DATA_FILE);
    if (!response.ok) throw new Error('Could not load data file.');
    appData = await response.json();
    parts = appData.parts || [];
    initSelectedFilters();
    render();
  } catch (error) {
    resultsEl.innerHTML = `<div class="empty-state"><strong>App error</strong><br>${error.message}</div>`;
    resultsCountEl.textContent = 'Unable to load data';
  }
}

resetAllBtn.addEventListener('click', clearAll);
clearTextBtn.addEventListener('click', () => {
  searchText = '';
  textSearchEl.value = '';
  render();
});

textSearchEl.addEventListener('input', event => {
  searchText = event.target.value.trim().toLowerCase();
  render();
});

init();
