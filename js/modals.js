/* ---- modal close helpers ---- */
function closeModal(){ $('mc').innerHTML = ''; pendingImgs = {}; }
function closeIfOverlay(e){ if(e.target.id === 'ov') closeModal(); }

/* ---- image slot helpers ---- */
const SLOT_LABELS = ['Finish / key moment', 'Route map', 'Extra moment'];

function imgSlotHtml(i){
  const p = pendingImgs[i];
  const file = p && p.file ? p.file : '';
  const preview = file
    ? `<div class="img-slot-preview"><img src="./images/${esc(file)}" alt="" onerror="_imgErrSlot(this)"></div>`
    : `<div class="img-slot-preview"><div class="img-slot-label">${SLOT_LABELS[i]}</div></div>`;
  return `<div class="img-slot" id="slot${i}">
    ${preview}
    <div class="img-slot-input">
      <input type="text" placeholder="filename.jpg" value="${esc(file)}" oninput="setSlotFile(${i},this.value)">
      ${file ? `<button class="img-slot-del" onclick="clearSlot(${i})">&#x2715;</button>` : ''}
    </div>
  </div>`;
}

function rerenderSlot(i){ $('slot' + i).outerHTML = imgSlotHtml(i); }
function setSlotFile(i, val){
  val = val.trim();
  pendingImgs[i] = val ? { file: val, cap: (pendingImgs[i] && pendingImgs[i].cap) || '' } : null;
  rerenderSlot(i);
}
function clearSlot(i){ pendingImgs[i] = null; rerenderSlot(i); }

/* ---- add / edit modal ---- */
function openAddModal(prefillId, prefillYear){
  const race = prefillId ? races.find(r => r.id === prefillId) : null;
  const rawImgs = race
    ? parseJSON(localStorage.getItem(IMG_KEY(race.id)), EMPTY_IMGS())
    : EMPTY_IMGS();
  pendingImgs = {};
  [0,1,2].forEach(i => { pendingImgs[i] = rawImgs[i] && rawImgs[i].file ? { ...rawImgs[i] } : null; });

  const today   = new Date().toISOString().split('T')[0];
  const defDate = race ? race.date : (prefillYear ? prefillYear + '-04-01' : today);
  const val = (field, fallback = '') => race ? esc(race[field] || '') : fallback;

  const raceNameOpts = () => {
    const curId = race ? race.raceTypeId : null;
    if(raceTypes.length === 0)
      return `<option value="" disabled selected>— add races in Settings first —</option>`;
    let opts = `<option value="" disabled ${!curId ? 'selected' : ''}>— select a race —</option>`;
    opts += raceTypes.map(r => `<option value="${esc(r.id)}" ${curId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('');
    return opts;
  };

  const riderOpts = (field = null) => {
    const curId = resolveRider(field)?.id || null;
    return `<option value="">${riders.length ? '—' : '— add riders in Settings first —'}</option>` +
      riders.map(r => `<option value="${esc(r.id)}" ${curId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('');
  };

  const initRt       = race?.raceTypeId ? raceTypeById(race.raceTypeId) : null;
  const initCat      = initRt?.category || '';
  const catLabelInit = initCat ? (CAT_LABEL[initCat] || initCat) : '—';
  const catColorInit = initCat ? (CAT_COLOR[initCat] || 'var(--ink3)') : 'var(--ink3)';

  $('mc').innerHTML = `
    <div class="overlay" id="ov" onclick="closeIfOverlay(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-title">${race ? 'Edit race' : 'Add race'}</div>
        <div class="field"><label>Race name</label><select id="fn" onchange="onRaceNameChange()">${raceNameOpts()}</select></div>
        <div class="field"><label>Date</label><input type="date" id="fd" value="${defDate}"></div>
        <div class="field"><label>Category</label><span id="fc-label" style="font-size:14px;font-style:italic;color:${catColorInit};">${catLabelInit}</span></div>
        <div class="field"><label>Winner</label><select id="fw">${riderOpts(race?.winner)}</select></div>
        <div class="field"><label>2nd place</label><select id="f2">${riderOpts(race?.second)}</select></div>
        <div class="field"><label>3rd place</label><select id="f3">${riderOpts(race?.third)}</select></div>
        <div class="field"><label>How it was won</label><textarea id="fh" placeholder="Describe the decisive moment...">${val('howwon')}</textarea></div>
        <div class="field"><label>Key moments (one per line)</label><textarea id="fm" placeholder="Stage 17 solo attack&#10;Crash on the descent...">${val('moments')}</textarea></div>
        <div class="field"><label>Personal note</label><input id="fp" value="${val('note')}" placeholder="Watched with..."></div>
        <div class="field">
          <label>Images (up to 3 &mdash; 3:2 crop)</label>
          <div class="img-upload-row" id="imgRow">${[0,1,2].map(imgSlotHtml).join('')}</div>
          <div class="img-cap-row" id="capRow">${[0,1,2].map(i => `<input id="cap${i}" type="text" placeholder="Caption ${i+1}" value="${pendingImgs[i] ? esc(pendingImgs[i].cap || '') : ''}">`).join('')}</div>
        </div>
        <div class="modal-acts">
          ${race ? `<button class="mb mb-del" onclick="delRace('${race.id}')">Delete</button>` : ''}
          <button class="mb mb-sec" onclick="closeModal()">Cancel</button>
          <button class="mb mb-pri" onclick="saveRace('${race ? race.id : ''}')">Save</button>
        </div>
      </div>
    </div>`;
}

function onRaceNameChange(){
  const rtId = $('fn')?.value;
  const rt = raceTypeById(rtId);
  const el = $('fc-label');
  if(!el) return;
  if(rt && rt.category){
    el.textContent = CAT_LABEL[rt.category] || rt.category;
    el.style.color = CAT_COLOR[rt.category] || 'var(--ink3)';
  } else {
    el.textContent = '—';
    el.style.color = 'var(--ink3)';
  }
}

function saveRace(id){
  const raceTypeId = $('fn').value;
  if(!raceTypeId){ alert('Please select a race.'); return; }
  const rt = raceTypeById(raceTypeId);
  if(!rt){ alert('Unknown race — please re-select.'); return; }

  const dateVal = $('fd').value;
  const year    = dateVal ? parseDateNoon(dateVal).getFullYear() : new Date().getFullYear();
  const raceId  = id || uid();

  const pickRider = elId => {
    const rid = $(elId).value;
    if(!rid) return null;
    const r = riderById(rid);
    return r ? { id: r.id, name: r.name } : null;
  };

  const obj = {
    id: raceId, raceTypeId, year, date: dateVal,
    name: rt.name, category: rt.category || 'classic',
    winner:  pickRider('fw'),
    second:  pickRider('f2'),
    third:   pickRider('f3'),
    howwon:  $('fh').value.trim(),
    moments: $('fm').value.trim(),
    note:    $('fp').value.trim()
  };

  const imgs = [0,1,2].map(i => {
    if(!pendingImgs[i] || !pendingImgs[i].file) return null;
    const cap = ($('cap' + i) || {}).value || '';
    return { file: pendingImgs[i].file, cap: cap.trim() };
  });

  if(!years.includes(year)){ years.push(year); years.sort((a,b) => a - b); }

  if(id){
    const idx = races.findIndex(r => r.id === id);
    if(idx >= 0) races[idx] = obj; else races.push(obj);
  } else {
    races.push(obj);
  }

  const yi = years.indexOf(year);
  if(yi < page || yi >= page + getColCount()) page = clampPage(yi);

  save();
  saveImgs(raceId, imgs);
  pendingImgs = {};
  closeModal();
  render();
}

function delRace(id){
  if(!confirm('Remove this race?')) return;
  races = races.filter(r => r.id !== id);
  deleteImgs(id);
  save();
  closeModal();
  render();
}

/* ---- lightbox ---- */
function openLightbox(raceId, imgIdx){
  const imgs = loadImgs(raceId).filter(i => i && i.data);
  if(!imgs[imgIdx]) return;
  const lb = document.createElement('div');
  lb.className = 'lbox';
  lb.onclick = () => lb.remove();
  const img = document.createElement('img');
  img.src = imgs[imgIdx].data;
  img.alt = imgs[imgIdx].cap || '';
  img.onerror = () => lb.remove();
  lb.appendChild(img);
  document.body.appendChild(lb);
}

/* ---- disclaimer ---- */
function openDisclaimer(){
  $('mc').innerHTML = `
    <div class="overlay" id="ov" onclick="closeIfOverlay(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-title">About this journal</div>
        <div class="field">
          <label>What this is</label>
          <p style="font-size:13px;line-height:1.75;color:var(--ink2);">A personal, hand-curated record of UCI WorldTour races built as a memory aid. Not a database, not an official record. Vibe-coded, work-in-progress.</p>
        </div>
        <div class="field">
          <label>Data &amp; completeness</label>
          <p style="font-size:13px;line-height:1.75;color:var(--ink2);">All entries are logged manually. Seasons, races, and results may be missing or incomplete. Nothing is scraped or updated automatically. Any counts or groupings shown reflect only what has actually been recorded here, nothing more.</p>
        </div>
        <div class="field">
          <label>Open source &amp; free</label>
          <p style="font-size:13px;line-height:1.75;color:var(--ink2);">This project is open source, completely free, and non-commercial. There are no ads, no trackers, no analytics, and no external requests beyond loading fonts from Google Fonts. It runs entirely in your browser. The code and data are yours to use and adapt.</p>
        </div>
        <div class="field">
          <label>Copyright</label>
          <p style="font-size:13px;line-height:1.75;color:var(--ink2);">Race results are factual records and not subject to copyright. UCI and WorldTour are trademarks of the Union Cycliste Internationale. This project has no affiliation with the UCI or any professional cycling organisation.</p>
        </div>
        <div class="modal-acts">
          <button class="mb mb-sec" onclick="closeModal()">Close</button>
        </div>
      </div>
    </div>`;
}
