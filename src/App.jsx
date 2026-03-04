import { useState, useEffect, useRef } from 'react';
import { useWeatherData } from './useWeatherData.js';
import RadarMap from './RadarMap.jsx';
import {
  getWeatherInfo, getWindDirection, calcDewPointFromTempHumidity, getDewPointLevel,
  DEW_POINT_LEVELS, generateShortBrief, generateDailySummary, generateTomorrowSummary
} from './weatherUtils.js';

// --- Centralized Theme ---
const THEME = {
  accent: '#5eb1bf',
  background: '#0a0a0f',
  textPrimary: '#e8e6e3',
  textSecondary: '#999',
  textMuted: '#666',
  textFaint: '#555',
  statLabel: '#888',
  statValue: '#e8e6e3',
  heroTemp: '#f0eeeb',
  feelsLike: '#777',
  briefText: '#ccc',
  tomorrowText: '#888',
  border: 'rgba(255,255,255,0.06)',
  borderSubtle: 'rgba(255,255,255,0.04)',
  cardBg: 'rgba(255,255,255,0.025)',
  modalBg: '#1a1a22',
  fonts: {
    sans: "'DM Sans', 'Helvetica Neue', sans-serif",
    mono: "'DM Mono', monospace",
  },
};

const FONT_SIZES = {
  small:  { label: "S",  scale: 1.0  },
  medium: { label: "M",  scale: 1.2  },
  large:  { label: "L",  scale: 1.45 },
  xl:     { label: "XL", scale: 1.7  },
};

function AlertBanner({ alerts, scale }) {
  const [expanded, setExpanded] = useState(false);
  if (!alerts || alerts.length === 0) return null;

  const severityColor = {
    Extreme: '#d62828',
    Severe: '#e76f51',
    Moderate: '#f4a261',
    Minor: '#e9c46a',
  };

  return (
    <div style={{ margin: '0 28px 16px' }}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          onClick={() => setExpanded(expanded === i ? false : i)}
          style={{
            padding: '14px 18px',
            background: `${severityColor[alert.severity] || '#f4a261'}12`,
            border: `1px solid ${severityColor[alert.severity] || '#f4a261'}33`,
            borderRadius: '10px',
            marginBottom: '8px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: `${13 * scale}px`, fontWeight: 600, color: severityColor[alert.severity] || '#f4a261' }}>
              ⚠️ {alert.event}
            </div>
            <span style={{ fontSize: `${11 * scale}px`, color: THEME.statLabel }}>{expanded === i ? '▲' : '▼'}</span>
          </div>
          {expanded === i && (
            <div style={{ marginTop: '10px' }}>
              {alert.headline && alert.headline !== alert.event && (
                <p style={{ fontSize: `${13 * scale}px`, lineHeight: 1.6, color: '#ccc', margin: '0 0 8px 0', fontWeight: 500 }}>
                  {alert.headline}
                </p>
              )}
              {alert.description && (
                <p style={{ fontSize: `${12 * scale}px`, lineHeight: 1.6, color: '#aaa', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {alert.description}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HourlyCard({ time, temp, precipProb, code, isDay, scale }) {
  const h = new Date(time).getHours();
  const now = new Date().getHours();
  const isNow = h === now;
  const label = isNow ? "Now" : h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`;
  const info = getWeatherInfo(code, isDay);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '6px', minWidth: `${58 * scale}px`, padding: '12px 6px',
      borderRadius: '10px',
      background: isNow ? 'rgba(94,177,191,0.1)' : 'transparent',
      border: isNow ? '1px solid rgba(94,177,191,0.2)' : '1px solid transparent',
    }}>
      <span style={{
        fontSize: `${12 * scale}px`, color: isNow ? THEME.accent : '#8a8a8e',
        fontWeight: isNow ? 600 : 500, fontFamily: THEME.fonts.mono,
      }}>{label}</span>
      <span style={{ fontSize: `${22 * scale}px` }}>{info.icon}</span>
      <span style={{ fontSize: `${15 * scale}px`, fontWeight: 600, color: THEME.textPrimary }}>{Math.round(temp)}°</span>
      {precipProb > 10 && (
        <span style={{
          fontSize: `${11 * scale}px`, color: THEME.accent, fontWeight: 500,
          fontFamily: THEME.fonts.mono,
        }}>{precipProb}%</span>
      )}
    </div>
  );
}

function DayCard({ date, high, low, code, isDay = 1, precipProb, isToday, scale, globalMin, globalMax }) {
  const info = getWeatherInfo(code, isDay);
  const d = new Date(date + 'T12:00:00');
  const dayName = isToday ? "Today" : d.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const range = globalMax - globalMin;
  const lowPct = ((low - globalMin) / range) * 100;
  const highPct = ((high - globalMin) / range) * 100;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '64px 30px 1fr 32px 80px 32px',
      alignItems: 'center', padding: '14px 0',
      borderBottom: `1px solid ${THEME.borderSubtle}`, gap: '8px',
    }}>
      <div>
        <div style={{ fontSize: `${14 * scale}px`, fontWeight: isToday ? 600 : 400, color: isToday ? THEME.textPrimary : '#bbb' }}>
          {dayName}
        </div>
        {!isToday && <div style={{ fontSize: `${11 * scale}px`, color: THEME.textFaint }}>{dateStr}</div>}
      </div>
      <span style={{ fontSize: `${20 * scale}px`, textAlign: 'center' }}>{info.icon}</span>
      {precipProb > 10 ? (
        <span style={{ fontSize: `${12 * scale}px`, color: THEME.accent, fontWeight: 500, fontFamily: THEME.fonts.mono }}>
          {precipProb}%
        </span>
      ) : <span />}
      <span style={{ fontSize: `${14 * scale}px`, color: THEME.textMuted, textAlign: 'right' }}>{Math.round(low)}°</span>
      <div style={{ height: '4px', background: THEME.border, borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: `${lowPct}%`, width: `${highPct - lowPct}%`, height: '100%',
          borderRadius: '2px',
          background: `linear-gradient(90deg, ${THEME.accent}, ${high > 80 ? '#e76f51' : high > 60 ? '#f4a261' : THEME.accent})`,
        }} />
      </div>
      <span style={{ fontSize: `${14 * scale}px`, fontWeight: 600, color: THEME.statValue }}>{Math.round(high)}°</span>
    </div>
  );
}

function DewPointModal({ dewPoint, humidity, tempF, onClose, scale }) {
  const dewLevel = getDewPointLevel(dewPoint);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '20px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: THEME.modalBg, borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        maxWidth: '400px', width: '100%', maxHeight: '85vh',
        overflow: 'auto', padding: '28px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontFamily: THEME.fonts.mono, fontSize: `${9 * scale}px`, letterSpacing: '2px', color: THEME.accent, marginBottom: '6px' }}>
              UNDERSTANDING
            </div>
            <h2 style={{ margin: 0, fontSize: `${22 * scale}px`, fontWeight: 500, color: THEME.textPrimary }}>Dew Point</h2>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', width: '32px', height: '32px', color: THEME.statLabel,
            fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <p style={{ fontSize: `${15 * scale}px`, lineHeight: 1.7, color: '#aaa', margin: '0 0 8px 0' }}>
          Dew point tells you the actual moisture content of the air. Unlike humidity,
          which changes with temperature, dew point gives you a consistent number — the
          higher it is, the more moisture is in the air and the muggier it feels.
        </p>
        <p style={{ fontSize: `${15 * scale}px`, lineHeight: 1.7, color: THEME.tomorrowText, margin: '0 0 20px 0' }}>
          Think of it this way: humidity tells you the percentage of moisture the air <em>could</em> hold.
          Dew point tells you how much moisture is <em>actually there</em>.
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
          padding: '14px 16px', marginBottom: '20px',
          border: `1px solid ${dewLevel.color}22`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: `${12 * scale}px`, color: THEME.textMuted, fontFamily: THEME.fonts.mono, marginBottom: '2px' }}>RIGHT NOW</div>
              <span style={{ fontSize: `${28 * scale}px`, fontWeight: 300, color: THEME.textPrimary }}>{dewPoint}°</span>
              <span style={{ fontSize: `${16 * scale}px`, color: dewLevel.color, marginLeft: '10px', fontWeight: 500 }}>{dewLevel.label}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: `${14 * scale}px`, color: THEME.textMuted }}>
              <div>Humidity: {humidity}%</div>
              <div>Temp: {tempF}°F</div>
            </div>
          </div>
          <p style={{ fontSize: `${14 * scale}px`, lineHeight: 1.6, color: THEME.textSecondary, margin: '10px 0 0' }}>{dewLevel.desc}</p>
        </div>

        <div style={{ fontFamily: THEME.fonts.mono, fontSize: `${10 * scale}px`, letterSpacing: '1.5px', color: THEME.textFaint, marginBottom: '12px' }}>
          DEW POINT COMFORT SCALE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {DEW_POINT_LEVELS.filter(l => l.max < 900).map((level, i) => {
            const prevMax = i === 0 ? 0 : DEW_POINT_LEVELS[i - 1].max;
            const rangeLabel = i === 0 ? `< ${level.max}°` : `${prevMax}–${level.max}°`;
            const isActive = dewPoint <= level.max && (i === 0 || dewPoint > DEW_POINT_LEVELS[i - 1].max);
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '54px 1fr 110px',
                alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '6px',
                background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: isActive ? `1px solid ${level.color}33` : '1px solid transparent',
              }}>
                <span style={{ fontSize: `${13 * scale}px`, color: THEME.statLabel, fontFamily: THEME.fonts.mono }}>{rangeLabel}</span>
                <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((level.max - (prevMax || 0)) / 70) * 100 + 20)}%`,
                    borderRadius: '4px', background: level.color,
                    opacity: isActive ? 1 : 0.35,
                  }} />
                </div>
                <span style={{
                  fontSize: `${13 * scale}px`, color: isActive ? level.color : THEME.textMuted,
                  fontWeight: isActive ? 600 : 400, textAlign: 'right',
                }}>
                  {level.label}{isActive && ' ← now'}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: '20px', padding: '14px 16px',
          background: 'rgba(94,177,191,0.04)', borderRadius: '8px',
          border: '1px solid rgba(94,177,191,0.1)',
        }}>
          <div style={{ fontSize: `${14 * scale}px`, fontWeight: 600, color: THEME.accent, marginBottom: '6px' }}>
            💡 Quick rule of thumb
          </div>
          <p style={{ fontSize: `${14 * scale}px`, lineHeight: 1.6, color: THEME.textSecondary, margin: 0 }}>
            Under 50° = comfortable · 50–60° = noticeable · 60–70° = uncomfortable · Over 70° = dangerous. Limit outdoor activity.
            If the dew point is within a few degrees of the temperature, expect fog or condensation.
          </p>
        </div>
      </div>
    </div>
  );
}

function LocationSheet({ show, onClose, activeLocation, savedLocations, onSelectLocation, onSaveLocation, onDeleteLocation, scale }) {
  const s = scale;
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'User-Agent': 'MyWeatherApp/1.0' } }
        );
        const data = await res.json();
        setSearchResults(data.map(r => ({
          id: r.place_id,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          name: r.address?.city || r.address?.town || r.address?.village || r.address?.county || r.display_name.split(',')[0],
          region: r.address?.state || r.address?.country || '',
          display: r.display_name,
        })));
      } catch { }
      setSearching(false);
    }, 400);
  }, [query]);

  if (!show) return null;

  const isGpsActive = !activeLocation;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: '#16161f', borderRadius: '20px 20px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 201, padding: '0 24px 40px',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 16px', flexShrink: 0 }}>
          <div style={{ fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`, letterSpacing: '2px', color: THEME.accent }}>
            LOCATIONS
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', width: '28px', height: '28px',
            color: THEME.textMuted, fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search city or zip code..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${THEME.border}`, borderRadius: '10px',
              padding: '12px 16px', color: THEME.textPrimary,
              fontSize: `${14 * s}px`, fontFamily: THEME.fonts.sans,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searching && (
            <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: THEME.textFaint, fontSize: '12px' }}>
              ...
            </div>
          )}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`, letterSpacing: '1.5px', color: THEME.textFaint, marginBottom: '8px' }}>
                SEARCH RESULTS
              </div>
              {searchResults.map(r => (
                <div key={r.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: `1px solid ${THEME.borderSubtle}`,
                }}>
                  <div>
                    <div style={{ fontSize: `${14 * s}px`, color: THEME.textPrimary }}>{r.name}</div>
                    <div style={{ fontSize: `${12 * s}px`, color: THEME.textMuted }}>{r.region}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { onSelectLocation({ lat: r.lat, lon: r.lon, name: `${r.name}${r.region ? ', ' + r.region : ''}` }); setQuery(''); setSearchResults([]); onClose(); }} style={{
                      background: 'rgba(94,177,191,0.1)', border: '1px solid rgba(94,177,191,0.25)',
                      borderRadius: '6px', padding: '5px 10px',
                      color: THEME.accent, fontSize: `${11 * s}px`, cursor: 'pointer',
                    }}>Go</button>
                    <button onClick={() => { onSaveLocation({ lat: r.lat, lon: r.lon, name: `${r.name}${r.region ? ', ' + r.region : ''}` }); setQuery(''); setSearchResults([]); }} style={{
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${THEME.border}`,
                      borderRadius: '6px', padding: '5px 10px',
                      color: THEME.textMuted, fontSize: `${11 * s}px`, cursor: 'pointer',
                    }}>+ Save</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saved locations */}
          <div style={{ fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`, letterSpacing: '1.5px', color: THEME.textFaint, marginBottom: '8px' }}>
            SAVED
          </div>

          {/* GPS / Current Location */}
          <div
            onClick={() => { onSelectLocation(null); onClose(); }}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 12px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px',
              background: isGpsActive ? 'rgba(94,177,191,0.08)' : 'transparent',
              border: isGpsActive ? '1px solid rgba(94,177,191,0.2)' : '1px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>📍</span>
              <div>
                <div style={{ fontSize: `${14 * s}px`, color: THEME.textPrimary, fontWeight: isGpsActive ? 600 : 400 }}>Current Location</div>
                <div style={{ fontSize: `${11 * s}px`, color: THEME.textMuted }}>GPS</div>
              </div>
            </div>
            {isGpsActive && <span style={{ fontSize: '16px', color: THEME.accent }}>✓</span>}
          </div>

          {savedLocations.map((loc) => {
            const isActive = activeLocation?.lat === loc.lat && activeLocation?.lon === loc.lon;
            return (
              <div key={`${loc.lat}-${loc.lon}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 12px', borderRadius: '10px', marginBottom: '4px',
                  background: isActive ? 'rgba(94,177,191,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(94,177,191,0.2)' : '1px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
                  onClick={() => { onSelectLocation(loc); onClose(); }}>
                  <span style={{ fontSize: '18px' }}>🏙️</span>
                  <div>
                    <div style={{ fontSize: `${14 * s}px`, color: THEME.textPrimary, fontWeight: isActive ? 600 : 400 }}>{loc.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isActive && <span style={{ fontSize: '16px', color: THEME.accent }}>✓</span>}
                  <button onClick={(e) => { e.stopPropagation(); onDeleteLocation(loc); }} style={{
                    background: 'transparent', border: 'none',
                    color: THEME.textFaint, fontSize: '16px', cursor: 'pointer',
                    padding: '4px 6px', borderRadius: '4px',
                  }}>✕</button>
                </div>
              </div>
            );
          })}

          {savedLocations.length === 0 && (
            <div style={{ fontSize: `${13 * s}px`, color: THEME.textFaint, padding: '8px 12px' }}>
              Search above to save locations.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const ACTIVITY_OPTIONS = [
  { id: 'running',     label: 'Running',          icon: '🏃' },
  { id: 'cycling',     label: 'Cycling',          icon: '🚴' },
  { id: 'commute_car', label: 'Car Commute',       icon: '🚗' },
  { id: 'commute_transit', label: 'Transit',       icon: '🚌' },
  { id: 'kids_sports', label: "Kids' Sports",      icon: '⚽' },
  { id: 'gardening',   label: 'Gardening',         icon: '🌱' },
  { id: 'golf',        label: 'Golf',              icon: '⛳' },
  { id: 'hiking',      label: 'Hiking',            icon: '🥾' },
  { id: 'outdoor_work',label: 'Outdoor Work',      icon: '🔨' },
  { id: 'motorcycling',label: 'Motorcycling',       icon: '🏍️' },
  { id: 'fishing',     label: 'Fishing',           icon: '🎣' },
  { id: 'dog_walks',   label: 'Dog Walks',         icon: '🐕' },
];

function ProfileSheet({ show, onClose, profile, onSave, scale }) {
  const s = scale;
  const [name, setName] = useState(profile.name || '');
  const [activities, setActivities] = useState(profile.activities || []);

  // Sync if profile changes externally
  useEffect(() => {
    setName(profile.name || '');
    setActivities(profile.activities || []);
  }, [profile.name, profile.activities]);

  const toggleActivity = (id) => {
    setActivities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave({ name: name.trim(), activities });
    onClose();
  };

  if (!show) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: '#16161f', borderRadius: '20px 20px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 201, padding: '0 24px 40px',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 20px', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`, letterSpacing: '2px', color: THEME.accent, marginBottom: '4px' }}>
              YOUR PROFILE
            </div>
            <div style={{ fontSize: `${12 * s}px`, color: THEME.textMuted }}>
              Personalizes your AI brief
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', width: '28px', height: '28px',
            color: THEME.textMuted, fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Name */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`,
              letterSpacing: '1.5px', color: THEME.textFaint, marginBottom: '10px',
            }}>FIRST NAME</div>
            <input
              type="text"
              placeholder="What should we call you?"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${THEME.border}`, borderRadius: '10px',
                padding: '12px 16px', color: THEME.textPrimary,
                fontSize: `${14 * s}px`, fontFamily: THEME.fonts.sans,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Activities */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`,
              letterSpacing: '1.5px', color: THEME.textFaint, marginBottom: '6px',
            }}>YOUR ACTIVITIES</div>
            <div style={{ fontSize: `${12 * s}px`, color: THEME.textMuted, marginBottom: '14px' }}>
              Select anything weather affects for you
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
              {ACTIVITY_OPTIONS.map(opt => {
                const active = activities.includes(opt.id);
                return (
                  <button key={opt.id} onClick={() => toggleActivity(opt.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                    background: active ? 'rgba(94,177,191,0.1)' : 'rgba(255,255,255,0.03)',
                    border: active ? '1px solid rgba(94,177,191,0.3)' : `1px solid ${THEME.border}`,
                    color: active ? THEME.accent : THEME.textSecondary,
                    fontSize: `${13 * s}px`, fontFamily: THEME.fonts.sans,
                    textAlign: 'left', transition: 'all 0.15s ease',
                  }}>
                    <span style={{ fontSize: '18px' }}>{opt.icon}</span>
                    <span style={{ fontWeight: active ? 600 : 400 }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* How it's used */}
          <div style={{
            padding: '14px 16px', marginBottom: '20px',
            background: 'rgba(94,177,191,0.04)', borderRadius: '8px',
            border: '1px solid rgba(94,177,191,0.1)',
          }}>
            <div style={{ fontSize: `${12 * s}px`, color: THEME.accent, fontWeight: 600, marginBottom: '4px' }}>
              💡 How this is used
            </div>
            <p style={{ fontSize: `${12 * s}px`, lineHeight: 1.6, color: THEME.textMuted, margin: 0 }}>
              Your name and activities are sent to the AI brief so it can give you relevant, 
              personalized advice — like flagging a bad hair day for a cyclist or reminding a 
              runner that 95°F + 70° dew point is dangerous.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div style={{ flexShrink: 0, paddingTop: '16px' }}>
          <button onClick={handleSave} style={{
            width: '100%', padding: '14px',
            background: 'rgba(94,177,191,0.15)',
            border: '1px solid rgba(94,177,191,0.3)',
            borderRadius: '12px', color: THEME.accent,
            fontSize: `${14 * s}px`, fontWeight: 600,
            cursor: 'pointer', fontFamily: THEME.fonts.sans,
          }}>
            Save Profile
          </button>
        </div>
      </div>
    </>
  );
}

function SettingsSheet({ show, onClose, onOpenLocations, onOpenProfile, profile, fontSize, onFontSize, briefMode, onBriefMode, briefTone, onBriefTone, tempUnit, onTempUnit, locationName, scale }) {
  if (!show) return null;
  const s = scale;

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
  };
  const labelStyle = { fontSize: `${14 * s}px`, color: THEME.textPrimary, fontWeight: 500 };
  const sublabelStyle = { fontSize: `${12 * s}px`, color: THEME.textMuted, marginTop: '2px' };

  function SegmentedControl({ options, value, onChange }) {
    return (
      <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${THEME.border}` }}>
        {options.map(opt => (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{
            background: value === opt.id ? 'rgba(94,177,191,0.18)' : 'transparent',
            border: 'none',
            borderRight: `1px solid ${THEME.border}`,
            color: value === opt.id ? THEME.accent : THEME.textFaint,
            padding: '6px 14px', fontSize: `${11 * s}px`, fontWeight: 500,
            cursor: 'pointer', fontFamily: THEME.fonts.mono, letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
          }}>{opt.label}</button>
        ))}
      </div>
    );
  }

  const dropdownStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${THEME.border}`,
    borderRadius: '8px',
    color: THEME.textPrimary,
    fontSize: `${13 * s}px`,
    padding: '7px 12px',
    fontFamily: THEME.fonts.sans,
    cursor: 'pointer',
    outline: 'none',
    minWidth: '130px',
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: '#16161f', borderRadius: '20px 20px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 201, padding: '0 24px 40px',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 4px' }}>
          <div style={{ fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`, letterSpacing: '2px', color: THEME.accent }}>
            SETTINGS
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', width: '28px', height: '28px',
            color: THEME.textMuted, fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Profile */}
        <div style={{ ...rowStyle, cursor: 'pointer' }} onClick={onOpenProfile}>
          <div>
            <div style={labelStyle}>Your Profile</div>
            <div style={sublabelStyle}>
              {profile?.name
                ? `${profile.name}${profile.activities?.length ? ` · ${profile.activities.length} activit${profile.activities.length === 1 ? 'y' : 'ies'}` : ''}`
                : 'Name & activity preferences'}
            </div>
          </div>
          <span style={{ color: THEME.textFaint, fontSize: '16px' }}>›</span>
        </div>

        {/* Location */}
        <div style={{ ...rowStyle, cursor: 'pointer' }} onClick={onOpenLocations}>
          <div>
            <div style={labelStyle}>Location</div>
            <div style={sublabelStyle}>{locationName}</div>
          </div>
          <span style={{ color: THEME.textFaint, fontSize: '16px' }}>›</span>
        </div>

        {/* Brief tone */}
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Brief Tone</div>
            <div style={sublabelStyle}>Personality of the AI brief</div>
          </div>
          <select style={dropdownStyle} value={briefTone} onChange={e => onBriefTone(e.target.value)}>
            <option value="friendly">Friendly</option>
            <option value="facts">Just the Facts</option>
            <option value="witty">Witty</option>
            <option value="coach">Coach</option>
          </select>
        </div>

        {/* Temperature unit */}
        <div style={rowStyle}>
          <div style={labelStyle}>Temperature</div>
          <SegmentedControl
            options={[{ id: 'F', label: '°F' }, { id: 'C', label: '°C' }]}
            value={tempUnit}
            onChange={onTempUnit}
          />
        </div>

        {/* Brief mode */}
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Daily Brief</div>
            <div style={sublabelStyle}>Default view for briefings</div>
          </div>
          <select style={dropdownStyle} value={briefMode} onChange={e => onBriefMode(e.target.value)}>
            <option value="short">Quick</option>
            <option value="full">Full</option>
            <option value="ai">✨ AI</option>
          </select>
        </div>

        {/* Font size */}
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div style={labelStyle}>Text Size</div>
          <select style={dropdownStyle} value={fontSize} onChange={e => onFontSize(e.target.value)}>
            {Object.entries(FONT_SIZES).map(([id, v]) => (
              <option key={id} value={id}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}



const shimmerStyle = `
  @keyframes shimmer {
    0% { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .view-exit {
    animation: viewExit 0.12s ease forwards;
  }
  .view-enter {
    animation: viewEnter 0.22s ease forwards;
  }
  @keyframes viewExit {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(6px); }
  }
  @keyframes viewEnter {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function SkeletonBox({ w = '100%', h = 16, radius = 6, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '600px 100%',
      animation: 'shimmer 1.6s infinite linear',
      ...style,
    }} />
  );
}

function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh', background: THEME.background,
      fontFamily: THEME.fonts.sans, maxWidth: '480px', margin: '0 auto',
      paddingBottom: '40px', overflow: 'hidden',
    }}>
      <style>{shimmerStyle}</style>
      {/* Header */}
      <div style={{ padding: '48px 28px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <SkeletonBox w={80} h={10} />
            <SkeletonBox w={140} h={14} />
            <SkeletonBox w={90} h={10} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <SkeletonBox w={32} h={32} radius={8} />
            <SkeletonBox w={80} h={10} />
            <SkeletonBox w={60} h={10} />
          </div>
        </div>
        {/* Hero temp */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SkeletonBox w={160} h={80} radius={8} />
            <SkeletonBox w={100} h={14} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <SkeletonBox w={60} h={52} radius={8} />
            <SkeletonBox w={80} h={13} />
          </div>
        </div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '14px', borderTop: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}`, paddingBottom: '14px', marginBottom: '10px' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <SkeletonBox w="70%" h={9} />
              <SkeletonBox w="80%" h={15} />
            </div>
          ))}
        </div>
      </div>
      {/* Brief card */}
      <div style={{ margin: '24px 28px 0', padding: '20px 22px', background: THEME.cardBg, borderRadius: '14px', border: `1px solid rgba(255,255,255,0.05)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
          <SkeletonBox w={100} h={10} />
          <SkeletonBox w={120} h={24} radius={6} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SkeletonBox w="100%" h={13} />
          <SkeletonBox w="92%" h={13} />
          <SkeletonBox w="80%" h={13} />
        </div>
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${THEME.borderSubtle}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SkeletonBox w={80} h={9} />
          <SkeletonBox w="85%" h={13} />
        </div>
      </div>
      {/* Forecast toggle */}
      <div style={{ margin: '24px 28px 0' }}>
        <SkeletonBox w="100%" h={42} radius={10} />
      </div>
      {/* Hourly cards */}
      <div style={{ display: 'flex', gap: '8px', padding: '16px 28px', overflow: 'hidden' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '58px' }}>
            <SkeletonBox w={40} h={10} />
            <SkeletonBox w={36} h={28} radius={6} />
            <SkeletonBox w={36} h={15} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [activeLocation, setActiveLocationState] = useState(() => {
    try { const a = localStorage.getItem('mw-activeLocation'); return a ? JSON.parse(a) : null; } catch { return null; }
  });
  const [savedLocations, setSavedLocationsState] = useState(() => {
    try { const s = localStorage.getItem('mw-savedLocations'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [profile, setProfileState] = useState(() => {
    try { const p = localStorage.getItem('mw-profile'); return p ? JSON.parse(p) : { name: '', activities: [] }; } catch { return { name: '', activities: [] }; }
  });
  const [showProfile, setShowProfile] = useState(false);

  const updateActiveLocation = (loc) => {
    setActiveLocationState(loc);
    if (loc) localStorage.setItem('mw-activeLocation', JSON.stringify(loc));
    else localStorage.removeItem('mw-activeLocation');
  };
  const updateSavedLocations = (locs) => {
    setSavedLocationsState(locs);
    localStorage.setItem('mw-savedLocations', JSON.stringify(locs));
  };

  const { weather, alerts, locationName, loading, error, refresh, lastFetched } = useWeatherData(activeLocation);
  const [activeView, setActiveView] = useState('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const PULL_THRESHOLD = 70;

  // Staleness indicator
  const [now2, setNow2] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow2(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const getStaleLabel = () => {
    if (!lastFetched) return null;
    const mins = Math.floor((now2 - lastFetched) / 60000);
    if (mins < 1) return { text: 'Just updated', color: THEME.textFaint };
    if (mins < 15) return { text: `Updated ${mins}m ago`, color: THEME.textFaint };
    if (mins < 30) return { text: `Updated ${mins}m ago`, color: '#f4a261' };
    return { text: `Updated ${mins}m ago — pull to refresh`, color: '#e76f51' };
  };

  // View transition key
  const [viewTransitionClass, setViewTransitionClass] = useState('');
  const switchView = (id) => {
    setViewTransitionClass('view-exit');
    setTimeout(() => {
      setActiveView(id);
      setViewTransitionClass('view-enter');
      setTimeout(() => setViewTransitionClass(''), 220);
    }, 120);
  };

  const triggerRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) pullStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    if (pullStartY.current === 0) return;
    const dist = Math.max(0, Math.min(e.touches[0].clientY - pullStartY.current, 100));
    if (dist > 0 && window.scrollY === 0) setPullDistance(dist);
  };
  const handleTouchEnd = () => {
    if (pullDistance >= PULL_THRESHOLD) triggerRefresh();
    setPullDistance(0);
    pullStartY.current = 0;
  };
  const [fontSize, setFontSizeState] = useState(() => localStorage.getItem('mw-fontSize') || 'medium');
  const [showDewInfo, setShowDewInfo] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [briefMode, setBriefModeState] = useState(() => localStorage.getItem('mw-briefMode') || 'short');
  const [tempUnit, setTempUnitState] = useState(() => localStorage.getItem('mw-tempUnit') || 'F');
  const s = FONT_SIZES[fontSize].scale;

  const updateTempUnit = (unit) => { setTempUnitState(unit); localStorage.setItem('mw-tempUnit', unit); };

  const toDisplay = (f) => {
    if (tempUnit === 'C') return Math.round((f - 32) * 5 / 9) + '°C';
    return f + '°F';
  };
  const toDisplayShort = (f) => {
    if (tempUnit === 'C') return Math.round((f - 32) * 5 / 9) + '°';
    return f + '°';
  };

  const updateFontSize = (size) => { setFontSizeState(size); localStorage.setItem('mw-fontSize', size); };
  const updateBriefMode = (mode) => { setBriefModeState(mode); localStorage.setItem('mw-briefMode', mode); };
  const [briefTone, setBriefToneState] = useState(() => localStorage.getItem('mw-briefTone') || 'friendly');
  const updateBriefTone = (tone) => {
    setBriefToneState(tone);
    localStorage.setItem('mw-briefTone', tone);
    aiBriefFetchedAt.current = null;
    setAiBriefInitialFetched(false);
    if (briefMode === 'ai') {
      setAiBrief(null);
      setAiBriefTomorrow(null);
    }
  };

  // AI Brief
  const [aiBrief, setAiBrief] = useState(null);
  const [aiBriefTomorrow, setAiBriefTomorrow] = useState(null);
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [aiBriefError, setAiBriefError] = useState(null);
  const [aiBriefInitialFetched, setAiBriefInitialFetched] = useState(false);
  const aiBriefFetchedAt = useRef(null);
  const AI_BRIEF_TTL = 5 * 60 * 1000; // 5 minutes
  const now = new Date();

  const updateProfile = (p) => {
    setProfileState(p);
    localStorage.setItem('mw-profile', JSON.stringify(p));
    // Invalidate AI brief so it regenerates with new profile
    aiBriefFetchedAt.current = null;
    setAiBriefInitialFetched(false);
    setAiBrief(null);
    setAiBriefTomorrow(null);
  };

  // Auto-fetch AI brief if mode is 'ai' on initial load
  useEffect(() => {
    if (briefMode !== 'ai' || aiBriefInitialFetched || aiBriefLoading || !weather) return;
    // Skip if we already have a fresh brief
    if (aiBrief && aiBriefFetchedAt.current && (Date.now() - aiBriefFetchedAt.current < AI_BRIEF_TTL)) {
      setAiBriefInitialFetched(true);
      return;
    }
    setAiBriefInitialFetched(true);
    setAiBriefLoading(true);
    setAiBriefError(null);

    const { current, hourly, daily } = weather;
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const sunriseStr = daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    const sunsetStr = daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    const dp = current.dew_point_2m != null ? Math.round(current.dew_point_2m) : 0;
    const n = new Date();
    const upcomingPrecip = hourly.time
      .map((t, i) => ({ time: new Date(t), prob: hourly.precipitation_probability[i] }))
      .filter(h => h.time > n && h.time < new Date(n.getTime() + 6 * 60 * 60 * 1000))
      .map(h => `${h.time.getHours() % 12 || 12}${h.time.getHours() >= 12 ? 'pm' : 'am'}: ${h.prob}%`)
      .join(', ');

    fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current: {
          temp: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          conditions: getWeatherInfo(current.weather_code, current.is_day).label,
          windDir: getWindDirection(current.wind_direction_10m),
          windSpeed: Math.round(current.wind_speed_10m),
          gustSpeed: Math.round(current.wind_gusts_10m),
          humidity: current.relative_humidity_2m,
          dewPoint: dp,
          cloudCover: current.cloud_cover,
          uvMax: Math.round(daily.uv_index_max[0]),
          hour: hour,
        },
        hourly: { precipProbs: upcomingPrecip },
        daily: {
          todayHigh: Math.round(daily.temperature_2m_max[0]),
          todayLow: Math.round(daily.temperature_2m_min[0]),
          todayPrecipChance: daily.precipitation_probability_max[0],
          tomorrowConditions: daily.weather_code[1] != null ? getWeatherInfo(daily.weather_code[1], 1).label : 'Unknown',
          tomorrowHigh: daily.temperature_2m_max[1] != null ? Math.round(daily.temperature_2m_max[1]) : '?',
          tomorrowLow: daily.temperature_2m_min[1] != null ? Math.round(daily.temperature_2m_min[1]) : '?',
          tomorrowPrecipChance: daily.precipitation_probability_max[1] || 0,
          sunrise: sunriseStr,
          sunset: sunsetStr,
        },
        locationName,
        timeOfDay,
        tone: briefTone,
        profile,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAiBrief(data.brief);
        if (data.tomorrow) setAiBriefTomorrow(data.tomorrow);
        aiBriefFetchedAt.current = Date.now();
        setAiBriefLoading(false);
      })
      .catch(err => {
        console.error('AI brief error:', err);
        setAiBriefError('Couldn\'t generate AI brief. Using template.');
        setBriefModeState('full');
        localStorage.setItem('mw-briefMode', 'full');
        setAiBriefLoading(false);
      });
  }, [briefMode, weather, aiBriefInitialFetched]);

  // Loading
  if (loading && !weather) {
    return <LoadingSkeleton />;
  }

  // Error
  if (error || !weather) {
    return (
      <div style={{
        minHeight: '100vh', background: THEME.background,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: THEME.fonts.sans, color: '#e07a5f',
        padding: '32px', textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>😔</div>
          <div style={{ fontSize: '15px', marginBottom: '20px' }}>{error || 'Something went wrong.'}</div>
          <button onClick={() => window.location.reload()} style={{
            background: 'rgba(94,177,191,0.15)', border: '1px solid rgba(94,177,191,0.3)',
            borderRadius: '8px', padding: '10px 24px', color: THEME.accent,
            fontSize: '14px', cursor: 'pointer',
          }}>Try Again</button>
        </div>
      </div>
    );
  }

  const { current, hourly, daily } = weather;
  const currentInfo = getWeatherInfo(current.weather_code, current.is_day);
  const tempF = Math.round(current.temperature_2m);
  const feelsLike = Math.round(current.apparent_temperature);
  const humidity = current.relative_humidity_2m;
  const dewPoint = current.dew_point_2m != null
    ? Math.round(current.dew_point_2m)
    : calcDewPointFromTempHumidity(tempF, humidity);
  const dewLevel = getDewPointLevel(dewPoint);
  const windMph = Math.round(current.wind_speed_10m);
  const windDir = getWindDirection(current.wind_direction_10m);
  const highF = Math.round(daily.temperature_2m_max[0]);
  const lowF = Math.round(daily.temperature_2m_min[0]);
  const uvMax = Math.round(daily.uv_index_max[0]);
  const gustMph = Math.round(current.wind_gusts_10m);
  const cloudCover = current.cloud_cover;
  const pressure = current.surface_pressure ? Math.round(current.surface_pressure) : null; // hPa = mb
  const precip = current.precipitation;
  const sunrise = daily.sunrise?.[0];
  const sunset = daily.sunset?.[0];
  const sunriseTime = sunrise ? new Date(sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
  const sunsetTime = sunset ? new Date(sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;

  // Next 24 hours
  const hourlySlice = hourly.time
    .map((t, i) => ({
      time: t, temp: hourly.temperature_2m[i],
      precip: hourly.precipitation_probability[i],
      code: hourly.weather_code[i], isDay: hourly.is_day[i],
    }))
    .filter(h => new Date(h.time) >= new Date(now.getTime() - 30 * 60 * 1000))
    .slice(0, 24);

  // 10-day min/max for bar scaling
  const allHighs = daily.temperature_2m_max.map(Math.round);
  const allLows = daily.temperature_2m_min.map(Math.round);
  const globalMin = Math.min(...allLows) - 3;
  const globalMax = Math.max(...allHighs) + 3;

  const summary = generateDailySummary(current, hourly, daily);
  const shortBrief = generateShortBrief(current, hourly, daily);
  const tomorrowSummary = generateTomorrowSummary(daily);

  const fetchAiBrief = async () => {
    if (aiBriefLoading) return;
    // Skip if existing brief is still fresh
    if (aiBrief && aiBriefFetchedAt.current && (Date.now() - aiBriefFetchedAt.current < AI_BRIEF_TTL)) return;
    setAiBrief(null);
    setAiBriefTomorrow(null);
    setAiBriefLoading(true);
    setAiBriefError(null);
    try {
      const hour = now.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const sunriseStr = daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
      const sunsetStr = daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

      // Next 6 hours precip probs
      const upcomingPrecip = hourly.time
        .map((t, i) => ({ time: new Date(t), prob: hourly.precipitation_probability[i] }))
        .filter(h => h.time > now && h.time < new Date(now.getTime() + 6 * 60 * 60 * 1000))
        .map(h => `${h.time.getHours() % 12 || 12}${h.time.getHours() >= 12 ? 'pm' : 'am'}: ${h.prob}%`)
        .join(', ');

      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: {
            temp: Math.round(current.temperature_2m),
            feelsLike: Math.round(current.apparent_temperature),
            conditions: getWeatherInfo(current.weather_code, current.is_day).label,
            windDir: getWindDirection(current.wind_direction_10m),
            windSpeed: Math.round(current.wind_speed_10m),
            gustSpeed: Math.round(current.wind_gusts_10m),
            humidity: current.relative_humidity_2m,
            dewPoint: dewPoint,
            cloudCover: current.cloud_cover,
            uvMax: uvMax,
            hour: hour,
          },
          hourly: { precipProbs: upcomingPrecip },
          daily: {
            todayHigh: Math.round(daily.temperature_2m_max[0]),
            todayLow: Math.round(daily.temperature_2m_min[0]),
            todayPrecipChance: daily.precipitation_probability_max[0],
            tomorrowConditions: daily.weather_code[1] != null ? getWeatherInfo(daily.weather_code[1], 1).label : 'Unknown',
            tomorrowHigh: daily.temperature_2m_max[1] != null ? Math.round(daily.temperature_2m_max[1]) : '?',
            tomorrowLow: daily.temperature_2m_min[1] != null ? Math.round(daily.temperature_2m_min[1]) : '?',
            tomorrowPrecipChance: daily.precipitation_probability_max[1] || 0,
            sunrise: sunriseStr,
            sunset: sunsetStr,
          },
          locationName,
          timeOfDay,
          tone: briefTone,
          profile,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiBrief(data.brief);
      if (data.tomorrow) setAiBriefTomorrow(data.tomorrow);
      aiBriefFetchedAt.current = Date.now();
    } catch (err) {
      console.error('AI brief error:', err);
      setAiBriefError('Couldn\'t generate AI brief. Using template.');
      updateBriefMode('full');
    } finally {
      setAiBriefLoading(false);
    }
  };

  // Background
  const isDay = current.is_day;
  const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(current.weather_code);
  const isCloudy = [2, 3, 45, 48].includes(current.weather_code);
  const isSnowy = [71, 73, 75, 77, 85, 86].includes(current.weather_code);

  let bgGradient = 'linear-gradient(180deg, #0a1628 0%, #0a0a0f 40%)';
  if (isSnowy) bgGradient = 'linear-gradient(180deg, #2a3040 0%, #14161e 40%)';
  else if (isDay && !isRainy && !isCloudy) bgGradient = 'linear-gradient(180deg, #1a3a5c 0%, #0f1923 40%)';
  else if (isDay && isCloudy) bgGradient = 'linear-gradient(180deg, #2a2d35 0%, #0f1014 40%)';
  else if (isRainy) bgGradient = 'linear-gradient(180deg, #1a1e2a 0%, #0a0b10 40%)';

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: '100vh', background: bgGradient, color: THEME.textPrimary,
        fontFamily: THEME.fonts.sans,
        maxWidth: '480px', margin: '0 auto', position: 'relative', overflow: 'hidden',
        paddingBottom: '40px',
      }}>
      <style>{shimmerStyle}</style>

      {/* Pull-to-refresh indicator */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        height: `${Math.min(pullDistance * 0.6, 52)}px`,
        overflow: 'hidden', pointerEvents: 'none',
        transition: pullDistance === 0 ? 'height 0.3s ease' : 'none',
      }}>
        {(pullDistance > 10 || isRefreshing) && (
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(94,177,191,0.12)', border: '1px solid rgba(94,177,191,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '8px',
            animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            opacity: isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
          }}>
            <span style={{ fontSize: '14px', display: 'block', color: THEME.accent }}>↻</span>
          </div>
        )}
      </div>

      {/* Atmospheric glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '350px',
        background: isSnowy
          ? 'radial-gradient(ellipse at 25% -10%, rgba(170,190,210,0.08) 0%, transparent 60%)'
          : 'radial-gradient(ellipse at 30% -10%, rgba(245,200,100,0.06) 0%, transparent 55%), radial-gradient(ellipse at 70% 5%, rgba(94,177,191,0.04) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '48px 28px 0', position: 'relative', animation: 'fadeInUp 0.4s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontFamily: THEME.fonts.mono, fontSize: '10px',
              letterSpacing: '2.5px', color: THEME.accent, textTransform: 'uppercase', marginBottom: '6px',
            }}>My Weather</div>
            <div style={{ fontSize: `${15 * s}px`, color: THEME.textSecondary, fontWeight: 400, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onClick={() => setShowLocationSheet(true)}>
              {locationName}
              <span style={{ fontSize: `${10 * s}px`, color: THEME.textFaint }}>▾</span>
            </div>
            {(() => { const stale = getStaleLabel(); return stale ? (
              <div style={{ fontSize: `${11 * s}px`, color: stale.color, fontFamily: THEME.fonts.mono, marginTop: '4px', transition: 'color 1s ease' }}>
                {stale.text}
              </div>
            ) : null; })()}
          </div>
          <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button onClick={triggerRefresh} style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`,
              borderRadius: '8px', width: '32px', height: '32px',
              color: THEME.textFaint, fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            }}>↻</button>
            <button onClick={() => setShowSettings(true)} style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`,
              borderRadius: '8px', width: '32px', height: '32px',
              color: THEME.textFaint, fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>⚙️</button>
          </div>
            <div style={{ fontSize: `${12 * s}px`, color: THEME.textFaint, fontFamily: THEME.fonts.mono }}>
              {now.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div style={{ fontSize: `${12 * s}px`, color: THEME.textFaint, fontFamily: THEME.fonts.mono }}>
              {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Hero temp */}
        <div style={{ marginTop: '36px', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          <div>
            <div style={{
              fontSize: `${88 * s}px`, fontWeight: 200, lineHeight: 0.85,
              letterSpacing: '-5px', color: THEME.heroTemp,
            }}>{toDisplayShort(tempF)}</div>
            <div style={{ fontSize: `${14 * s}px`, color: THEME.feelsLike, marginTop: '10px', fontWeight: 400 }}>
              Feels like {toDisplayShort(feelsLike)}
            </div>
          </div>
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: `${44 * s}px`, lineHeight: 1 }}>{currentInfo.icon}</div>
            <div style={{ fontSize: `${13 * s}px`, color: THEME.textSecondary, marginTop: '6px', maxWidth: '100px' }}>
              {currentInfo.label}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', marginTop: '28px', padding: '14px 0',
          borderTop: `1px solid ${THEME.border}`,
          borderBottom: `1px solid ${THEME.border}`,
        }}>
          {[
            { label: 'Hi', value: `${toDisplayShort(highF)}` },
            { label: 'Lo', value: `${toDisplayShort(lowF)}` },
            { label: 'Wind', value: `${windDir} ${windMph}` },
            { label: 'UV', value: `${uvMax}` },
          ].map((stat) => (
            <div key={stat.label} style={{ flex: 1, textAlign: 'center', borderRight: `1px solid ${THEME.borderSubtle}` }}>
              <div style={{
                fontSize: `${9 * s}px`, color: THEME.statLabel, marginBottom: '4px',
                fontFamily: THEME.fonts.mono, letterSpacing: '1px',
              }}>{stat.label}</div>
              <div style={{ fontSize: `${15 * s}px`, fontWeight: 600, color: THEME.statValue }}>{stat.value}</div>
            </div>
          ))}
          {/* Humidity */}
          <div style={{ flex: 1, textAlign: 'center', borderRight: `1px solid ${THEME.borderSubtle}` }}>
            <div style={{
              fontSize: `${9 * s}px`, color: THEME.statLabel, marginBottom: '4px',
              fontFamily: THEME.fonts.mono, letterSpacing: '1px',
            }}>HUMID</div>
            <div style={{ fontSize: `${15 * s}px`, fontWeight: 600, color: THEME.statValue }}>{humidity}%</div>
          </div>
          {/* Dew Point */}
          <div style={{ flex: 1.2, textAlign: 'center' }}>
            <div style={{
              fontSize: `${9 * s}px`, color: THEME.statLabel, marginBottom: '4px',
              fontFamily: THEME.fonts.mono, letterSpacing: '1px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              position: 'relative',
            }}>
              DEW PT
              <button onClick={() => setShowDewInfo(true)} style={{
                background: 'rgba(94,177,191,0.15)', border: '1px solid rgba(94,177,191,0.25)',
                borderRadius: '50%', width: '14px', height: '14px',
                color: THEME.accent, fontSize: '8px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                position: 'absolute', right: '-2px', top: '-2px',
              }}>?</button>
            </div>
            <div style={{ fontSize: `${15 * s}px`, fontWeight: 600, color: THEME.statValue }}>{dewPoint}°</div>
            <div style={{ fontSize: `${11 * s}px`, color: dewLevel.color, fontWeight: 500, marginTop: '2px' }}>
              {dewLevel.label}
            </div>
          </div>
        </div>

        {/* More Details Toggle */}
        <div
          onClick={() => setShowDetails(!showDetails)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '10px 0 2px', cursor: 'pointer',
          }}
        >
          <span style={{
            fontSize: `${11 * s}px`, color: THEME.textFaint,
            fontFamily: THEME.fonts.mono, letterSpacing: '1px',
          }}>
            {showDetails ? 'LESS' : 'MORE DETAILS'}
          </span>
          <span style={{
            fontSize: `${10 * s}px`, color: THEME.textFaint,
            transition: 'transform 0.2s',
            transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}>▼</span>
        </div>

        {/* Details Panel */}
        {showDetails && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '10px', padding: '14px 0 4px',
            borderBottom: `1px solid ${THEME.border}`,
          }}>
            {sunriseTime && (
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                padding: '12px 14px', border: `1px solid ${THEME.borderSubtle}`,
              }}>
                <div style={{
                  fontSize: `${9 * s}px`, color: THEME.statLabel,
                  fontFamily: THEME.fonts.mono, letterSpacing: '1px', marginBottom: '6px',
                }}>SUNRISE</div>
                <div style={{ fontSize: `${16 * s}px`, fontWeight: 500, color: THEME.statValue }}>
                  🌅 {sunriseTime}
                </div>
              </div>
            )}
            {sunsetTime && (
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                padding: '12px 14px', border: `1px solid ${THEME.borderSubtle}`,
              }}>
                <div style={{
                  fontSize: `${9 * s}px`, color: THEME.statLabel,
                  fontFamily: THEME.fonts.mono, letterSpacing: '1px', marginBottom: '6px',
                }}>SUNSET</div>
                <div style={{ fontSize: `${16 * s}px`, fontWeight: 500, color: THEME.statValue }}>
                  🌇 {sunsetTime}
                </div>
              </div>
            )}
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
              padding: '12px 14px', border: `1px solid ${THEME.borderSubtle}`,
            }}>
              <div style={{
                fontSize: `${9 * s}px`, color: THEME.statLabel,
                fontFamily: THEME.fonts.mono, letterSpacing: '1px', marginBottom: '6px',
              }}>GUSTS</div>
              <div style={{ fontSize: `${16 * s}px`, fontWeight: 500, color: THEME.statValue }}>
                💨 {gustMph} mph
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
              padding: '12px 14px', border: `1px solid ${THEME.borderSubtle}`,
            }}>
              <div style={{
                fontSize: `${9 * s}px`, color: THEME.statLabel,
                fontFamily: THEME.fonts.mono, letterSpacing: '1px', marginBottom: '6px',
              }}>CLOUD COVER</div>
              <div style={{ fontSize: `${16 * s}px`, fontWeight: 500, color: THEME.statValue }}>
                ☁️ {cloudCover != null ? `${cloudCover}%` : '—'}
              </div>
            </div>
            {pressure && (
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                padding: '12px 14px', border: `1px solid ${THEME.borderSubtle}`,
              }}>
                <div style={{
                  fontSize: `${9 * s}px`, color: THEME.statLabel,
                  fontFamily: THEME.fonts.mono, letterSpacing: '1px', marginBottom: '6px',
                }}>PRESSURE</div>
                <div style={{ fontSize: `${16 * s}px`, fontWeight: 500, color: THEME.statValue }}>
                  {pressure} mb
                </div>
              </div>
            )}
            {precip != null && precip > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                padding: '12px 14px', border: `1px solid ${THEME.borderSubtle}`,
              }}>
                <div style={{
                  fontSize: `${9 * s}px`, color: THEME.statLabel,
                  fontFamily: THEME.fonts.mono, letterSpacing: '1px', marginBottom: '6px',
                }}>PRECIP NOW</div>
                <div style={{ fontSize: `${16 * s}px`, fontWeight: 500, color: THEME.statValue }}>
                  🌧️ {precip} in
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      <AlertBanner alerts={alerts} scale={s} />

      {/* Daily Brief */}
      <div style={{
        margin: '24px 28px 0', padding: '20px 22px',
        background: THEME.cardBg, borderRadius: '14px',
        border: `1px solid rgba(255,255,255,0.05)`,
        animation: 'fadeInUp 0.4s 0.1s ease both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`,
            letterSpacing: '2px', color: THEME.accent,
          }}>YOUR DAILY BRIEF</div>
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${THEME.border}` }}>
            {[
              { id: 'short', label: 'Quick' },
              { id: 'full', label: 'Full' },
              { id: 'ai', label: '✨ AI' },
            ].map(opt => (
              <button key={opt.id} onClick={() => {
                updateBriefMode(opt.id);
                if (opt.id === 'ai') fetchAiBrief();
              }} style={{
                background: briefMode === opt.id ? 'rgba(94,177,191,0.15)' : 'transparent',
                border: 'none', color: briefMode === opt.id ? THEME.accent : THEME.textFaint,
                padding: '4px 12px', fontSize: `${10 * s}px`, fontWeight: 500, cursor: 'pointer',
                fontFamily: THEME.fonts.mono, letterSpacing: '0.5px',
              }}>{opt.label}</button>
            ))}
          </div>
        </div>
        {briefMode === 'short' ? (
          <p style={{ fontSize: `${14.5 * s}px`, lineHeight: 1.75, color: THEME.briefText, margin: 0 }}>{shortBrief}</p>
        ) : briefMode === 'ai' ? (
          <div>
            {aiBriefLoading && (
              <p style={{ fontSize: `${14.5 * s}px`, lineHeight: 1.75, color: THEME.textFaint, margin: 0, fontStyle: 'italic' }}>
                Generating your personal brief...
              </p>
            )}
            {aiBriefError && (
              <p style={{ fontSize: `${13 * s}px`, lineHeight: 1.75, color: '#e76f51', margin: 0 }}>{aiBriefError}</p>
            )}
            {aiBrief && !aiBriefLoading && (
              <p style={{ fontSize: `${14.5 * s}px`, lineHeight: 1.75, color: THEME.briefText, margin: 0 }}>{aiBrief}</p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: `${14.5 * s}px`, lineHeight: 1.75, color: THEME.briefText, margin: 0 }}>{summary}</p>
        )}
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${THEME.borderSubtle}` }}>
          <div style={{
            fontFamily: THEME.fonts.mono, fontSize: `${9 * s}px`,
            letterSpacing: '2px', color: THEME.textFaint, marginBottom: '6px',
          }}>TOMORROW</div>
          <p style={{ fontSize: `${13 * s}px`, lineHeight: 1.6, color: THEME.tomorrowText, margin: 0 }}>
            {(briefMode === 'ai' && aiBriefTomorrow ? aiBriefTomorrow : tomorrowSummary).replace(/^Tomorrow:\s*/i, '')}
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div style={{
        display: 'flex', margin: '24px 28px 0', borderRadius: '10px',
        overflow: 'hidden', border: `1px solid ${THEME.border}`,
        animation: 'fadeInUp 0.4s 0.2s ease both',
      }}>
        {[
          { id: 'today', label: 'Hourly' },
          { id: 'week', label: '10-Day' },
        ].map(tab => (
          <button key={tab.id} onClick={() => switchView(tab.id)} style={{
            flex: 1, background: activeView === tab.id ? 'rgba(255,255,255,0.06)' : 'transparent',
            border: 'none', color: activeView === tab.id ? THEME.textPrimary : THEME.textFaint,
            padding: '11px 16px', fontSize: `${13 * s}px`, fontWeight: 500, cursor: 'pointer',
            fontFamily: THEME.fonts.sans,
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Hourly */}
      {activeView === 'today' && (
        <div className={viewTransitionClass} style={{
          display: 'flex', overflowX: 'auto', gap: '2px',
          padding: '16px 28px 24px', scrollbarWidth: 'none',
        }}>
          {hourlySlice.map((h, i) => (
            <HourlyCard key={i} time={h.time} temp={h.temp}
              precipProb={h.precip} code={h.code} isDay={h.isDay} scale={s} />
          ))}
        </div>
      )}

      {/* 10-Day */}
      {activeView === 'week' && (
        <div className={viewTransitionClass} style={{ padding: '12px 28px 24px' }}>
          {daily.time.map((date, i) => (
            <DayCard key={date} date={date} high={daily.temperature_2m_max[i]}
              low={daily.temperature_2m_min[i]}
              code={i === 0 ? current.weather_code : daily.weather_code[i]}
              isDay={i === 0 ? current.is_day : 1}
              precipProb={daily.precipitation_probability_max[i]}
              isToday={i === 0} scale={s} globalMin={globalMin} globalMax={globalMax} />
          ))}
        </div>
      )}

      {/* Radar */}
      <RadarMap lat={weather.latitude} lon={weather.longitude} theme={THEME} />

      {/* Personalization teaser */}
      <div style={{
        margin: '4px 28px 20px', padding: '18px 22px',
        background: 'rgba(94,177,191,0.03)', borderRadius: '12px',
        border: '1px dashed rgba(94,177,191,0.12)', textAlign: 'center',
      }}>
        <div style={{ fontSize: `${13 * s}px`, color: THEME.accent, marginBottom: '6px', fontWeight: 500 }}>
          ✨ Personalization coming soon
        </div>
        <div style={{ fontSize: `${12 * s}px`, color: THEME.textMuted, lineHeight: 1.6 }}>
          Connect your calendar and let My Weather learn your routine.
          Your brief will know about your commute, your kids' games, and your weekend plans.
        </div>
      </div>

      {/* Location Sheet */}
      <LocationSheet
        show={showLocationSheet}
        onClose={() => setShowLocationSheet(false)}
        activeLocation={activeLocation}
        savedLocations={savedLocations}
        onSelectLocation={updateActiveLocation}
        onSaveLocation={(loc) => {
          if (!savedLocations.find(l => l.lat === loc.lat && l.lon === loc.lon)) {
            updateSavedLocations([...savedLocations, loc]);
          }
        }}
        onDeleteLocation={(loc) => updateSavedLocations(savedLocations.filter(l => !(l.lat === loc.lat && l.lon === loc.lon)))}
        scale={s}
      />

      {/* Settings Sheet */}
      <SettingsSheet
        show={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenLocations={() => { setShowSettings(false); setShowLocationSheet(true); }}
        onOpenProfile={() => { setShowSettings(false); setShowProfile(true); }}
        profile={profile}
        fontSize={fontSize}
        onFontSize={updateFontSize}
        briefMode={briefMode}
        onBriefMode={(mode) => { updateBriefMode(mode); if (mode === 'ai') fetchAiBrief(); }}
        briefTone={briefTone}
        onBriefTone={updateBriefTone}
        tempUnit={tempUnit}
        onTempUnit={updateTempUnit}
        locationName={locationName}
        scale={s}
      />

      {/* Profile Sheet */}
      <ProfileSheet
        show={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        onSave={updateProfile}
        scale={s}
      />

      {/* Dew Point Modal */}
      {showDewInfo && (
        <DewPointModal dewPoint={dewPoint} humidity={humidity}
          tempF={tempF} onClose={() => setShowDewInfo(false)} scale={s} />
      )}
    </div>
  );
}
