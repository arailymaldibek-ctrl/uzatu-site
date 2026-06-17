// ── NAV scroll effect ──
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (nav) nav.style.background =
    window.scrollY > 60 ? 'rgba(28,10,20,.99)' : 'rgba(28,10,20,.94)';
});

// ── Scroll reveal ──
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

// ── Phone mask ──
function initPhoneMask() {
  const el = document.getElementById('f-phone');
  if (!el) return;
  el.addEventListener('input', () => {
    let v = el.value.replace(/\D/g, '');
    if (v.startsWith('8')) v = '7' + v.slice(1);
    if (v.startsWith('7')) {
      const p = v.slice(1);
      let r = '+7';
      if (p.length > 0) r += ' (' + p.slice(0,3);
      if (p.length >= 3) r += ') ' + p.slice(3,6);
      if (p.length >= 6) r += '-' + p.slice(6,8);
      if (p.length >= 8) r += '-' + p.slice(8,10);
      el.value = r;
    }
  });
}

// ── RSVP attend toggle ──
function initAttend() {
  const radios = document.querySelectorAll('input[name="attend"]');
  radios.forEach(r => {
    r.addEventListener('change', () => {
      document.querySelectorAll('.radio-opt').forEach(o => o.classList.remove('selected'));
      r.closest('.radio-opt').classList.add('selected');
      const guests = document.getElementById('fg-guests');
      if (guests) guests.style.display = r.value === 'yes' ? '' : 'none';
    });
  });
}

// ── Validate ──
function validate() {
  let ok = true;
  const name  = document.getElementById('f-name');
  const phone = document.getElementById('f-phone');
  const attend = document.querySelector('input[name="attend"]:checked');

  clearErrors();

  if (!name || !name.value.trim()) { setError('fg-name'); ok = false; }
  if (!phone || phone.value.replace(/\D/g,'').length < 11) { setError('fg-phone'); ok = false; }
  if (!attend) { setError('fg-attend'); ok = false; }

  return ok;
}

function setError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('has-error');
}
function clearErrors() {
  document.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));
}

// ── Submit RSVP ──
function submitRSVP(e) {
  e.preventDefault();
  if (!validate()) return;

  const name   = document.getElementById('f-name').value.trim();
  const phone  = document.getElementById('f-phone').value.trim();
  const attend = document.querySelector('input[name="attend"]:checked').value;
  const guests = attend === 'yes' ? parseInt(document.getElementById('f-guests').value) : 0;
  const note   = document.getElementById('f-note').value.trim();

  // Block duplicate phone
  const list = getRSVP();
  const raw  = phone.replace(/\D/g,'');
  const dup  = list.find(r => r.phone.replace(/\D/g,'') === raw);
  if (dup) {
    // Update existing record
    dup.attend = attend; dup.guests = guests; dup.note = note;
    dup.date = new Date().toLocaleDateString('ru');
    saveRSVP(list);
  } else {
    list.push({ id: Date.now(), name, phone, attend, guests, note, date: new Date().toLocaleDateString('ru') });
    saveRSVP(list);
  }

  const btn = document.getElementById('submit-btn');
  if (btn) btn.disabled = true;

  document.getElementById('rsvp-card').style.display = 'none';
  const suc = document.getElementById('rsvp-success');
  suc.style.display = '';
  document.getElementById('success-title').textContent = t('rsvp_thanks') + ' ' + name + ',';
  document.getElementById('success-msg').textContent   = attend === 'yes' ? t('rsvp_ok_yes') : t('rsvp_ok_no');
}

// ── Storage ──
function getRSVP() {
  try { return JSON.parse(localStorage.getItem('uzatu_rsvp') || '[]'); } catch { return []; }
}
function saveRSVP(list) {
  localStorage.setItem('uzatu_rsvp', JSON.stringify(list));
}

// ── ADMIN ──
const SESSION_KEY = 'uzatu_admin';

function doLogin() {
  const pwd = document.getElementById('pwd-input').value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, '1');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-screen').style.display = '';
    renderAdmin();
  } else {
    document.getElementById('login-err').textContent = t('login_err');
  }
}

function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

function initAdmin() {
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-screen').style.display = '';
    renderAdmin();
  }
}

function renderAdmin() {
  const list = getRSVP();
  const yes  = list.filter(r => r.attend === 'yes');
  const no   = list.filter(r => r.attend === 'no');
  const ppl  = yes.reduce((s, r) => s + (parseInt(r.guests) || 1), 0);

  document.getElementById('st-total').textContent  = list.length;
  document.getElementById('st-yes').textContent    = yes.length;
  document.getElementById('st-no').textContent     = no.length;
  document.getElementById('st-guests').textContent = ppl;

  renderTable();
}

function renderTable() {
  const list   = getRSVP();
  const search = (document.getElementById('adm-search')?.value || '').toLowerCase();
  const filter = document.getElementById('adm-filter')?.value || '';

  let rows = list.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search) ||
      r.phone.includes(search);
    const matchFilter = !filter || r.attend === filter;
    return matchSearch && matchFilter;
  });

  const tbody = document.getElementById('guests-tbody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${t('adm_empty')}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.phone}</td>
      <td><span class="badge ${r.attend === 'yes' ? 'badge-yes' : 'badge-no'}">
        ${r.attend === 'yes' ? t('adm_yes_badge') : t('adm_no_badge')}
      </span></td>
      <td>${r.attend === 'yes' ? (r.guests || 1) : '—'}</td>
      <td>${r.note || '—'}</td>
      <td>${r.date}</td>
      <td><button class="btn-del" onclick="delEntry(${r.id})">🗑</button></td>
    </tr>
  `).join('');
}

function delEntry(id) {
  if (!confirm(t('adm_del_confirm'))) return;
  saveRSVP(getRSVP().filter(r => r.id !== id));
  renderAdmin();
}

function clearAll() {
  if (!confirm(t('adm_clear_confirm'))) return;
  saveRSVP([]);
  renderAdmin();
}

function exportCSV() {
  const list = getRSVP();
  const head = ['Имя','Телефон','Статус','Гостей','Комментарий','Дата'];
  const rows = list.map(r => [
    r.name, r.phone,
    r.attend === 'yes' ? 'Придёт' : 'Не придёт',
    r.attend === 'yes' ? (r.guests || 1) : 0,
    r.note || '', r.date
  ]);
  const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'uzatu_guests.csv';
  a.click();
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  initReveal();
  initPhoneMask();
  initAttend();
  if (document.getElementById('admin-screen')) initAdmin();
});
