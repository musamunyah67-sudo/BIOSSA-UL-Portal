const MODEL = 'gemini-2.5-flash-lite';
const MAX_MESSAGE_LENGTH = 600;
const MAX_HISTORY_TURNS = 6; // last N exchanges, to keep requests small
var FAQ_LINES = [
  '- Organization: Biological Sciences Students Association, University of Liberia (BIOSSA-UL)',
  '- What BIOSSA-UL is: A student association representing students of Biological Sciences at the University of Liberia.',
  '- Motto: "...Passion for Life, Compassion for Recipient."',
  '- Digital initiative: BIOSSA GOES DIGITAL - an initiative to modernize BIOSSA-UL\'s student services through digital tools, online forms, databases, student identification, academic/support services, and a centralized digital portal.',
  '- Portal purpose: The BIOSSA-UL Digital Portal provides students and applicants with access to BIOSSA-UL\'s digital services and information.',
  '- How to apply: Applicants should follow the application process provided through the BIOSSA-UL Digital Portal. The exact invite-token/application procedure is not included in this chatbot\'s knowledge base.',
  '- Membership fee: Not specified in the chatbot\'s current knowledge base. Do not guess the amount or payment method.',
  '- Application deadline: Not specified in the chatbot\'s current knowledge base. Do not guess a date or deadline.',
  '- Where to check application status: On the BIOSSA-UL Digital Portal, under "Check Status" (portalCheckStatus).',
  '- Account/application information: The chatbot cannot access individual applicant or member records, application details, passwords, tokens, or account information.',
  '- Support: For questions not covered by this FAQ, direct the user to the official BIOSSA-UL support/contact channel provided on the portal.',
];
var FAQ_CONTEXT = FAQ_LINES.join('\n');

var SYSTEM_PROMPT = [
  'You are the support assistant embedded in the BIOSSA-UL Digital Portal website.',
  '',
  "Answer only questions about BIOSSA-UL membership, applications, and using the portal, using ONLY the facts below. If something isn't covered here, say you don't have that information and direct the person to the official BIOSSA-UL support/contact channel shown on the portal - do not guess or invent details, especially fees, dates, application procedures, or personal account information.",
  '',
  'Never ask for or reference passwords, tokens, or personal account details. You cannot look up a specific person\'s application status or account. Direct them to the "Check Status" page on the portal for that.',
  '',
  'Keep answers short (2-4 sentences), friendly, and plain-text (no markdown headers or tables).',
  '',
  'Known facts:',
  FAQ_CONTEXT,
].join('\n');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { message, history } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing required field: message' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: 'Message too long (max ' + MAX_MESSAGE_LENGTH + ' characters)',
    });
  }

  // history: [{role: 'user'|'model', text: '...'}, ...] - optional, from
  // the widget's own in-memory conversation. Trimmed defensively.
  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (h) =>
            h &&
            (h.role === 'user' || h.role === 'model') &&
            typeof h.text === 'string'
        )
        .slice(-MAX_HISTORY_TURNS * 2)
        .map((h) => ({
          role: h.role,
          parts: [{ text: h.text.slice(0, MAX_MESSAGE_LENGTH) }],
        }))
    : [];

  const contents = [
    ...safeHistory,
    { role: 'user', parts: [{ text: message }] },
  ];

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.4,
          },
        }),
      }
    );

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error('Gemini returned non-JSON:', raw.slice(0, 300));
      return res.status(502).json({ error: 'Chat service returned an unexpected response.' });
    }

    if (!response.ok) {
      console.error('Gemini error:', data);
      const status = response.status === 429 ? 429 : 502;
      const msg =
        status === 429
          ? "I'm getting a lot of questions right now - please try again in a minute."
          : 'Chat service is temporarily unavailable.';
      return res.status(status).json({ error: msg });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';

    if (!reply) {
      return res.status(502).json({ error: 'No response generated.' });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chat proxy error:', error);
    return res.status(500).json({ error: 'Chat request failed: ' + error.message });
  }
};
