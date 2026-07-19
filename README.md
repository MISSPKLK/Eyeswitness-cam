<<<<<<< HEAD
# Eyewitness Cam — Backend (Node.js + Express + Supabase)

## Setup

1. สร้างโปรเจกต์ Supabase ใหม่ (หรือใช้ของเดิม) แล้วรัน `schema.sql` ใน SQL editor
2. คัดลอก `.env.example` เป็น `.env` แล้วใส่:
   - `SUPABASE_URL` — จาก Project Settings > API
   - `SUPABASE_SERVICE_KEY` — service_role key (Project Settings > API) **อย่า commit ขึ้น GitHub**
3. ติดตั้ง dependencies:
   ```
   npm install
   ```
4. รันเซิร์ฟเวอร์:
   ```
   npm start
   ```
   จะรันที่ `http://localhost:3000`

## API

| Method | Path | ทำอะไร |
|---|---|---|
| POST | /api/records | เพิ่มข้อมูล |
| GET | /api/records?mode=&q= | แสดงข้อมูล + กรองตาม mode / ค้นหาคำใน caption + สรุปยอดรวม |
| GET | /api/records/:id | ดูรายละเอียด 1 รายการ |
| PUT | /api/records/:id | แก้ไข caption / mode |
| DELETE | /api/records/:id | ลบ (ต้อง confirm ฝั่ง frontend ก่อนเรียก) |

## Deploy บน Vercel

1. push โฟลเดอร์ `eyewitness-cam-backend/` ขึ้น GitHub repo แยก (หรือ subfolder ก็ได้ แล้วตั้ง Root Directory ตอน import)
2. ไปที่ vercel.com → New Project → import repo นี้
3. ตั้งค่า Environment Variables ในหน้า Vercel project settings (**อย่าใส่ในโค้ด**):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
4. Deploy — Vercel จะ detect `api/index.js` เป็น serverless function อัตโนมัติ
5. ทดสอบ: เปิด `https://<โปรเจกต์>.vercel.app/api/health` ควรได้ `{"ok":true}`
6. เอา URL ที่ได้ (เช่น `https://eyewitness-cam-api.vercel.app`) ไปใส่ใน `API_BASE` ของไฟล์ `eyewitness-cam.html`

**หมายเหตุ:** โครงสร้างไฟล์แบ่งเป็น
- `api/index.js` — logic จริง (Express app), export เป็น handler ให้ Vercel เรียก
- `server.js` — ใช้รันทดสอบในเครื่องเท่านั้น (`npm start`), import app จาก `api/index.js` มา `.listen()` ปกติ
- `vercel.json` — สั่งให้ทุก request วิ่งเข้า `api/index.js` ตัวเดียว (รองรับ path ทั้งหมดที่ขึ้นต้นด้วย `/api/...`)
=======
# Eyeswitness-cam
>>>>>>> e5804df9d730a9106448adb86fa2471a3fb1ce25
