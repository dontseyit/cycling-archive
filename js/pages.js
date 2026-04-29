/* ---- routing ---- */
function handleRoute(){
  const hash = location.hash.replace(/^#\/?/, '');
  if(hash === 'settings')            { _showSettings(); }
  else if(hash.startsWith('rider/')){ const id = hash.slice(6); if(id) _showRiderPage(id); else _showHome(); }
  else if(hash.startsWith('race/')) { const id = hash.slice(5); if(id) _showRacePage(id);  else _showHome(); }
  else                               { _showHome(); }
}

function _showHome(){
  $('settings-page').style.display = 'none';
  $('rider-page').style.display    = 'none';
  $('race-page').style.display     = 'none';
  $('tl').style.display = '';
  _navEl.style.display  = '';
  _footEl.style.display = '';
}

window.addEventListener('hashchange', handleRoute);

/* ---- settings page ---- */
function openSettings(){
  if(location.hash === '#settings') return;
  location.hash = 'settings';
}
function closeSettings(){ location.hash = ''; }

function _showSettings(){
  const prevQ = { rider: $('sq-rider')?.value || '', race: $('sq-race')?.value || '' };
  $('settings-page').innerHTML = settingsPageHtml();
  $('settings-page').style.display = '';
  $('rider-page').style.display    = 'none';
  $('race-page').style.display     = 'none';
  $('tl').style.display = 'none';
  _navEl.style.display  = 'none';
  _footEl.style.display = 'none';
  ['rider','race'].forEach(type => {
    if(prevQ[type]){
      const inp = $('sq-' + type);
      if(inp){ inp.value = prevQ[type]; filterSettingsList(type, prevQ[type]); }
    }
  });
}

const settingsSort = list => [...list].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || a.name.localeCompare(b.name));
const settingList  = type => type === 'rider' ? riders : raceTypes;
const findSetting  = (type, id) => settingList(type).find(r => r.id === id);

function setItemHtml(r, type){
  const catBadge = type === 'race' && r.category
    ? `<span style="font-size:10px;color:var(--ink3);flex-shrink:0;">${esc(CAT_LABEL[r.category] || r.category)}</span>`
    : '';
  const headThumb = type === 'rider' && r.head
    ? `<img src="./images/heads/${esc(r.head)}" style="height:24px;width:auto;display:block;flex-shrink:0;" onerror="_imgErrHide(this)">`
    : '';
  return `<div class="set-item" id="si-${r.id}">
    <button class="set-fav-btn${r.fav ? ' is-fav' : ''}" onclick="toggleFav('${type}','${r.id}')" title="${r.fav ? 'Unfavourite' : 'Favourite'}">${r.fav ? '&#9733;' : '&#9734;'}</button>
    <div class="set-swatch" style="background:${r.color}"></div>
    ${headThumb}
    <span class="set-name">${esc(r.name)}</span>
    ${catBadge}
    <button class="set-edit-btn" onclick="editSetting('${type}','${r.id}')">Edit</button>
    <button class="set-del" onclick="delSetting('${type}','${r.id}')">&#x2715;</button>
  </div>`;
}

function settingsListHtml(list, type){
  if(!list.length) return `<div class="set-empty">No ${type === 'rider' ? 'riders' : 'races'} yet</div>`;
  const sorted = settingsSort(list);
  const favCount = sorted.filter(r => r.fav).length;
  return sorted.map((r, i) =>
    (i === favCount && favCount > 0 && favCount < sorted.length ? `<div class="set-divider"></div>` : '') +
    setItemHtml(r, type)
  ).join('');
}

function catSelectHtml(id, sel){
  return `<select id="${id}">
    <option value="grandtour" ${sel==='grandtour'?'selected':''}>Grand Tour</option>
    <option value="stage"     ${sel==='stage'    ?'selected':''}>Stage race</option>
    <option value="classic"   ${sel==='classic'  ?'selected':''}>Classic</option>
  </select>`;
}

function settingsPanelHtml(type, title, placeholder){
  const catRow = type === 'race' ? catSelectHtml('sc-cat-' + type, 'grandtour') : '';
  return `<div class="set-panel">
            <h3>${title}</h3>
            <input class="set-search" id="sq-${type}" type="search" placeholder="Search ${title.toLowerCase()}…" oninput="filterSettingsList('${type}',this.value)">
            <div class="set-list" id="sl-${type}">${settingsListHtml(settingList(type), type)}</div>
            <div class="set-add">
              <input type="text" id="sn-${type}" placeholder="${placeholder}">
              ${catRow}
              <input type="color" id="sc-${type}" value="#323232">
              <button class="mb mb-pri" onclick="addSetting('${type}')">Add</button>
            </div>
          </div>`;
}

function settingsPageHtml(){
  return `
    <div class="set-page">
      <div class="set-page-hdr">
        <button class="btn" onclick="closeSettings()">&#8592; Back</button>
        <div class="set-page-title">Settings</div>
      </div>
      <div class="set-panels">
        ${settingsPanelHtml('rider', 'Riders', 'Rider name')}
        ${settingsPanelHtml('race',  'Races',  'Race name')}
      </div>
    </div>`;
}

function filterSettingsList(type, query){
  const q = query.trim().toLowerCase();
  const list = settingList(type);
  const container = $('sl-' + type);
  if(!container) return;
  container.querySelectorAll('.set-item[id^="si-"]').forEach(el => {
    const id = el.id.slice(3);
    const item = list.find(r => r.id === id);
    el.style.display = (!q || (item && item.name.toLowerCase().includes(q))) ? '' : 'none';
  });
  const divider = container.querySelector('.set-divider');
  if(divider){
    const visibleItems  = [...container.querySelectorAll('.set-item[id^="si-"]')].filter(el => el.style.display !== 'none');
    const favVisible    = visibleItems.some(el => { const id = el.id.slice(3); const item = list.find(r => r.id === id); return item?.fav; });
    const nonFavVisible = visibleItems.some(el => { const id = el.id.slice(3); const item = list.find(r => r.id === id); return !item?.fav; });
    divider.style.display = (favVisible && nonFavVisible) ? '' : 'none';
  }
}

function replaceSettingRow(type, id){
  const item = findSetting(type, id);
  const el = $('si-' + id);
  if(item && el) el.outerHTML = setItemHtml(item, type);
}

function editSetting(type, id){
  const item = findSetting(type, id); if(!item) return;
  const el = $('si-' + id); if(!el) return;
  const catSel  = type === 'race' ? catSelectHtml('ecat-' + id, item.category || 'grandtour') : '';
  const headInp = type === 'rider'
    ? `<input type="text" id="eh-${id}" value="${esc(item.head || '')}" placeholder="head filename.png" style="font-size:11px;color:var(--ink3);">`
    : '';
  el.outerHTML = `<div class="set-item set-item-edit" id="si-${id}">
    <input type="color" id="ec-${id}" value="${item.color}">
    <input type="text"  id="en-${id}" value="${esc(item.name)}">
    ${catSel}
    ${headInp}
    <button class="mb mb-pri set-save-btn" onclick="saveSetting('${type}','${id}')">Save</button>
    <button class="set-del" onclick="replaceSettingRow('${type}','${id}')">&#x2715;</button>
  </div>`;
  $('en-' + id).focus();
}

function saveSetting(type, id){
  const name = $('en-' + id)?.value.trim(); if(!name) return;
  const item = findSetting(type, id);
  if(item){
    item.name  = name;
    item.color = $('ec-' + id).value;
    if(type === 'race') item.category = $('ecat-' + id)?.value || item.category || 'grandtour';
    if(type === 'rider'){
      const h = $('eh-' + id)?.value.trim();
      if(h) item.head = h; else delete item.head;
    }
  }
  saveSettings(); updateDynCSS();
  replaceSettingRow(type, id);
  render();
}

function toggleFav(type, id){
  const item = findSetting(type, id);
  if(item) item.fav = !item.fav;
  saveSettings(); openSettings();
}

function addSetting(type){
  const name = $('sn-' + type).value.trim(); if(!name) return;
  const entry = { id: uid(), name, color: $('sc-' + type).value, fav: false };
  if(type === 'race') entry.category = $('sc-cat-race')?.value || 'grandtour';
  settingList(type).push(entry);
  saveSettings(); updateDynCSS(); openSettings();
}

function delSetting(type, id){
  if(type === 'rider') riders = riders.filter(r => r.id !== id);
  else raceTypes = raceTypes.filter(r => r.id !== id);
  saveSettings(); updateDynCSS(); openSettings();
}

/* ---- rider profile page ---- */
function openRiderPage(riderId){
  if(location.hash === '#rider/' + riderId) return;
  location.hash = 'rider/' + riderId;
}
function closeRiderPage(){ location.hash = ''; }

function _showRiderPage(riderId){
  $('rider-page').innerHTML = riderPageHtml(riderId);
  $('rider-page').style.display    = '';
  $('settings-page').style.display = 'none';
  $('race-page').style.display     = 'none';
  $('tl').style.display = 'none';
  _navEl.style.display  = 'none';
  _footEl.style.display = 'none';
}

function riderPageHtml(riderId){
  const rider = riderById(riderId);
  const backBtn = `<button class="btn" onclick="closeRiderPage()">&#8592; Back</button>`;
  if(!rider){
    return `<div class="rp-page"><div class="rp-back-row">${backBtn}</div><div class="rp-empty">Rider not found.</div></div>`;
  }
  const headHtml = rider.head ? `<img class="rp-hero-head" src="./images/heads/${esc(rider.head)}" alt="" onerror="_imgErrHide(this)">` : '';
  const hero = `<div class="rp-hero">
    <div class="rp-hero-text">
      <div class="rp-hero-name" style="color:${esc(rider.color)}">${esc(rider.name)}</div>
      <div class="rp-hero-sub">In your archive</div>
    </div>
    ${headHtml}
  </div>`;

  const appearances = [];
  races.forEach(race => {
    ['winner','second','third'].forEach((field, idx) => {
      const r = resolveRider(race[field]);
      if(r && r.id === riderId) appearances.push({ race, position: ['1st','2nd','3rd'][idx] });
    });
  });

  if(!appearances.length){
    return `<div class="rp-page"><div class="rp-back-row">${backBtn}</div>${hero}<div class="rp-empty">No appearances logged in your archive yet.</div></div>`;
  }

  appearances.sort((a, b) => b.race.year - a.race.year || (a.race.date || '').localeCompare(b.race.date || ''));
  const byYear = new Map();
  appearances.forEach(ap => {
    const y = ap.race.year;
    if(!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(ap);
  });

  const imgCache = new Map();
  let cols = '';
  byYear.forEach((aps, year) => {
    let entries = '';
    aps.forEach(({ race, position }) => {
      const rt      = resolveRace(race);
      const color   = CAT_COLOR[rt.category] || '#888';
      if(!imgCache.has(race.id)) imgCache.set(race.id, loadImgs(race.id));
      const firstImg = imgCache.get(race.id).find(i => i && i.data);
      const thumb   = firstImg
        ? `<div class="e-thumb"><img src="${firstImg.data}" alt="" onerror="_imgErrThumb(this)"></div>`
        : `<div class="e-thumb-ph"></div>`;
      const snippet = race.howwon ? race.howwon.slice(0, 120) : '';
      entries += `<div class="rp-col-entry" onclick="openDetail('${race.id}')">
        <div class="e-bar" style="background:${color}"></div>
        <span class="rp-pos pos-${position}">${position}</span>
        ${thumb}
        <div class="e-body">
          <div class="e-name ${raceTypeCls(race.raceTypeId)}">${esc(rt.name)}</div>
          ${snippet ? `<div class="e-how">${esc(snippet)}</div>` : ''}
        </div>
      </div>`;
    });
    cols += `<div class="rp-col">
      <div class="rp-col-hdr">${year}</div>
      <div class="rp-col-entries">${entries}</div>
    </div>`;
  });

  const gridCols = Math.min(byYear.size, 3);
  return `<div class="rp-page"><div class="rp-back-row">${backBtn}</div>${hero}<div class="rp-grid rp-grid-cols-${gridCols}">${cols}</div></div>`;
}

/* ---- race page ---- */
function openDetail(id){
  if(location.hash === '#race/' + id) return;
  location.hash = 'race/' + id;
}
function closeRacePage(){ history.back(); }

function _showRacePage(id){
  $('race-page').innerHTML = racePageHtml(id);
  $('race-page').style.display     = '';
  $('settings-page').style.display = 'none';
  $('rider-page').style.display    = 'none';
  $('tl').style.display = 'none';
  _navEl.style.display  = 'none';
  _footEl.style.display = 'none';
  window.scrollTo(0, 0);
}

function racePageHtml(id){
  const backBtn = `<button class="btn" onclick="closeRacePage()">&#8592; Back</button>`;
  const race = races.find(r => r.id === id);
  if(!race) return `<div class="rp-page"><div class="rp-back-row">${backBtn}</div><div class="rp-empty">Race not found.</div></div>`;

  const rt      = resolveRace(race);
  const color   = CAT_COLOR[rt.category] || '#888';
  const dateStr = race.date ? parseDateNoon(race.date).toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'}) : '';
  const imgs    = loadImgs(id).filter(i => i && i.data);
  const layoutCls = ['', 'one', 'two', 'three'][imgs.length] || 'three';
  const imgsHtml = imgs.length === 0 ? '' : `<div class="det-imgs ${layoutCls}">${
    imgs.map((img, ix) =>
      `<div class="det-img-wrap"><img src="${img.data}" alt="${esc(img.cap || '')}" onerror="_imgErrWrap(this,'.det-img-wrap')" onclick="openLightbox('${id}',${ix})">${img.cap ? `<div class="det-img-cap">${esc(img.cap)}</div>` : ''}</div>`
    ).join('')
  }</div>`;

  const section = (label, bodyHtml) => `<div class="d-sec"><div class="d-lbl">${label}</div>${bodyHtml}</div>`;

  const podiumItem = (rank, field) => {
    const r = resolveRider(field);
    if(!r) return '';
    const rObj     = r.id ? riderById(r.id) : null;
    const headHtml = rObj?.head ? `<img class="pod-head" src="./images/heads/${esc(rObj.head)}" alt="" onerror="_imgErrHide(this)">` : '';
    const nameHtml = r.id
      ? `<a class="${riderCls(r.id)} rider-link" onclick="openRiderPage('${r.id}')">${esc(r.name)}</a>`
      : `<span>${esc(r.name)}</span>`;
    return `<div class="pod-p">${headHtml}<div class="pp">${rank}</div><div class="pr">${nameHtml}</div></div>`;
  };

  const podiumHtml = (race.winner || race.second || race.third)
    ? section('Podium', `<div class="pod-row">${podiumItem('1st', race.winner)}${podiumItem('2nd', race.second)}${podiumItem('3rd', race.third)}</div>`)
    : '';
  const moments     = race.moments ? race.moments.split('\n').filter(Boolean) : [];
  const momentsHtml = moments.map(m => `<li>${esc(m)}</li>`).join('');

  let otherEditionsHtml = '';
  if(race.raceTypeId){
    const others = races.filter(r => r.raceTypeId === race.raceTypeId && r.id !== id);
    if(others.length){
      others.sort((a, b) => b.year - a.year || (a.date || '').localeCompare(b.date || ''));
      const imgCache = new Map();
      const byYear   = new Map();
      others.forEach(r => {
        if(!byYear.has(r.year)) byYear.set(r.year, []);
        byYear.get(r.year).push(r);
      });
      let cols = '';
      byYear.forEach((entries, year) => {
        let rows = '';
        entries.forEach(r => {
          const rrt  = resolveRace(r);
          const rcol = CAT_COLOR[rrt.category] || '#888';
          if(!imgCache.has(r.id)) imgCache.set(r.id, loadImgs(r.id));
          const fi   = imgCache.get(r.id).find(i => i && i.data);
          const thumb = fi ? `<div class="e-thumb"><img src="${fi.data}" alt="" onerror="_imgErrThumb(this)"></div>` : `<div class="e-thumb-ph"></div>`;
          const riderLink = (field, cls) => {
            const rd = resolveRider(field);
            if(!rd) return '';
            return rd.id
              ? `<a class="${riderCls(rd.id)} rider-link${cls ? ' '+cls : ''}" onclick="event.stopPropagation();openRiderPage('${rd.id}')">${esc(rd.name)}</a>`
              : `<span class="${cls}">${esc(rd.name)}</span>`;
          };
          const dateS  = r.date ? parseDateNoon(r.date).toLocaleDateString('en-GB', {day:'numeric', month:'long'}) : '';
          const podLine = (r.winner || r.second || r.third)
            ? `<div class="e-win"><strong>${riderLink(r.winner,'')}</strong>${r.second ? ` · <span class="e-2nd">${riderLink(r.second,'e-2nd')}</span>` : ''}${r.third ? ` · <span class="e-3rd">${riderLink(r.third,'e-3rd')}</span>` : ''}</div>`
            : '';
          rows += `<div class="rp-col-entry" onclick="openDetail('${r.id}')">
            <div class="e-bar" style="background:${rcol}"></div>
            ${thumb}
            <div class="e-body">
              ${podLine}
              <div class="e-name" style="font-size:12px;color:var(--ink2)">${dateS}</div>
              ${r.howwon ? `<div class="e-how">${esc(r.howwon.slice(0,100))}</div>` : ''}
            </div>
          </div>`;
        });
        cols += `<div class="rp-col"><div class="rp-col-hdr">${year}</div><div class="rp-col-entries">${rows}</div></div>`;
      });
      const gridCols = Math.min(byYear.size, 3);
      otherEditionsHtml = `<div class="det-other-hdr">Other editions</div><div class="rp-grid rp-grid-cols-${gridCols}">${cols}</div>`;
    }
  }

  const editBtn = viewMode ? '' : `<button class="mb mb-pri" onclick="closeRacePage();openAddModal('${race.id}')">Edit</button>`;

  return `<div class="rp-page">
    <div class="rp-back-row" style="display:flex;align-items:center;gap:10px;">
      ${backBtn}
      ${editBtn}
    </div>
    ${imgsHtml}
    <div class="det-hero">
      <div class="d-bar" style="background:${color}"></div>
      <div class="d-cat">${esc(CAT_LABEL[rt.category] || '')}</div>
      <div class="det-hero-name-row">
        <div class="d-name ${raceTypeCls(race.raceTypeId)}">${esc(rt.name)}</div>
        ${race.year ? `<div class="det-hero-year">${race.year}</div>` : ''}
      </div>
      <div class="d-date">${dateStr}</div>
    </div>
    ${podiumHtml}
    ${race.howwon  ? section('How it was won', `<div class="hwon">${esc(race.howwon)}</div>`) : ''}
    ${momentsHtml  ? section('Key moments',    `<ul class="mlist">${momentsHtml}</ul>`) : ''}
    ${race.note    ? section('Personal note',  `<div class="hwon">${esc(race.note)}</div>`) : ''}
    ${otherEditionsHtml}
  </div>`;
}
