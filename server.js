// สำหรับรันทดสอบในเครื่อง (local dev) — logic จริงอยู่ที่ api/index.js
// เพราะ Vercel ต้องการ export app แบบ serverless function ไม่มี app.listen()
const app = require('./api/index.js');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Eyewitness Cam API running on http://localhost:${PORT}`);
});
