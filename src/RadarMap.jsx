import { useEffect, useRef, useState } from 'react';

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
const TILE_SIZE = 256;
const COLOR_SCHEME = 2; // Universal Blue
const SMOOTH = 1;
const SNOW_COLORS = 1;

export default function RadarMap({ lat, lon, theme }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);
  const framesRef = useRef([]);
  const positionRef = useRef(0);
  const playingRef = useRef(false);
  const intervalRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frameTime, setFrameTime] = useState('');
  const [frameIndex, setFrameIndex] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  // Load Leaflet from CDN
  useEffect(() => {
    if (window.L) {
      setLoaded(true);
      return;
    }

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize map + radar
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [lat, lon],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark map tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Small attribution
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('<a href="https://www.rainviewer.com/" target="_blank" style="color:#5eb1bf">RainViewer</a>')
      .addTo(map);

    // Zoom control on the right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Location marker
    L.circleMarker([lat, lon], {
      radius: 6,
      color: '#5eb1bf',
      fillColor: '#5eb1bf',
      fillOpacity: 0.8,
      weight: 2,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Fetch radar frames
    fetch(RAINVIEWER_API)
      .then(res => res.json())
      .then(data => {
        const host = data.host;
        const past = data.radar?.past || [];
        const nowcast = data.radar?.nowcast || [];
        const allFrames = [...past, ...nowcast];

        framesRef.current = allFrames;
        setTotalFrames(allFrames.length);

        // Pre-create all tile layers
        const layers = allFrames.map(frame => {
          return L.tileLayer(
            `${host}${frame.path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${SMOOTH}_${SNOW_COLORS}.webp`,
            {
              tileSize: TILE_SIZE,
              opacity: 0.0,
              zIndex: 300,
            }
          );
        });

        layersRef.current = layers;

        // Add all layers but keep them invisible
        layers.forEach(layer => layer.addTo(map));

        // Show the last past frame
        const startPos = past.length > 0 ? past.length - 1 : 0;
        positionRef.current = startPos;
        showFrame(startPos);
      })
      .catch(err => console.error('Radar fetch failed:', err));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loaded, lat, lon]);

  function showFrame(index) {
    const layers = layersRef.current;
    const frames = framesRef.current;

    if (!layers.length || index < 0 || index >= layers.length) return;

    // Hide all, show current
    layers.forEach((layer, i) => {
      layer.setOpacity(i === index ? 0.65 : 0.0);
    });

    positionRef.current = index;
    setFrameIndex(index);

    // Update timestamp
    const time = frames[index]?.time;
    if (time) {
      const d = new Date(time * 1000);
      const now = new Date();
      const diffMin = Math.round((now - d) / 60000);

      if (diffMin <= 0) {
        const futureMin = Math.abs(diffMin);
        if (futureMin === 0) {
          setFrameTime('Now');
        } else if (futureMin < 60) {
          setFrameTime(`in ${futureMin}m`);
        } else {
          setFrameTime(`in ${Math.floor(futureMin / 60)}h`);
        }
      } else if (diffMin < 60) {
        setFrameTime(`${diffMin}m ago`);
      } else {
        const h = Math.floor(diffMin / 60);
        const m = diffMin % 60;
        setFrameTime(`${h}h ${m}m ago`);
      }
    }
  }

  function togglePlay() {
    if (playingRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      playingRef.current = false;
      setPlaying(false);
    } else {
      playingRef.current = true;
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        const next = (positionRef.current + 1) % framesRef.current.length;
        showFrame(next);
      }, 500);
    }
  }

  function stepForward() {
    if (playingRef.current) togglePlay();
    const next = Math.min(positionRef.current + 1, framesRef.current.length - 1);
    showFrame(next);
  }

  function stepBackward() {
    if (playingRef.current) togglePlay();
    const prev = Math.max(positionRef.current - 1, 0);
    showFrame(prev);
  }

  const btnStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid ${theme?.border || 'rgba(255,255,255,0.12)'}`,
    borderRadius: '6px',
    color: theme?.textPrimary || '#e8e6e3',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={{ margin: '24px 28px 0' }}>
      <div style={{
        fontFamily: theme?.fonts?.mono || "'DM Mono', monospace",
        fontSize: '9px',
        letterSpacing: '2px',
        color: theme?.accent || '#5eb1bf',
        marginBottom: '12px',
      }}>RADAR</div>

      <div style={{
        borderRadius: '14px',
        overflow: 'hidden',
        border: `1px solid rgba(255,255,255,0.05)`,
        position: 'relative',
      }}>
        {/* Map container */}
        <div
          ref={mapRef}
          style={{
            height: '280px',
            width: '100%',
            background: '#1a1a22',
          }}
        />

        {/* Controls overlay */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={stepBackward} style={btnStyle}>◀</button>
            <button onClick={togglePlay} style={{
              ...btnStyle,
              width: '40px',
              background: playing ? 'rgba(94,177,191,0.2)' : 'rgba(255,255,255,0.08)',
              borderColor: playing ? 'rgba(94,177,191,0.3)' : 'rgba(255,255,255,0.12)',
            }}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={stepForward} style={btnStyle}>▶</button>
          </div>

          <div style={{
            fontFamily: theme?.fonts?.mono || "'DM Mono', monospace",
            fontSize: '12px',
            color: theme?.textSecondary || '#999',
          }}>
            {frameTime || '...'}
          </div>

          {/* Timeline bar */}
          {totalFrames > 0 && (
            <div style={{
              width: '80px',
              height: '3px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${((frameIndex + 1) / totalFrames) * 100}%`,
                height: '100%',
                background: theme?.accent || '#5eb1bf',
                borderRadius: '2px',
                transition: 'width 0.2s',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
