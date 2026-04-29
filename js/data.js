/* ---- settings persistence ---- */
function loadSettings(){
  riders    = parseJSON(localStorage.getItem('cj_riders'),     []);
  raceTypes = parseJSON(localStorage.getItem('cj_race_types'), []);
  updateDynCSS();
}
function saveSettings(){
  localStorage.setItem('cj_riders',     JSON.stringify(riders));
  localStorage.setItem('cj_race_types', JSON.stringify(raceTypes));
}
function updateDynCSS(){
  $('cj-dyn').textContent = [
    ...riders.map(r    => `.rid-${r.id} { color:${r.color}; font-weight:600; }`),
    ...raceTypes.map(r => `.rtp-${r.id} { color:${r.color}; }`)
  ].join('\n');
}

/* ---- race / year persistence ---- */
function save(){
  localStorage.setItem('cj_races', JSON.stringify(races));
  localStorage.setItem('cj_years', JSON.stringify(years));
}
function saveImgs(id, imgs){
  try { localStorage.setItem(IMG_KEY(id), JSON.stringify(imgs)); }
  catch(e){ alert('Storage full — try smaller images.'); }
}
function loadImgs(id){
  const stored = viewMode ? (viewImgs[id] || EMPTY_IMGS()) : parseJSON(localStorage.getItem(IMG_KEY(id)), EMPTY_IMGS());
  return stored.map(i => i && i.file ? { data: `./images/${i.file}`, cap: i.cap || '' } : null);
}
function deleteImgs(id){ try { localStorage.removeItem(IMG_KEY(id)); } catch(e){} }

/* ---- initial load ---- */
async function load(){
  _navEl  = document.querySelector('.nav');
  _footEl = document.querySelector('.footer-bar');
  try {
    const res = await fetch('./data.json');
    if(!res.ok) throw new Error('not found');
    const payload = await res.json();
    if(!payload.races || !Array.isArray(payload.races)) throw new Error('invalid');
    viewMode  = true;
    viewImgs  = payload.images    || {};
    races     = payload.races     || [];
    years     = payload.years     || [];
    riders    = payload.riders    || [];
    raceTypes = payload.raceTypes || [];
    races.forEach(r => { if(r.category === 'monument') r.category = 'classic'; });
    years.sort((a,b) => a - b);
    page = Math.max(0, years.length - getColCount());
    updateDynCSS();
    render();
    applyViewMode();
    if(location.hash) handleRoute();
    return;
  } catch(e) { /* no data.json — fall through to localStorage */ }
  viewMode = false;
  loadSettings();
  races = parseJSON(localStorage.getItem('cj_races'), []);
  races.forEach(r => { if(r.category === 'monument') r.category = 'classic'; });
  years = parseJSON(localStorage.getItem('cj_years'), []);
  years.sort((a,b) => a - b);
  page = Math.max(0, years.length - getColCount());
  render();
  if(location.hash) handleRoute();
}

function applyViewMode(){
  document.querySelectorAll('.edit-only').forEach(el => el.style.display = 'none');
}

/* ---- backup / restore ---- */
function backupData(){
  const images = {};
  races.forEach(r => {
    const imgs = parseJSON(localStorage.getItem(IMG_KEY(r.id)), EMPTY_IMGS());
    if(imgs.some(i => i && i.file)) images[r.id] = imgs;
  });
  const payload = { version: "4.0.0", exportedAt: new Date().toISOString(), races, years, images, riders, raceTypes };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function restoreData(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const payload = JSON.parse(e.target.result);
      if(!payload.races || !Array.isArray(payload.races)) throw new Error('Invalid backup file.');
      const stamp = payload.exportedAt ? payload.exportedAt.slice(0, 10) : 'unknown date';
      if(!confirm(`This will replace all current data with the backup from ${stamp}.\n\nContinue?`)) return;
      races     = payload.races     || [];
      years     = payload.years     || [];
      riders    = payload.riders    || [];
      raceTypes = payload.raceTypes || [];
      Object.entries(payload.images || {}).forEach(([id, data]) => saveImgs(id, data));
      years.sort((a,b) => a - b);
      page = Math.max(0, years.length - getColCount());
      save(); saveSettings(); updateDynCSS(); render();
      alert('Backup restored successfully.');
    } catch(err){
      alert('Could not read backup file: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}
