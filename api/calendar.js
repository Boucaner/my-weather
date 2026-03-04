// Parses a date string from ICS format
function parseICSDate(str) {
  if (!str) return null;
  str = str.trim();
  if (/^\d{8}$/.test(str)) {
    return new Date(
      parseInt(str.slice(0, 4)),
      parseInt(str.slice(4, 6)) - 1,
      parseInt(str.slice(6, 8))
    );
  }
  const m = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (m) {
    if (m[7] === 'Z') {
      return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]));
    }
    return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]);
  }
  return null;
}

function parseICS(text) {
  const events = [];
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n|\r/);
  let inEvent = false;
  let current = {};

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue; }
    if (line === 'END:VEVENT') {
      inEvent = false;
      if (current.start) events.push(current);
      continue;
    }
    if (!inEvent) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).toUpperCase();
    const val = line.slice(colonIdx + 1).trim();
    const baseProp = key.split(';')[0];
    switch (baseProp) {
      case 'SUMMARY':    current.title    = val.replace(/\\,/g, ',').replace(/\\n/g, ' ').replace(/\\/g, ''); break;
      case 'LOCATION':   current.location = val.replace(/\\,/g, ',').replace(/\\n/g, ' ').replace(/\\/g, ''); break;
      case 'DTSTART':    current.start    = parseICSDate(val); current.allDay = /^\d{8}$/.test(val.trim()); break;
      case 'DTEND':      current.end      = parseICSDate(val); break;
      case 'STATUS':     current.status   = val; break;
    }
  }
  return events;
}

function formatTime(date) {
  if (!date) return null;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });
  if (!url.startsWith('http')) return res.status(400).json({ error: 'Invalid URL' });

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MyWeatherApp/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Calendar fetch failed: ${response.status}` });
    }

    const text = await response.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      return res.status(400).json({ error: 'URL does not appear to be a valid ICS calendar' });
    }

    const allEvents = parseICS(text);

    const nowUTC = new Date();
    const d = nowUTC.getUTCDate();
    const m = nowUTC.getUTCMonth();
    const y = nowUTC.getUTCFullYear();

    const todayStart    = new Date(Date.UTC(y, m, d, 0, 0, 0));
    const todayEnd      = new Date(Date.UTC(y, m, d, 23, 59, 59));
    const tomorrowStart = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
    const tomorrowEnd   = new Date(Date.UTC(y, m, d + 1, 23, 59, 59));

    const filterAndMap = (rangeStart, rangeEnd) => allEvents
      .filter(e => {
        if (!e.start || e.status === 'CANCELLED') return false;
        const s  = e.start instanceof Date ? e.start : new Date(e.start);
        const en = e.end   instanceof Date ? e.end   : e.end ? new Date(e.end) : s;
        return s <= rangeEnd && en >= rangeStart;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 10)
      .map(e => ({
        title:   e.title    || 'Untitled',
        start:   e.allDay ? 'All day' : formatTime(new Date(e.start)),
        end:     e.end && !e.allDay ? formatTime(new Date(e.end)) : null,
        location: e.location || null,
        allDay:  e.allDay || false,
      }));

    return res.status(200).json({
      today:    filterAndMap(todayStart, todayEnd),
      tomorrow: filterAndMap(tomorrowStart, tomorrowEnd),
      total:    allEvents.length,
    });

  } catch (err) {
    console.error('Calendar fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch calendar' });
  }
}
