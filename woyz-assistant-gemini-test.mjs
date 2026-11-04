// This connection check accepts no user question, note, patient ID or history.
const prompt = 'This is a software connectivity test with fictional data. A sample record has a blue label and two entries. In one short sentence, state the label color and entry count. Do not give medical advice.';

export async function testGeminiConnection({apiKey, signal, fetchImpl = fetch}) {
  const key = apiKey?.trim();
  if (!key) return 'No key saved. Add your Gemini API key in Settings → Authorization key.';
  const response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
    method: 'POST',
    headers: {'Content-Type':'application/json', 'x-goog-api-key':key},
    credentials:'omit',
    redirect:'error',
    signal,
    body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],
      generationConfig:{maxOutputTokens:128}})
  });
  if (response.status === 400 || response.status === 401 || response.status === 403)
    return 'Gemini rejected the request. Check the saved key and its Gemini API permissions.';
  if (response.status === 429) return 'Gemini quota or rate limit reached. Try again later.';
  if (!response.ok) return 'Gemini is unavailable for this test. Try again later.';
  const body = await response.json();
  const result = body.candidates?.[0]?.content?.parts?.filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join(' ').replace(/\s+/g,' ').trim();
  return result ? 'Gemini replied: '+result.slice(0,200) : 'Gemini returned no visible text for the test.';
}
