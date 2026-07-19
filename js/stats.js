let currentFilterMode = '';
let currentSearchQ = '';
let lastRecords = [];
const modeNames = ['Normal Vision','Protanopia','Deuteranopia','Tritanopia'];

// Renders AI caption text, turning **keyword** markers into highlighted spans.
function renderCaption(text){
  const escaped = (text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped.replace(/\*\*(.+?)\*\*/g, '<span class="kw">$1</span>');
}

// --- Confirm modal (replaces native confirm()) ---
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitleEl = document.getElementById('confirmTitle');
const confirmMessageEl = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
let confirmResolve = null;

function showConfirm(title, message, okLabel){
  confirmTitleEl.textContent = title;
  confirmMessageEl.textContent = message;
  confirmOkBtn.textContent = okLabel || 'ยืนยัน';
  confirmOverlay.classList.add('show');
  return new Promise(resolve => { confirmResolve = resolve; });
}
function closeConfirm(result){
  confirmOverlay.classList.remove('show');
  if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
}
confirmOkBtn.addEventListener('click', () => closeConfirm(true));
confirmCancelBtn.addEventListener('click', () => closeConfirm(false));
confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirm(false); });

// --- Toast (replaces native alert()) ---
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(message, type){
  toastEl.textContent = message;
  toastEl.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

async function loadStats(){
  const statsCard = document.getElementById('statsCard');
  const gallery = document.getElementById('gallery');
  statsCard.innerHTML = '<div class="status" style="grid-column: 1/-1; text-align: center;">กำลังดึงข้อมูล...</div>';
  gallery.innerHTML = '';
  
  try{
    const params = new URLSearchParams();
    if(currentFilterMode !== '') params.set('mode', currentFilterMode);
    if(currentSearchQ) params.set('q', currentSearchQ);

    const res = await fetch(`${API_BASE}/api/records?${params.toString()}`);
    if(!res.ok) throw new Error('bad response');
    const { records, summary } = await res.json();
    lastRecords = records || [];

    // สร้าง HTML สำหรับ Stats Summary แบบใหม่
    let summaryHtml = '';
    
    // 1. การ์ด "ภาพทั้งหมด"
    summaryHtml += `
      <div class="stat-card">
        <div class="stat-card-title">ภาพทั้งหมด (ตามตัวกรอง)</div>
        <div class="stat-card-value">${summary.total}</div>
      </div>
    `;
    
    // 2. การ์ดแต่ละโหมด
    modeNames.forEach((name, i) => {
      const c = summary.byMode[i] || 0;
      const pct = summary.total ? Math.round((c / summary.total) * 100) : 0;
      summaryHtml += `
        <div class="stat-card">
          <div class="stat-card-title">${name}</div>
          <div class="stat-card-value" style="font-size:28px;">${c}</div>
          <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
          <div class="status" style="text-align:right; margin-top:8px; font-size:12px; font-weight:600; color:var(--text-muted);">${pct}%</div>
        </div>
      `;
    });
    
    statsCard.innerHTML = summaryHtml || '<div class="status" style="grid-column: 1/-1; text-align: center;">ยังไม่มีข้อมูลภาพถ่ายค่ะ</div>';

    // สร้าง Gallery
    gallery.innerHTML = lastRecords.slice(0,60).map(r => `
      <div class="gitem" data-id="${r.id}" style="cursor:pointer;">
        <img src="${r.image_data_url}" alt="">
        <div class="cap">${renderCaption((r.caption||'').slice(0,80))}</div>
      </div>
    `).join('') || '<div class="status" style="grid-column: 1/-1; text-align: center; margin-top: 20px;">ไม่พบข้อมูลตามเงื่อนไขที่ค้นหาค่ะ</div>';

    gallery.querySelectorAll('.gitem').forEach(el=>{
      el.addEventListener('click', ()=> openDetail(el.dataset.id));
    });
  }catch(e){
    statsCard.innerHTML = '<div class="status" style="grid-column: 1/-1; text-align: center;">โหลดข้อมูลไม่สำเร็จ รบกวนเช็คว่า API ทำงานอยู่ที่ ' + API_BASE + ' นะคะ</div>';
  }
}

document.getElementById('filterMode').addEventListener('change', (e)=>{
  currentFilterMode = e.target.value;
  loadStats();
});

let searchDebounce;
document.getElementById('searchBox').addEventListener('input', (e)=>{
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(()=>{
    currentSearchQ = e.target.value.trim();
    loadStats();
  }, 350);
});

// จัดการ Overlay
const detailOverlay = document.getElementById('detailOverlay');
const detailImg = document.getElementById('detailImg');
const detailMeta = document.getElementById('detailMeta');
const detailCaptionView = document.getElementById('detailCaptionView');
const detailCaptionEdit = document.getElementById('detailCaptionEdit');
let detailRecordId = null;

function openDetail(id){
  const r = lastRecords.find(x => x.id === id);
  if(!r) return;
  detailRecordId = id;
  detailImg.src = r.image_data_url;
  detailMeta.textContent = r.mode_name + ' • ' + new Date(r.created_at).toLocaleString('th-TH');
  detailCaptionView.innerHTML = renderCaption(r.caption);
  detailCaptionEdit.value = r.caption;
  detailCaptionView.style.display = '';
  detailCaptionEdit.style.display = 'none';
  document.getElementById('editCaptionBtn').style.display = '';
  document.getElementById('saveCaptionBtn').style.display = 'none';
  detailOverlay.classList.add('show');
}
document.getElementById('closeDetailBtn').addEventListener('click', ()=> detailOverlay.classList.remove('show'));

document.getElementById('editCaptionBtn').addEventListener('click', ()=>{
  detailCaptionView.style.display = 'none';
  detailCaptionEdit.style.display = '';
  document.getElementById('editCaptionBtn').style.display = 'none';
  document.getElementById('saveCaptionBtn').style.display = '';
});

document.getElementById('saveCaptionBtn').addEventListener('click', async ()=>{
  const newCaption = detailCaptionEdit.value.trim();
  if(!newCaption || !detailRecordId) return;
  try{
    await fetch(`${API_BASE}/api/records/${detailRecordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: newCaption })
    });
    detailOverlay.classList.remove('show');
    loadStats();
  }catch(e){ showToast('บันทึกไม่สำเร็จ รบกวนลองอีกครั้งนะคะ', 'error'); }
});

document.getElementById('deleteRecordBtn').addEventListener('click', async ()=>{
  if(!detailRecordId) return;
  const ok = await showConfirm('ลบรายการนี้?', 'การลบไม่สามารถย้อนกลับได้ ต้องการลบใช่ไหมคะ', 'ลบเลย');
  if(!ok) return;
  try{
    await fetch(`${API_BASE}/api/records/${detailRecordId}`, { method: 'DELETE' });
    detailOverlay.classList.remove('show');
    loadStats();
    showToast('ลบรายการเรียบร้อยแล้ว', 'success');
  }catch(e){ showToast('ลบไม่สำเร็จค่ะ', 'error'); }
});

// Auto start
loadStats();