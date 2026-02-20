import { useState, useEffect } from 'react';

// Default: Goochland, VA
const DEFAULT_LAT = 37.68;
const DEFAULT_LON = -77.90;
const DEFAULT_NAME = "Goochland, Virginia";

export function useWeatherData() {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [locationName, setLocationName] = useState("Locating...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll(lat, lon) {
      try {
        // Reverse geocode
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
          { headers: { 'User-Agent': 'MyWeatherApp/1.0' } }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const city = geoData.address?.city || geoData.address?.town ||
            geoData.address?.village || geoData.address?.county || "Your Location";
          const state = geoData.address?.state || "";
          if (!cancelled) setLocationName(state ? `${city}, ${state}` : city);
        }
      } catch {
        if (!cancelled) setLocationName(DEFAULT_NAME);
      }

      try {
        // Open-Meteo weather
        const params = new URLSearchParams({
          latitude: lat,
          longitude: lon,
          current: [
            'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
            'is_day', 'weather_code', 'wind_speed_10m', 'wind_direction_10m',
            'wind_gusts_10m', 'dew_point_2m', 'surface_pressure',
            'cloud_cover', 'precipitation'
          ].join(','),
          hourly: [
            'temperature_2m', 'precipitation_probability', 'weather_code',
            'is_day', 'dew_point_2m'
          ].join(','),
          daily: [
            'weather_code', 'temperature_2m_max', 'temperature_2m_min',
            'precipitation_probability_max', 'uv_index_max', 'sunrise', 'sunset'
          ].join(','),
          temperature_unit: 'fahrenheit',
          wind_speed_unit: 'mph',
          precipitation_unit: 'inch',
          timezone: 'auto',
          forecast_days: '10',
        });

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        if (!cancelled) setWeather(data);
      } catch (e) {
        if (!cancelled) setError('Could not load weather data. Pull down to retry.');
      }

      // NWS alerts (US only, non-blocking)
      try {
        const alertRes = await fetch(
          `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
          { headers: { 'User-Agent': 'MyWeatherApp/1.0', 'Accept': 'application/geo+json' } }
        );
        if (alertRes.ok) {
          const alertData = await alertRes.json();
          if (!cancelled && alertData.features?.length > 0) {
            setAlerts(alertData.features.map(f => ({
              event: f.properties.event,
              headline: f.properties.headline,
              description: f.properties.description,
              severity: f.properties.severity,
              urgency: f.properties.urgency,
              expires: f.properties.expires,
            })));
          }
        }
      } catch {
        // Alerts are supplementary, don't fail on this
      }

      if (!cancelled) setLoading(false);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchAll(pos.coords.latitude, pos.coords.longitude),
        () => {
          setLocationName(DEFAULT_NAME);
          fetchAll(DEFAULT_LAT, DEFAULT_LON);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    } else {
      setLocationName(DEFAULT_NAME);
      fetchAll(DEFAULT_LAT, DEFAULT_LON);
    }

    return () => { cancelled = true; };
  }, []);

  return { weather, alerts, locationName, loading, error };
}
