'use strict';

const state = { items: [], watchlist: [], localMedia: [], filter: 'all', query: '', view: 'discover', provider: 'demo', searchTimer: null, requestId: 0 };
const $ = (selector) => document.querySelector(selector);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function visibleItems() {
  let items = state.view === 'watchlist' ? state.watchlist : state.view === 'local' ? state.localMedia : state.items;
  if (state.view === 'local' && state.query) {
    const query = state.query.toLowerCase();
    items = items.filter(item => item.title.toLowerCase().includes(query));
  } else if (state.view !== 'local' && state.filter !== 'all') {
    items = items.filter(item => item.type === state.filter);
  }
  return items;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'SIZE N/A';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function render() {
  const items = visibleItems();
  $('#catalogGrid').innerHTML = items.map(item => {
    const isLocal = item.type === 'local';
    const saved = !isLocal && state.watchlist.some(entry => String(entry.id) === String(item.id));
    const image = item.poster || item.backdrop || '';
    return `
      <article class="media-card" data-open="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(item.title)}">
        <div class="poster-wrap">
          ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="local-poster"><span>▶</span><small>LOCAL MEDIA</small></div>'}
          <span class="type-pill">${isLocal ? escapeHtml(item.extension.toUpperCase()) : escapeHtml(item.type)}</span>
          <span class="rating">${isLocal ? 'ON DEVICE' : '★ ' + escapeHtml(item.rating || '—')}</span>
        </div>
        <div class="card-info">
          <div class="card-genre">${isLocal ? 'YOUR MEDIA LIBRARY' : escapeHtml(item.genre || 'Unclassified')}</div>
          <div class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
          <div class="card-meta"><span>${isLocal ? formatBytes(item.size) : escapeHtml(item.year || 'YEAR N/A')}</span>${isLocal ? '<span class="play-label">PLAY ▶</span>' : `<button class="save-button ${saved ? 'saved' : ''}" data-save="${escapeHtml(item.id)}" aria-label="Save to library">${saved ? '◆' : '◇'}</button>`}</div>
        </div>
      </article>`;
  }).join('');
  $('#emptyState').classList.toggle('hidden', items.length !== 0);
  $('#resultCount').textContent = items.length + (items.length === 1 ? ' TITLE' : ' TITLES');
  $('#catalogMetric').textContent = state.items.length;
  $('#libraryMetric').textContent = state.watchlist.length;
  $('#savedCount').textContent = state.watchlist.length;
  $('#sectionTitle').innerHTML = state.view === 'watchlist' ? 'Your library<span>.</span>' : state.view === 'local' ? 'Local media<span>.</span>' : 'Featured discoveries<span>.</span>';
  $('#filters').classList.toggle('hidden', state.view === 'local');
}

async function loadLocalMedia() {
  try {
    const result = await api('/api/media');
    state.localMedia = result.items || [];
    render();
  } catch (error) {
    notify(error.message);
  }
}

async function loadCatalog(query = '') {
  const requestId = ++state.requestId;
  $('#systemStatus').textContent = 'SYNCING';
  try {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    const result = await api('/api/catalog' + (params.size ? '?' + params.toString() : ''));
    if (requestId !== state.requestId) return;
    state.items = result.items || [];
    state.provider = result.provider || 'demo';
    $('#providerLabel').textContent = state.provider === 'tmdb' ? 'live TMDB metadata' : 'sample catalogue';
    $('#systemStatus').textContent = 'SYSTEM ONLINE';
    render();
  } catch (error) {
    if (requestId !== state.requestId) return;
    $('#systemStatus').textContent = 'API OFFLINE';
    notify(error.message);
  }
}

async function loadWatchlist() {
  try {
    const result = await api('/api/watchlist');
    state.watchlist = result.items || [];
    render();
  } catch (error) {
    notify(error.message);
  }
}

async function toggleSave(id) {
  const item = [...state.items, ...state.watchlist].find(entry => String(entry.id) === String(id));
  if (!item) return;
  try {
    const result = await api('/api/watchlist/' + encodeURIComponent(id), {
      method: 'PUT',
      body: JSON.stringify({ item })
    });
    state.watchlist = result.items || [];
    render();
    notify(result.saved ? 'Added to your library.' : 'Removed from your library.');
  } catch (error) {
    notify(error.message);
  }
}

function openDetails(id) {
  const item = state.view === 'local'
    ? state.localMedia.find(entry => String(entry.id) === String(id))
    : [...state.items, ...state.watchlist].find(entry => String(entry.id) === String(id));
  if (!item) return;
  const dialog = $('#detailDialog');
  if (item.type === 'local') {
    $('#detailContent').innerHTML = `
      <div class="player-heading"><div class="detail-meta">ZENTRAX LOCAL PLAYER · ${escapeHtml(item.extension.toUpperCase())}</div><h2>${escapeHtml(item.title)}</h2></div>
      <div class="player-wrap"><video id="zentraxPlayer" controls playsinline preload="metadata"><source src="${escapeHtml(item.url)}">Your browser does not support HTML5 video.</video></div>
      <div class="detail-body"><p>Playing from your configured local media library. Seeking uses HTTP byte-range requests.</p><small>${formatBytes(item.size)}</small></div>`;
    dialog.showModal();
    $('#zentraxPlayer').play().catch(() => {});
    return;
  }
  const background = item.backdrop || item.poster;
  $('#detailContent').innerHTML = `
    <div class="detail-hero" style="background-image:linear-gradient(0deg,#101722,transparent 85%),url('${escapeHtml(background || '')}')">
      <div><div class="detail-meta">${escapeHtml(item.type)} · ${escapeHtml(item.year || 'YEAR N/A')} · ★ ${escapeHtml(item.rating || '—')}</div><h2>${escapeHtml(item.title)}</h2></div>
    </div>
    <div class="detail-body"><div class="detail-meta">${escapeHtml(item.genre || 'MEDIA')}</div><p>${escapeHtml(item.overview || 'No description available.')}</p>
      <button class="primary-button" id="detailSave">${state.watchlist.some(entry => String(entry.id) === String(item.id)) ? 'Remove from library' : 'Add to my library'} <span>↗</span></button>
      <p><small>Metadata source: ${escapeHtml(item.source || 'Catalogue')}</small></p>
    </div>`;
  $('#detailSave').addEventListener('click', () => { dialog.close(); toggleSave(item.id); });
  dialog.showModal();
}

document.addEventListener('click', event => {
  const save = event.target.closest('[data-save]');
  if (save) {
    event.stopPropagation();
    toggleSave(save.dataset.save);
    return;
  }
  const card = event.target.closest('[data-open]');
  if (card) openDetails(card.dataset.open);
  const nav = event.target.closest('[data-view]');
  if (nav) {
    state.view = nav.dataset.view;
    if (state.view === 'local') loadLocalMedia();
    document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button === nav));
    render();
  }
  const filter = event.target.closest('[data-filter]');
  if (filter) {
    state.filter = filter.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach(button => button.classList.toggle('selected', button === filter));
    render();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    $('#searchInput').focus();
  }
  if (event.target.matches('[data-open]') && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    openDetails(event.target.dataset.open);
  }
});

$('#searchInput').addEventListener('input', event => {
  state.query = event.target.value.trim();
  if (state.view === 'local') { render(); return; }
  clearTimeout(state.searchTimer);
  if (!state.query) {
    loadCatalog();
    return;
  }
  state.searchTimer = setTimeout(() => loadCatalog(state.query), 350);
});
$('#closeDialog').addEventListener('click', () => $('#detailDialog').close());
$('#refreshBtn').addEventListener('click', loadCatalog);
$('#exploreBtn').addEventListener('click', () => $('#catalogSection').scrollIntoView({ behavior: 'smooth' }));

Promise.all([loadCatalog(), loadWatchlist(), loadLocalMedia()]);
