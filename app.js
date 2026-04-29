/* ===== UTILS ===== */
function parseTime(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function formatTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function showToast(msg, duration = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}



/* ===== STATE ===== */
let currentRunsheet = null;

/* ===== GENERATE ===== */
async function generateRunsheet() {


  const eventName = document.getElementById('eventName').value.trim() || 'Untitled Event';
  const eventType = document.getElementById('eventType').value;
  const audienceSize = document.getElementById('audienceSize').value;
  const startTime = document.getElementById('startTime').value || '09:00';
  const duration = parseInt(document.getElementById('duration').value);
  const numSessions = parseInt(document.getElementById('numSessions').value);
  const bufferStyle = document.getElementById('bufferStyle').value;
  const specialNotes = document.getElementById('specialNotes').value.trim();

  setLoading(true);

  const prompt = buildPrompt({ eventName, eventType, audienceSize, startTime, duration, numSessions, bufferStyle, specialNotes });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const rs = JSON.parse(clean);
    currentRunsheet = { ...rs, startTime };
    renderRunsheet(rs, startTime);
  } catch (e) {
    setLoading(false);
    showError(e.message || 'Something went wrong. Please try again.');
  }

  setLoading(false);
}

/* ===== PROMPT ===== */
function buildPrompt({ eventName, eventType, audienceSize, startTime, duration, numSessions, bufferStyle, specialNotes }) {
  const bufferMin = { minimal: 5, standard: 10, generous: 15 }[bufferStyle] || 10;
  return `You are an expert event producer with 15+ years of experience. Generate a detailed, professional runsheet.

EVENT DETAILS:
- Name: ${eventName}
- Type: ${eventType.replace('_', ' ')}
- Audience: ${audienceSize}
- Start time: ${startTime}
- Total duration: ${duration} hours (${duration * 60} minutes)
- Main sessions requested: ${numSessions}
- Buffer slots: ${bufferStyle} (${bufferMin} min each)
- Special notes: ${specialNotes || 'None'}

INSTRUCTIONS:
1. Create a complete runsheet that fits exactly within ${duration * 60} minutes.
2. Include: opening ceremony, ${numSessions} main content sessions, appropriate breaks, buffer slots, and a closing.
3. For conferences/seminars: keynotes + panels. For workshops: hands-on activities. For launches: product reveal + demos. Tailor to the event type.
4. Buffer slots should appear before/after critical transitions.
5. Speaker names should be realistic placeholder names (e.g. "Sarah Chen", "Marcus Williams").
6. MC scripts must be warm, professional, and ready to read aloud — 2-3 sentences each.
7. Room setup and AV needs must be specific to event type and audience size.
8. Contingency plans must be practical and actionable.

Respond ONLY with valid JSON, no markdown, no preamble. Use this exact schema:
{
  "eventName": "string",
  "eventType": "string",
  "audienceSize": "string",
  "totalDuration": "string (e.g. '4 hours')",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "sessions": [
    {
      "id": 1,
      "type": "opening|keynote|panel|workshop|break|networking|qa|buffer|closing",
      "title": "string",
      "speaker": "string or null",
      "duration": 20,
      "notes": {
        "roomSetup": "string",
        "avNeeds": "string",
        "mcCue": "string",
        "contingency": "string"
      },
      "speakerScript": "string — the MC introduction to read aloud"
    }
  ],
  "summary": {
    "totalSessions": 3,
    "totalBreaks": 2,
    "totalBufferTime": 20,
    "keyContacts": "string — who the MC should have on speed dial"
  }
}`;
}

/* ===== RENDER ===== */
const TYPE_LABELS = {
  opening: 'Opening', keynote: 'Keynote', panel: 'Panel',
  workshop: 'Workshop', break: 'Break', networking: 'Networking',
  qa: 'Q&A', buffer: 'Buffer', closing: 'Closing'
};

function renderRunsheet(rs, startTime) {
  let cursor = parseTime(startTime);
  const output = document.getElementById('runsheetOutput');

  let html = `
    <div class="rs-meta">
      <div class="rs-event-name">${escHtml(rs.eventName)}</div>
      <div class="rs-details">
        <span>🕐 ${rs.startTime} – ${rs.endTime}</span>
        <span>⏱ ${escHtml(rs.totalDuration)}</span>
        <span>👥 ${escHtml(rs.audienceSize)}</span>
        <span>📋 ${rs.sessions.length} items</span>
      </div>
    </div>
    <div class="rs-stats">
      <div class="rs-stat"><div class="rs-stat-label">Sessions</div><div class="rs-stat-value">${rs.summary.totalSessions}</div></div>
      <div class="rs-stat"><div class="rs-stat-label">Breaks</div><div class="rs-stat-value">${rs.summary.totalBreaks}</div></div>
      <div class="rs-stat"><div class="rs-stat-label">Buffer</div><div class="rs-stat-value">${rs.summary.totalBufferTime}m</div></div>
      <div class="rs-stat"><div class="rs-stat-label">Total items</div><div class="rs-stat-value">${rs.sessions.length}</div></div>
    </div>`;

  rs.sessions.forEach((s, i) => {
    const startT = formatTime(cursor);
    cursor += s.duration;
    const label = TYPE_LABELS[s.type] || s.type;
    const hasNotes = s.notes && (s.notes.roomSetup || s.notes.avNeeds || s.notes.mcCue || s.notes.contingency || s.speakerScript);

    html += `
      <div class="rs-item" id="item-${i}">
        <div class="rs-item-header" onclick="toggleItem(${i})" ${!hasNotes ? 'style="cursor:default"' : ''}>
          <div class="rs-time-block">
            <div class="rs-time-start">${startT}</div>
            <div class="rs-time-dur">${s.duration} min</div>
          </div>
          <div class="rs-info">
            <span class="type-badge type-${s.type}">${label}</span>
            <div class="rs-session-title">${escHtml(s.title)}</div>
            ${s.speaker ? `<div class="rs-speaker">${escHtml(s.speaker)}</div>` : ''}
          </div>
          ${hasNotes ? `<div class="rs-chevron" id="chev-${i}">▼</div>` : '<div></div>'}
        </div>
        ${hasNotes ? `
        <div class="rs-item-body" id="body-${i}">
          <div class="notes-grid">
            ${noteRow('Room setup', s.notes?.roomSetup)}
            ${noteRow('AV needs', s.notes?.avNeeds)}
            ${noteRow('MC cue', s.notes?.mcCue)}
            ${noteRow('Contingency', s.notes?.contingency)}
          </div>
          ${s.speakerScript ? `
            <div class="mc-script-label">MC script</div>
            <div class="mc-script">"${escHtml(s.speakerScript)}"</div>
          ` : ''}
        </div>` : ''}
      </div>`;
  });

  if (rs.summary.keyContacts) {
    html += `<div style="margin-top:16px;padding:12px 14px;background:var(--gray-50);border-radius:var(--radius-md);border:1px solid var(--gray-100)">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:4px">Key contacts</div>
      <div style="font-size:13px;color:var(--gray-600)">${escHtml(rs.summary.keyContacts)}</div>
    </div>`;
  }

  output.innerHTML = html;

  document.getElementById('outputToolbar').style.display = 'flex';
  document.getElementById('outputEventTitle').textContent = rs.eventName;
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('thinkingState').style.display = 'none';
  output.style.display = 'block';
}

function noteRow(label, value) {
  if (!value) return '';
  return `<div class="note-entry">
    <div class="note-entry-label">${label}</div>
    <div class="note-entry-value">${escHtml(value)}</div>
  </div>`;
}

function toggleItem(i) {
  const body = document.getElementById(`body-${i}`);
  const chev = document.getElementById(`chev-${i}`);
  if (!body) return;
  body.classList.toggle('open');
  if (chev) chev.classList.toggle('open');
}

/* ===== LOADING / ERROR STATES ===== */
function setLoading(on) {
  const btn = document.getElementById('genBtn');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('btnSpinner');
  btn.disabled = on;
  btnText.textContent = on ? 'Generating...' : 'Generate runsheet';
  spinner.style.display = on ? 'block' : 'none';

  if (on) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('runsheetOutput').style.display = 'none';
    document.getElementById('outputToolbar').style.display = 'none';
    document.getElementById('thinkingState').style.display = 'flex';
    const msgs = [
      'Crafting your event schedule...',
      'Writing MC scripts...',
      'Calculating buffer times...',
      'Adding AV notes...',
      'Almost ready...'
    ];
    let idx = 0;
    const el = document.getElementById('thinkingMsg');
    window._thinkingInterval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      el.textContent = msgs[idx];
    }, 1800);
  } else {
    clearInterval(window._thinkingInterval);
    document.getElementById('thinkingState').style.display = 'none';
  }
}

function showError(msg) {
  document.getElementById('thinkingState').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('emptyState').innerHTML = `
    <div class="empty-icon" style="color:#c0392b">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><line x1="24" y1="14" x2="24" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><circle cx="24" cy="32" r="1.5" fill="currentColor" opacity="0.6"/></svg>
    </div>
    <h3 style="color:#c0392b">Something went wrong</h3>
    <p>${escHtml(msg)}</p>`;
}

/* ===== COPY ===== */
function copyRunsheet() {
  if (!currentRunsheet) return;
  const rs = currentRunsheet;
  let text = `RUNSHEET: ${rs.eventName}\n`;
  text += `${rs.startTime} – ${rs.endTime}  |  ${rs.totalDuration}  |  ${rs.audienceSize} audience\n`;
  text += `${'─'.repeat(56)}\n\n`;

  let cursor = parseTime(rs.startTime);
  rs.sessions.forEach(s => {
    const startT = formatTime(cursor);
    cursor += s.duration;
    const label = TYPE_LABELS[s.type] || s.type;
    text += `${startT}  [${String(s.duration).padStart(2)}min]  ${label.toUpperCase().padEnd(12)}  ${s.title}`;
    if (s.speaker) text += ` — ${s.speaker}`;
    text += '\n';
    if (s.notes?.mcCue) text += `           MC cue: ${s.notes.mcCue}\n`;
    if (s.speakerScript) text += `           Script: "${s.speakerScript}"\n`;
    text += '\n';
  });

  if (rs.summary?.keyContacts) {
    text += `${'─'.repeat(56)}\nKey contacts: ${rs.summary.keyContacts}\n`;
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('Runsheet copied to clipboard!');
  }).catch(() => {
    showToast('Copy failed — please select and copy manually.');
  });
}

/* ===== PRINT ===== */
function printRunsheet() {
  // Expand all items before print
  document.querySelectorAll('.rs-item-body').forEach(b => b.classList.add('open'));
  window.print();
}

/* ===== REFINE ===== */
function refineRunsheet() {
  const input = prompt('How would you like to refine the runsheet?\n\nExamples:\n• "Make the MC scripts more energetic"\n• "Add a VIP welcome segment at the start"\n• "Extend breaks to 20 minutes"\n• "Add Q&A after each session"');
  if (!input) return;
  applyRefinement(input.trim());
}

async function applyRefinement(instruction) {
  if (!currentRunsheet) return;


  setLoading(true);

  const prompt = `You previously generated this event runsheet:
${JSON.stringify(currentRunsheet, null, 2)}

The user wants to refine it with this instruction: "${instruction}"

Apply the refinement and return the COMPLETE updated runsheet in the same JSON format. Only return valid JSON, no markdown or explanation.`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const rs = JSON.parse(clean);
    currentRunsheet = { ...rs, startTime: currentRunsheet.startTime };
    renderRunsheet(rs, currentRunsheet.startTime);
    showToast('Runsheet refined!');
  } catch (e) {
    showToast('Refinement failed. Please try again.');
  }

  setLoading(false);
}

/* ===== HELPERS ===== */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ===== SMOOTH SCROLL FOR NAV ===== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
