/* ---- constants ---- */
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COLOR    = { grandtour:'#185FA5', stage:'#0F6E56', classic:'#993C1D' };
const CAT_LABEL    = { grandtour:'Grand Tour', stage:'Stage race', classic:'Classic' };
const PAGE_SIZE    = 3;
const IMG_KEY      = id => 'cj_img_' + id;
const EMPTY_IMGS   = () => [null, null, null];

/* ---- shared mutable state ---- */
let races = [], years = [], page = 0, pendingImgs = {};
let riders = [], raceTypes = [];
let activeFilter = null;
let viewMode = false, viewImgs = {};
let _navEl, _footEl;

/* ---- small utilities ---- */
const $ = id => document.getElementById(id);
function parseJSON(raw, fallback){ try { return raw ? JSON.parse(raw) : fallback; } catch(e){ return fallback; } }
function parseDateNoon(d){ return new Date(d + 'T12:00:00'); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function clampPage(targetIdx){ return Math.max(0, Math.min(Math.max(0, years.length - getColCount()), targetIdx)); }
function getColCount(){ return window.innerWidth < 580 ? 1 : window.innerWidth < 860 ? 2 : PAGE_SIZE; }

/* ---- image error handlers ---- */
function _imgErrThumb(img){
  console.warn('[Journal] Missing image:', img.src.split('/').pop());
  const thumb = img.closest('.e-thumb');
  if(thumb) thumb.replaceWith(Object.assign(document.createElement('div'),{className:'e-thumb-ph'}));
}
function _imgErrHide(img){
  console.warn('[Journal] Missing image:', img.src.split('/').pop());
  img.style.display = 'none';
}
function _imgErrWrap(img, cls){
  console.warn('[Journal] Missing image:', img.src.split('/').pop());
  const el = img.closest(cls);
  if(!el) return;
  el.style.display = 'none';
  const parent = el.parentElement;
  if(parent && [...parent.children].every(c => c.style.display === 'none'))
    parent.style.display = 'none';
}
function _imgErrSlot(img){
  console.warn('[Journal] Missing image:', img.src.split('/').pop());
  const preview = img.closest('.img-slot-preview');
  if(preview) preview.innerHTML = '<div class="img-slot-label">Not found</div>';
}

/* ---- resolver helpers ---- */
const riderById    = id => riders.find(r => r.id === id) || null;
const raceTypeById = id => raceTypes.find(r => r.id === id) || null;

function resolveRider(field){
  if(!field) return null;
  if(typeof field === 'object'){
    const r = riderById(field.id);
    return { id: field.id, name: r ? r.name : (field.name || '') };
  }
  const r = riders.find(r => r.name === field);
  return { id: r ? r.id : null, name: field };
}

function resolveRace(race){
  const rt = race.raceTypeId ? raceTypeById(race.raceTypeId) : null;
  return {
    name:     rt ? rt.name     : (race.name     || ''),
    category: rt ? rt.category : (race.category || ''),
    color:    rt ? rt.color    : null,
  };
}

const riderCls    = riderId    => riderId    ? `rid-${riderId}`    : '';
const raceTypeCls = raceTypeId => raceTypeId ? `rtp-${raceTypeId}` : '';
