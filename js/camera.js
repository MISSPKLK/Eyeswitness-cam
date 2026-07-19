const video = document.getElementById('video');
const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
const modeTag = document.getElementById('modeTag');
const pills = document.querySelectorAll('.pill');
const shutterBtn = document.getElementById('shutterBtn');
const flash = document.getElementById('flash');
const statusEl = document.getElementById('status');
const overlay = document.getElementById('overlay');
const snapImg = document.getElementById('snapImg');
const resultCaption = document.getElementById('resultCaption');
const closeBtn = document.getElementById('closeBtn');

// Renders AI caption text, turning **keyword** markers into highlighted spans.
// Escapes HTML first so the AI response can never inject arbitrary markup.
function renderCaption(el, text){
  const escaped = (text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  el.innerHTML = escaped.replace(/\*\*(.+?)\*\*/g, '<span class="kw">$1</span>');
}

// Loading Elements
const aiProgressContainer = document.getElementById('aiProgressContainer');
const aiProgressBar = document.getElementById('aiProgressBar');
const aiProgressText = document.getElementById('aiProgressText');

let currentMode = parseInt(sessionStorage.getItem('ishiharaResultMode') || '0', 10);
const modeNames = ['Normal Vision','Protanopia','Deuteranopia','Tritanopia'];

function setMode(m){
  currentMode = m;
  pills.forEach(p => p.classList.toggle('active', parseInt(p.dataset.mode,10) === m));
  modeTag.innerHTML = '<span class="dot"></span>' + modeNames[m];
}
pills.forEach(p => p.addEventListener('click', ()=> setMode(parseInt(p.dataset.mode,10))));

// Aspect ratio switcher
const cameraFrame = document.getElementById('cameraFrame');
const ratioBtns = document.querySelectorAll('.ratio-btn');
ratioBtns.forEach(btn => btn.addEventListener('click', () => {
  ratioBtns.forEach(b => b.classList.toggle('active', b === btn));
  cameraFrame.dataset.ratio = btn.dataset.ratio;
  // wait one frame for the new aspect-ratio to lay out, then resync the GL viewport
  requestAnimationFrame(resizeCanvas);
}));

const vsSource = `
  attribute vec2 aPos; varying vec2 vUv;
  void main(){ vUv = vec2((aPos.x+1.0)/2.0, (1.0-aPos.y)/2.0); gl_Position = vec4(aPos,0.0,1.0); }
`;
const fsSource = `
  precision mediump float; varying vec2 vUv;
  uniform sampler2D uTex; uniform int uMode;
  void main(){
    vec4 c = texture2D(uTex, vUv);
    float r=c.r, g=c.g, b=c.b; vec3 o = vec3(r,g,b);
    if(uMode==1){ o = vec3(0.567*r+0.433*g, 0.558*r+0.442*g, 0.242*g+0.758*b); }
    else if(uMode==2){ o = vec3(0.625*r+0.375*g, 0.7*r+0.3*g, 0.3*g+0.7*b); }
    else if(uMode==3){ o = vec3(0.95*r+0.05*g, 0.433*g+0.567*b, 0.475*g+0.525*b); }
    gl_FragColor = vec4(o, c.a);
  }
`;
function compile(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; }
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(prog); gl.useProgram(prog);
const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'aPos');
gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
const uMode = gl.getUniformLocation(prog, 'uMode');

function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio||1);
  canvas.height = rect.height * (window.devicePixelRatio||1);
  gl.viewport(0,0,canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);

async function startCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ video:{facingMode:'environment'}, audio:false });
    video.srcObject = stream; await video.play();
    resizeCanvas(); requestAnimationFrame(render);
  }catch(e){ 
    statusEl.textContent = 'ไม่สามารถเปิดกล้องได้ รบกวนอนุญาตสิทธิ์การเข้าถึงกล้องก่อนนะคะ'; 
  }
}
function render(){
  if(video.readyState >= video.HAVE_CURRENT_DATA){
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.uniform1i(uMode, currentMode);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(render);
}

shutterBtn.addEventListener('click', async () => {
  flash.classList.remove('active'); void flash.offsetWidth; flash.classList.add('active');
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  snapImg.src = dataUrl;
  resultCaption.innerHTML = '<span>▍</span>';
  document.getElementById('resultLabel').textContent = 'AI วิเคราะห์ (' + modeNames[currentMode] + ')...';
  
  shutterBtn.disabled = true;
  statusEl.style.display = 'none';
  
  // Start simulated loading bar
  aiProgressContainer.style.display = 'block';
  aiProgressBar.style.width = '0%';
  aiProgressText.textContent = '0%';
  
  let progress = 0;
  const loadInterval = setInterval(() => {
    if (progress < 90) {
      progress += Math.floor(Math.random() * 12) + 1;
      if (progress > 90) progress = 90;
      aiProgressBar.style.width = progress + '%';
      aiProgressText.textContent = progress + '%';
    }
  }, 250);

  let captionText = '';
  try{
    const base64 = dataUrl.split(',')[1];
    const response = await fetch(API_BASE + '/api/caption', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ modeName: modeNames[currentMode], imageBase64: base64 })
    });
    const data = await response.json();
    
    // Complete loading bar
    clearInterval(loadInterval);
    aiProgressBar.style.width = '100%';
    aiProgressText.textContent = '100%';
    
    setTimeout(() => {
      overlay.classList.add('show');
      aiProgressContainer.style.display = 'none';
      statusEl.style.display = 'block';
    }, 400);

    if(!response.ok){
      console.error('caption API error:', data);
      resultCaption.textContent = 'AI เกิดข้อผิดพลาด: ' + (data.error || 'ไม่ทราบสาเหตุ ลองใหม่อีกครั้งนะคะ');
      shutterBtn.disabled = false;
      return;
    }
    captionText = (data.caption || '').trim();
    renderCaption(resultCaption, captionText || 'ไม่มีคำตอบกลับจาก AI ค่ะ ลองถ่ายใหม่อีกภาพนึงนะคะ');
    
  }catch(e){
    console.error('caption fetch failed:', e);
    clearInterval(loadInterval);
    aiProgressContainer.style.display = 'none';
    statusEl.style.display = 'block';
    overlay.classList.add('show');
    resultCaption.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ รบกวนตรวจสอบว่า API รันอยู่ที่ ' + API_BASE;
  }finally{
    shutterBtn.disabled = false;
  }

  if(captionText){
    try{
      await fetch(API_BASE + '/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modeIndex: currentMode,
          modeName: modeNames[currentMode],
          imageDataUrl: dataUrl,
          caption: captionText
        })
      });
    }catch(e){ }
  }
});
closeBtn.addEventListener('click', ()=> overlay.classList.remove('show'));

// Auto start
setMode(currentMode);
startCamera();