require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ---- Supabase client (this is the actual data store) ----
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key, kept server-side only

const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const TABLE = 'records';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ถ้า Supabase env ไม่ครบ ตอบ 500 เฉพาะ route ที่ต้องใช้ฐานข้อมูล (ไม่บล็อก /api/health, /api/caption)
app.use('/api/records', (req, res, next) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE_URL / SUPABASE_SERVICE_KEY env vars on Vercel' });
  }
  next();
});


// ---- Helpers ----
function badRequest(res, msg) {
  return res.status(400).json({ error: msg });
}

// ---- Routes ----

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// CAPTION — เรียก Gemini API ฝั่ง server เพื่ออธิบายภาพ (key ไม่หลุดไปฝั่ง frontend)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-flash-latest';

app.post('/api/caption', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY env var' });
  }
  const { modeName, imageBase64 } = req.body || {};
  if (!modeName || !imageBase64) {
    return badRequest(res, 'modeName and imageBase64 are required');
  }

  const prompt = `นี่คือภาพจำลองการมองเห็นแบบ "${modeName}" จากบูธสาธิตเรื่องตาบอดสี เขียนคำอธิบายภาษาไทยสั้นกระชับ ไม่เกิน 2 ประโยค (รวมไม่เกิน 50 คำ) เน้นกลไกที่ทำให้มองสีต่างไปและอ้างอิงสีจริงในภาพ ครอบคำสำคัญ 2-3 คำ (เช่น ชื่อภาวะตาบอดสี, ชื่อสี, ศัพท์เทคนิค) ด้วยเครื่องหมาย ** เช่น **ดิวเทอราโนเปีย** ห้ามใช้ markdown แบบอื่นเลย (ห้ามหัวข้อ ห้าม bullet ห้ามตัวหนาแบบอื่น) ใช้ ** ครอบคำสำคัญเท่านั้น ตอบเป็นข้อความล้วน`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
            ]
          }]
        })
      }
    );
    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      console.error('Gemini API error:', JSON.stringify(data));
      return res.status(502).json({ error: data?.error?.message || 'Gemini API error' });
    }
    const caption = (data.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || '')
      .join('\n')
      .trim();
    res.json({ caption });
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach Gemini API' });
  }
});

// CREATE — เพิ่มข้อมูล
app.post('/api/records', async (req, res) => {
  const { modeIndex, modeName, imageDataUrl, caption } = req.body || {};
  if (modeIndex === undefined || !modeName || !imageDataUrl || !caption) {
    return badRequest(res, 'modeIndex, modeName, imageDataUrl, caption are required');
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ mode_index: modeIndex, mode_name: modeName, image_data_url: imageDataUrl, caption }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// READ (list) — แสดงข้อมูล + ค้นหา/กรอง + สรุปยอดรวม
// query params: mode (int, optional), q (keyword search in caption, optional)
app.get('/api/records', async (req, res) => {
  const { mode, q } = req.query;
  let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });

  if (mode !== undefined && mode !== '') {
    query = query.eq('mode_index', Number(mode));
  }
  if (q) {
    query = query.ilike('caption', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // summary — สรุปยอดรวมต่อโหมด
  const summary = { total: data.length, byMode: {} };
  for (const r of data) {
    summary.byMode[r.mode_index] = (summary.byMode[r.mode_index] || 0) + 1;
  }

  res.json({ records: data, summary });
});

// READ (one) — ดูรายละเอียดข้อมูล
app.get('/api/records/:id', async (req, res) => {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'record not found' });
  res.json(data);
});

// UPDATE — แก้ไขข้อมูล
app.put('/api/records/:id', async (req, res) => {
  const { caption, modeIndex, modeName } = req.body || {};
  const update = {};
  if (caption !== undefined) update.caption = caption;
  if (modeIndex !== undefined) update.mode_index = modeIndex;
  if (modeName !== undefined) update.mode_name = modeName;
  if (Object.keys(update).length === 0) return badRequest(res, 'nothing to update');

  const { data, error } = await supabase
    .from(TABLE)
    .update(update)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE — ลบข้อมูล (frontend ต้อง confirm ก่อนเรียก endpoint นี้)
app.delete('/api/records/:id', async (req, res) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = app;