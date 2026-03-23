
const state = {
  model: '',
  family: '',
  colour: '',
  partType: '',
  category: '',
  position: '',
  side: '',
  search: ''
};

const filterOrder = ['model', 'family', 'colour', 'partType', 'category', 'position', 'side'];
let allParts = [];

const els = {
  modelButtons: document.getElementById('modelButtons'),
  familyButtons: document.getElementById('familyButtons'),
  colourButtons: document.getElementById('colourButtons'),
  partTypeButtons: document.getElementById('partTypeButtons'),
  categoryButtons: document.getElementById('categoryButtons'),
  positionButtons: document.getElementById('positionButtons'),
  sideButtons: document.getElementById('sideButtons'),
  results: document.getElementById('results'),
  resultsCount: document.getElementById('resultsCount'),
  searchBox: document.getElementById('searchBox'),
  resetBtn: document.getElementById('resetBtn'),
  activeFilters: document.getElementById('activeFilters')
};

function normaliseValue(v) {
  return (v || '').toString().trim();
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function titleCaseLabel(text) {
  if (!text) return 'Unknown';
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (['lh','rh'].includes(word)) return word.toUpperCase();
      if (word === 'by631') return 'BY631';
      if (word === 'by634/5') return 'BY634/5';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function filteredParts(ignoreKey = null) {
  return allParts.filter(part => {
    for (const key of filterOrder) {
      if (key === ignoreKey) continue;
      if (state[key] && normaliseValue(part[key]) !== state[key]) return false;
    }
    if (state.search) {
      const hay = `${part.partNumber} ${part.description}`.toLowerCase();
      if (!hay.includes(state.search.toLowerCase())) return false;
    }
    return true;
  });
}

function uniqueValues(key) {
  const items = filteredParts(key)
    .map(item => normaliseValue(item[key]))
    .filter(Boolean);

  return [...new Set(items)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function renderButtons(container, key, values) {
  container.innerHTML = '';
  if (!values.length) {
    container.innerHTML = '<p class="muted">No options for current selection.</p>';
    return;
  }

  values.forEach(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `filter-btn${state[key] === value ? ' active' : ''}`;
    btn.textContent = titleCaseLabel(value);
    btn.addEventListener('click', () => {
      state[key] = state[key] === value ? '' : value;

      const idx = filterOrder.indexOf(key);
      for (let i = idx + 1; i < filterOrder.length; i += 1) {
        state[filterOrder[i]] = '';
      }

      renderAll();
    });
    container.appendChild(btn);
  });
}

function renderActiveFilters() {
  const active = filterOrder.filter(key => state[key]).map(key => `${titleCaseLabel(key.replace(/([A-Z])/g, ' $1'))}: ${titleCaseLabel(state[key])}`);
  if (state.search) active.push(`Search: ${state.search}`);
  els.activeFilters.innerHTML = active.length
    ? active.map(item => `<span class="active-pill">${escapeHtml(item)}</span>`).join('')
    : '<p class="muted">No filters selected.</p>';
}

function renderResults() {
  const results = filteredParts();
  els.resultsCount.textContent = `${results.length} part${results.length === 1 ? '' : 's'} found`;

  if (!results.length) {
    els.results.innerHTML = '<div class="empty-state">No parts match the current filters.</div>';
    return;
  }

  els.results.innerHTML = results
    .slice(0, 500)
    .map(part => `
      <article class="result-item">
        <div class="result-meta">
          <p class="part-number">${escapeHtml(part.partNumber)}</p>
          <p class="part-desc">${escapeHtml(part.description || 'No description')}</p>
        </div>
        <button class="copy-btn" type="button" data-part="${escapeHtml(part.partNumber)}">Copy</button>
      </article>
    `)
    .join('');

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const part = btn.getAttribute('data-part');
      try {
        await navigator.clipboard.writeText(part);
        const old = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => btn.textContent = old, 1200);
      } catch {
        btn.textContent = 'Copy failed';
        setTimeout(() => btn.textContent = 'Copy', 1200);
      }
    });
  });
}

function renderAll() {
  renderButtons(els.modelButtons, 'model', uniqueValues('model'));
  renderButtons(els.familyButtons, 'family', uniqueValues('family'));
  renderButtons(els.colourButtons, 'colour', uniqueValues('colour'));
  renderButtons(els.partTypeButtons, 'partType', uniqueValues('partType'));
  renderButtons(els.categoryButtons, 'category', uniqueValues('category'));
  renderButtons(els.positionButtons, 'position', uniqueValues('position'));
  renderButtons(els.sideButtons, 'side', uniqueValues('side'));
  renderActiveFilters();
  renderResults();
}

async function init() {
  try {
    const res = await fetch('parts_data.json');
    allParts = await res.json();
    renderAll();
  } catch (err) {
    els.results.innerHTML = '<div class="empty-state">Unable to load parts data. Check that parts_data.json is in the same folder as index.html.</div>';
    els.resultsCount.textContent = 'Data load failed';
  }
}

els.searchBox.addEventListener('input', (e) => {
  state.search = e.target.value.trim();
  renderActiveFilters();
  renderResults();
});

els.resetBtn.addEventListener('click', () => {
  for (const key of filterOrder) state[key] = '';
  state.search = '';
  els.searchBox.value = '';
  renderAll();
});

init();
