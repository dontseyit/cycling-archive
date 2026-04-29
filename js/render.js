/* ---- filter ---- */
function setFilter(type){
  activeFilter = activeFilter === type ? null : type;
  render();
}
function updateFilterBtns(){
  $('filterRiders').classList.toggle('active', activeFilter === 'riders');
  $('filterRaces').classList.toggle('active',  activeFilter === 'races');
}

/* ---- year navigation ---- */
function prevPage(){ if(page > 0){ page = Math.max(0, page - getColCount()); render(); } }
function nextPage(){ if(page + getColCount() < years.length){ page = clampPage(page + getColCount()); render(); } }
function addYear(){
  const y = parseInt(prompt('Enter year (e.g. 2022):'));
  if(!(y && y > 1900 && y < 2200)) return;
  if(!years.includes(y)){ years.push(y); years.sort((a,b) => a - b); }
  page = clampPage(years.indexOf(y));
  save(); render();
}

/* ---- main render ---- */
function render(){
  const colCount = getColCount();
  $('tl').style.gridTemplateColumns = '42px repeat(' + colCount + ', 1fr)';
  const visible = years.slice(page, page + colCount);
  while(visible.length < colCount) visible.push(null);

  const favRiderIds    = new Set(riders.filter(r => r.fav).map(r => r.id));
  const favRaceIds     = new Set(raceTypes.filter(r => r.fav).map(r => r.id));
  const podiumRiderIds = r => [r.winner, r.second, r.third].map(f => resolveRider(f)?.id).filter(Boolean);
  const matchesFilter  = r => {
    if(!activeFilter) return true;
    if(activeFilter === 'riders') return podiumRiderIds(r).some(id => favRiderIds.has(id));
    if(activeFilter === 'races')  return r.raceTypeId ? favRaceIds.has(r.raceTypeId) : false;
    return true;
  };

  const racesByYearMonth = visible.map(year => {
    const buckets = Array.from({length: 12}, () => []);
    if(!year) return buckets;
    races.filter(r => r.year === year && r.date && matchesFilter(r)).forEach(r => {
      buckets[parseDateNoon(r.date).getMonth()].push(r);
    });
    buckets.forEach(list => list.sort((a,b) => new Date(a.date) - new Date(b.date)));
    return buckets;
  });

  const activeMonths = [];
  for(let m = 0; m < 12; m++){
    if(racesByYearMonth.some(buckets => buckets[m].length > 0)) activeMonths.push(m);
  }

  let html = `<div class="spine-hdr"></div>`;
  visible.forEach(year => { html += yearHeaderHtml(year); });

  activeMonths.forEach(month => {
    html += `<div class="spine-cell">${MONTHS_SHORT[month]}</div>`;
    visible.forEach((year, colIdx) => {
      html += monthCellHtml(year, racesByYearMonth[colIdx][month], colIdx === colCount - 1);
    });
  });

  if(activeMonths.length === 0){
    html += `<div style="grid-column:1/-1;padding:3rem 2rem;text-align:center;font-size:13px;color:var(--ink3);font-style:italic;">${viewMode ? 'No races found.' : 'No races yet — click + Add race to begin your journal.'}</div>`;
  }

  $('tl').innerHTML = html;

  $('prevBtn').disabled = page <= 0;
  $('nextBtn').disabled = page + colCount >= years.length;
  const shown = visible.filter(Boolean);
  $('navLbl').textContent = shown.length ? shown[0] + (shown.length > 1 ? ' – ' + shown[shown.length - 1] : '') : '';
  updateFilterBtns();
}

function yearHeaderHtml(year){
  if(!year){
    return `<div class="ycol-hdr" style="border-left:0.5px solid var(--rule);opacity:.2;"></div>`;
  }
  return `<div class="ycol-hdr">
    <span class="ycol-hdr-num">${year}</span>
    <button class="ycol-add edit-only" onclick="openAddModal(null,${year})" title="Add race to ${year}">+</button>
  </div>`;
}

function monthCellHtml(year, entries, isLast){
  if(!year){
    return `<div class="mrow mrow-empty${isLast ? ' mrow-last' : ''} mrow-phantom${isLast ? ' mrow-phantom-last' : ''}"></div>`;
  }
  const cls = `mrow${isLast ? ' mrow-last' : ''}${entries.length === 0 ? ' mrow-empty' : ''}`;
  if(entries.length === 0) return `<div class="${cls}"></div>`;
  return `<div class="${cls}">${entries.map(entryHtml).join('')}</div>`;
}

function entryHtml(race){
  const rt          = resolveRace(race);
  const color       = CAT_COLOR[rt.category] || '#888';
  const firstImg    = loadImgs(race.id).find(i => i && i.data);
  const winnerRider = resolveRider(race.winner);
  const winnerObj   = winnerRider?.id ? riderById(winnerRider.id) : null;
  const headFile    = winnerObj?.head || null;
  const thumb       = firstImg
    ? `<div class="e-thumb"><img src="${firstImg.data}" alt="" onerror="_imgErrThumb(this)"></div>`
    : `<div class="e-thumb-ph"></div>`;
  const headHtml    = headFile ? `<img class="e-head" src="./images/heads/${esc(headFile)}" alt="" onerror="_imgErrHide(this)">` : '';
  const snippet     = race.howwon || (race.moments ? race.moments.split('\n')[0] : '');
  const snippetHtml = snippet ? `<div class="e-how">${esc(snippet)}</div>` : '';
  const riderSpan   = field => {
    const r = resolveRider(field);
    if(!r) return '';
    if(r.id) return `<a class="${riderCls(r.id)} rider-link" onclick="event.stopPropagation();openRiderPage('${r.id}')">${esc(r.name)}</a>`;
    return `<span>${esc(r.name)}</span>`;
  };
  const podiumHtml = race.winner
    ? `<div class="e-win"><strong>${riderSpan(race.winner)}</strong>${race.second ? ` · <span class="e-2nd">${riderSpan(race.second)}</span>` : ''}${race.third ? ` · <span class="e-3rd">${riderSpan(race.third)}</span>` : ''}</div>`
    : '';
  return `<div class="entry" onclick="openDetail('${race.id}')">
    <div class="e-bar" style="background:${color}"></div>
    ${thumb}
    <div class="e-body">
      <div class="e-name ${raceTypeCls(race.raceTypeId)}">${esc(rt.name)}</div>
      ${podiumHtml}
      ${snippetHtml}
    </div>
    ${headHtml}
  </div>`;
}

/* ---- responsive resize ---- */
let _resizeTimer, _lastColCount = getColCount();
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    const cc = getColCount();
    if(cc !== _lastColCount){ _lastColCount = cc; page = clampPage(page); render(); }
  }, 120);
});
