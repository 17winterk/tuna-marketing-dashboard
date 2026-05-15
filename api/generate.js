// Vercel Serverless Function
// 위치: 프로젝트 루트 /api/generate.js
// Vercel 환경변수에 GEMINI_API_KEY 추가 필요

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { system, message, images } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'Vercel 환경변수에 GEMINI_API_KEY를 추가해주세요.' }
    });
  }

  // 메시지 파트 구성 (이미지 vision 포함)
  const parts = [];
  if (images && Object.keys(images).length > 0) {
    Object.entries(images).forEach(([rowId, img]) => {
      parts.push({ text: `[소재 ${rowId} 성별/연령 분포 이미지]` });
      parts.push({ inlineData: { mimeType: img.type || 'image/jpeg', data: img.b64 } });
    });
  }
  parts.push({ text: message });

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts }]
        })
      }
    );

    const data = await geminiRes.json();

    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: { message: 'AI 응답이 비어있습니다. 다시 시도해주세요.' } });
    }

    res.status(200).json({ text });

  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
}
