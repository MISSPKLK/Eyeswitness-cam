const LEVEL_LABEL = { easy:'ง่าย', medium:'ปานกลาง', hard:'ยาก' };
const plates = [
  // -- ง่าย --
  {digit:'8', fig:[215,70,60],  bg:[105,165,70],  kind:'rg', level:'easy'},
  {digit:'2', fig:[205,85,70],  bg:[110,160,65],  kind:'rg', level:'easy'},
  {digit:'1', fig:[70,110,185], bg:[210,190,90],  kind:'by', level:'easy'},
  // -- ปานกลาง --
  {digit:'5', fig:[200,95,80],  bg:[145,150,75],  kind:'rg', level:'medium'},
  {digit:'7', fig:[195,100,85], bg:[150,145,80],  kind:'rg', level:'medium'},
  {digit:'0', fig:[198,105,88], bg:[155,148,82],  kind:'rg', level:'medium'},
  {digit:'6', fig:[76,120,178], bg:[206,182,96],  kind:'by', level:'medium'},
  // -- ยาก --
  {digit:'3', fig:[190,110,90], bg:[168,140,85],  kind:'rg', level:'hard'},
  {digit:'9', fig:[188,112,92], bg:[172,138,88],  kind:'rg', level:'hard'},
  {digit:'4', fig:[95,125,165], bg:[195,175,110], kind:'by', level:'hard'}
];
let plateIdx = 0;
const answers = [];

function jitter(c){
  return c.map(v => Math.max(0,Math.min(255, v + (Math.random()*30-15))) | 0);
}
function drawPlate(){
  const p = plates[plateIdx];
  const idxEl = document.getElementById('plateIndex');
  if(idxEl) idxEl.textContent = 'แผ่น ' + String(plateIdx+1).padStart(2,'0') + ' / ' + String(plates.length).padStart(2,'0');
  const badge = document.getElementById('levelBadge');
  badge.textContent = 'ระดับความยาก: ' + LEVEL_LABEL[p.level];
  badge.className = 'level-badge ' + p.level;
  const cv = document.getElementById('plateCanvas');
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  ctx.clearRect(0,0,w,h);

  const mask = document.createElement('canvas'); mask.width=w; mask.height=h;
  const mctx = mask.getContext('2d');
  mctx.fillStyle = '#000'; mctx.fillRect(0,0,w,h);
  mctx.fillStyle = '#fff';
  mctx.font = 'bold ' + Math.floor(h*0.62) + 'px sans-serif';
  mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
  mctx.fillText(p.digit, w/2, h/2 + h*0.03);
  const maskData = mctx.getImageData(0,0,w,h).data;

  ctx.fillStyle = '#f8f9fa';
  ctx.beginPath(); ctx.arc(w/2,h/2,w/2,0,Math.PI*2); ctx.fill();

  const cx = w/2, cy = h/2, R = w/2;
  const dots = 2600;
  for(let i=0;i<dots;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = Math.sqrt(Math.random())*(R-4);
    const x = cx + Math.cos(ang)*rad;
    const y = cy + Math.sin(ang)*rad;
    const idx = (Math.floor(y)*w + Math.floor(x))*4;
    const insideFigure = maskData[idx] > 128;
    const col = jitter(insideFigure ? p.fig : p.bg);
    const r = 2 + Math.random()*3.2;
    ctx.beginPath();
    ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }
}
function drawProgress(){
  const el = document.getElementById('progress');
  el.innerHTML = plates.map((_,i)=>`<div class="seg ${i<plateIdx?'done':''}"></div>`).join('');
}
function drawKeypad(){
  const el = document.getElementById('keypad');
  let html = '';
  for(let n=0;n<=9;n++) html += `<div class="key" data-val="${n}">${n}</div>`;
  html += `<div class="key wide" data-val="none">มองไม่เห็นตัวเลข</div>`;
  el.innerHTML = html;
  el.querySelectorAll('.key').forEach(k=>{
    k.addEventListener('click', ()=>{
      answers.push({ correct: k.dataset.val === plates[plateIdx].digit, kind: plates[plateIdx].kind, level: plates[plateIdx].level });
      plateIdx++;
      if(plateIdx >= plates.length){ finishIshihara(); }
      else { drawProgress(); drawPlate(); }
    });
  });
}
function finishIshihara(){
  const rgWrongLevels = answers.filter(a=>a.kind==='rg' && !a.correct).map(a=>a.level);
  const byWrong = answers.filter(a=>a.kind==='by' && !a.correct).length > 0;
  let mode, title, desc;

  if(rgWrongLevels.includes('easy')){
    mode = 2; title = 'แนวโน้ม: Deuteranopia (ตาบอดสีแดง–เขียว, ชัดเจน)';
    desc = 'ดูเหมือนว่าจะแยกโทนสีแดงกับเขียวได้ยากนิดนึงนะคะ ระบบจะจำลองมุมมองแบบ Deuteranopia ให้ดูก่อนค่ะ (เปลี่ยนโหมดเองได้เสมอ)';
  } else if(rgWrongLevels.includes('medium')){
    mode = 2; title = 'แนวโน้ม: Deuteranopia (ตาบอดสีแดง–เขียว, ปานกลาง)';
    desc = 'ตอนสีเริ่มกลืนกันอาจจะแยกยากขึ้นนิดหน่อย เข้าข่ายภาวะ Deuteranopia ระดับปานกลางค่ะ ลองดูกล้องจำลองกันนะคะ';
  } else if(rgWrongLevels.includes('hard')){
    mode = 2; title = 'แนวโน้ม: ไวต่อสีแดง–เขียวต่ำเล็กน้อย (Deuteranopia, mild)';
    desc = 'เก่งมากค่ะ พลาดแค่แผ่นที่แยกยากสุดๆ เท่านั้น ถือว่ามีผลกระทบน้อยมาก ลองเปิดกล้องดูความต่างได้เลย';
  } else if(byWrong){
    mode = 3; title = 'แนวโน้ม: Tritanopia (ตาบอดสีน้ำเงิน–เหลือง)';
    desc = 'สีโทนน้ำเงิน-เหลืองอาจจะดูกลืนกันไปบ้างสำหรับคุณ ระบบจะตั้งค่าเริ่มต้นเป็นมุมมอง Tritanopia ให้นะคะ';
  } else {
    mode = 0; title = 'แนวโน้ม: สายตาปกติ (Normal Vision)';
    desc = 'การมองเห็นสีของคุณปกติดีเยี่ยมค่ะ! ทีนี้ลองสลับโหมดกล้องดูนะคะ ว่าเพื่อนๆ ที่ตาบอดสีเขาเห็นโลกใบนี้ต่างจากเรายังไง';
  }
  
  sessionStorage.setItem('ishiharaResultMode', mode);
  document.getElementById('ishiharaResultTitle').textContent = title;
  document.getElementById('ishiharaResultDesc').textContent = desc;
  
  document.getElementById('view-ishihara').classList.remove('active');
  document.getElementById('view-ishihara-result').classList.add('active');
}

document.getElementById('toCameraBtn').addEventListener('click', ()=> {
  window.location.href = 'camera.html';
});

// Auto start
drawProgress();
drawPlate();
drawKeypad();