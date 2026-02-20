// --- WMO Weather Codes ---
export const WMO_CODES = {
  0: { label: "Clear sky", icon: "☀️", night: "🌙" },
  1: { label: "Mainly clear", icon: "🌤️", night: "🌙" },
  2: { label: "Partly cloudy", icon: "⛅", night: "☁️" },
  3: { label: "Overcast", icon: "☁️", night: "☁️" },
  45: { label: "Foggy", icon: "🌫️", night: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️", night: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️", night: "🌧️" },
  53: { label: "Drizzle", icon: "🌦️", night: "🌧️" },
  55: { label: "Dense drizzle", icon: "🌧️", night: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️", night: "🌧️" },
  57: { label: "Heavy freezing drizzle", icon: "🌧️", night: "🌧️" },
  61: { label: "Light rain", icon: "🌦️", night: "🌧️" },
  63: { label: "Moderate rain", icon: "🌧️", night: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️", night: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️", night: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️", night: "🌧️" },
  71: { label: "Light snow", icon: "🌨️", night: "🌨️" },
  73: { label: "Moderate snow", icon: "🌨️", night: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️", night: "❄️" },
  77: { label: "Snow grains", icon: "❄️", night: "❄️" },
  80: { label: "Light showers", icon: "🌦️", night: "🌧️" },
  81: { label: "Moderate showers", icon: "🌧️", night: "🌧️" },
  82: { label: "Heavy showers", icon: "⛈️", night: "⛈️" },
  85: { label: "Light snow showers", icon: "🌨️", night: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️", night: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️", night: "⛈️" },
  96: { label: "T-storm with hail", icon: "⛈️", night: "⛈️" },
  99: { label: "Severe t-storm", icon: "⛈️", night: "⛈️" },
};

export function getWeatherInfo(code, isDay = true) {
  const info = WMO_CODES[code] || { label: "Unknown", icon: "🌡️", night: "🌡️" };
  return { label: info.label, icon: isDay ? info.icon : info.night };
}

// --- Dew Point ---
export function calcDewPointFromTempHumidity(tempF, rh) {
  const tempC = (tempF - 32) * (5 / 9);
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  const dewC = (b * alpha) / (a - alpha);
  return Math.round(dewC * (9 / 5) + 32);
}

export const DEW_POINT_LEVELS = [
  { max: 30, label: "Bone dry", color: "#8ecae6", desc: "Very dry air. May cause dry skin, chapped lips, and static. Consider a humidifier indoors." },
  { max: 40, label: "Dry", color: "#95d5b2", desc: "Comfortably dry. Pleasant air — no moisture issues." },
  { max: 50, label: "Comfortable", color: "#52b788", desc: "The sweet spot. Most people feel great in this range." },
  { max: 55, label: "Starting to notice", color: "#e9c46a", desc: "You can start to feel moisture in the air. Still fine for most people." },
  { max: 60, label: "Sticky", color: "#f4a261", desc: "Noticeably humid. Outdoor activity starts feeling heavier. Sweat doesn't evaporate as easily." },
  { max: 65, label: "Muggy", color: "#e76f51", desc: "Uncomfortable for most people. You'll feel sticky. AC makes a big difference." },
  { max: 70, label: "Oppressive", color: "#d62828", desc: "Very uncomfortable. Sweat won't evaporate well. Heat exhaustion risk increases with activity." },
  { max: 75, label: "Dangerous", color: "#9d0208", desc: "Your body cannot cool itself efficiently. Heat illness is a real risk, especially for children, elderly, and anyone exerting themselves outdoors. Limit time outside." },
  { max: 999, label: "Extreme danger", color: "#6a040f", desc: "Potentially life-threatening conditions. Heatstroke risk is high even with limited activity. Stay indoors in AC. Check on elderly neighbors. This is a medical emergency waiting to happen." },
];

export function getDewPointLevel(dewPoint) {
  return DEW_POINT_LEVELS.find((l) => dewPoint <= l.max);
}

export function getWindDirection(degrees) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(degrees / 22.5) % 16];
}

// --- Short Brief ---
export function generateShortBrief(current, hourly, daily) {
  const now = new Date();
  const tempF = Math.round(current.temperature_2m);
  const feelsLike = Math.round(current.apparent_temperature);
  const weatherInfo = getWeatherInfo(current.weather_code, current.is_day);
  const highF = Math.round(daily.temperature_2m_max[0]);
  const lowF = Math.round(daily.temperature_2m_min[0]);

  // Check for precipitation in next 12 hours
  const upcomingHours = hourly.time
    .map((t, i) => ({
      time: new Date(t),
      precip: hourly.precipitation_probability[i],
    }))
    .filter((h) => h.time > now && h.time < new Date(now.getTime() + 12 * 60 * 60 * 1000));
  const wetHours = upcomingHours.filter((h) => h.precip > 50);
  const isSnowy = [71, 73, 75, 77, 85, 86].includes(current.weather_code);

  // Core line: temp + condition + range
  const feelsDiff = Math.abs(tempF - feelsLike);
  let line1 = `${tempF}°`;
  if (feelsDiff >= 5) line1 += ` (feels ${feelsLike}°)`;
  line1 += `, ${weatherInfo.label.toLowerCase()}. High ${highF}°, low ${lowF}°.`;

  // Action line: the one thing you need to know
  let line2 = '';
  if (wetHours.length >= 4) {
    line2 = isSnowy ? 'Snow much of the day — drive carefully.' : 'Rain much of the day — grab an umbrella.';
  } else if (wetHours.length >= 1) {
    line2 = isSnowy ? 'Some snow expected — heads up.' : 'Rain possible — umbrella wouldn\'t hurt.';
  } else if (Math.round(current.wind_gusts_10m) > 30) {
    line2 = `Gusty winds up to ${Math.round(current.wind_gusts_10m)} mph.`;
  } else if (Math.round(daily.uv_index_max[0]) >= 8) {
    line2 = 'High UV — wear sunscreen.';
  } else if (Math.round(current.dew_point_2m || 0) >= 65) {
    line2 = 'Muggy out there. Stay cool.';
  } else {
    line2 = 'Nothing to worry about — enjoy your day.';
  }

  return `${line1} ${line2}`;
}

// --- Full Brief ---
export function generateDailySummary(current, hourly, daily) {
  const parts = [];
  const now = new Date();
  const hour = now.getHours();
  const tempF = Math.round(current.temperature_2m);
  const feelsLike = Math.round(current.apparent_temperature);
  const weatherInfo = getWeatherInfo(current.weather_code, current.is_day);
  const highF = Math.round(daily.temperature_2m_max[0]);
  const lowF = Math.round(daily.temperature_2m_min[0]);
  const windMph = Math.round(current.wind_speed_10m);
  const gustMph = Math.round(current.wind_gusts_10m);
  const humidity = current.relative_humidity_2m;
  const dewPoint = current.dew_point_2m != null
    ? Math.round(current.dew_point_2m)
    : calcDewPointFromTempHumidity(tempF, humidity);
  const uvMax = Math.round(daily.uv_index_max[0]);

  // Greeting
  if (hour < 12) {
    parts.push(`Good morning. It's ${tempF}° right now`);
  } else if (hour < 17) {
    parts.push(`Right now it's ${tempF}°`);
  } else {
    parts.push(`This evening it's ${tempF}°`);
  }

  // Feels like
  const feelsDiff = Math.abs(tempF - feelsLike);
  if (feelsDiff >= 5) {
    parts[0] += `, but feels more like ${feelsLike}°`;
  }
  parts[0] += `. ${weatherInfo.label}.`;

  // High/low
  if (hour < 14) {
    parts.push(`Heading to a high of ${highF}° this afternoon, dropping to ${lowF}° tonight.`);
  } else {
    parts.push(`We hit ${highF}° today and we'll drop to ${lowF}° overnight.`);
  }

  // Wind
  if (gustMph > 30) {
    parts.push(`It's gusty out there — wind gusting to ${gustMph} mph. Hold onto your hat.`);
  } else if (windMph > 20) {
    parts.push(`Windy at ${windMph} mph with gusts to ${gustMph}. You'll feel it.`);
  } else if (windMph > 12) {
    parts.push(`There's a noticeable breeze at ${windMph} mph.`);
  }

  // Rain/snow check — look ahead in hourly data
  const upcomingHours = hourly.time
    .map((t, i) => ({
      time: new Date(t),
      precip: hourly.precipitation_probability[i],
      code: hourly.weather_code[i]
    }))
    .filter((h) => h.time > now && h.time < new Date(now.getTime() + 12 * 60 * 60 * 1000));

  const isSnowy = [71, 73, 75, 77, 85, 86].includes(current.weather_code);
  const precipWord = isSnowy ? "snow" : "rain";

  const wetHours = upcomingHours.filter((h) => h.precip > 50);
  if (wetHours.length > 0) {
    const firstWet = wetHours[0];
    const wetHour = firstWet.time.getHours();
    const wetTime = wetHour === 12 ? "noon" : wetHour > 12 ? `${wetHour - 12}pm` :
      wetHour === 0 ? "midnight" : `${wetHour}am`;

    if (wetHours.length >= 4) {
      parts.push(`${isSnowy ? 'Snow' : 'Rain'} is likely much of the day — starts around ${wetTime}.${isSnowy ? ' Roads will be slick.' : ' Bring an umbrella.'}`);
    } else if (wetHours.length >= 2) {
      parts.push(`There's a wet window coming around ${wetTime}.${isSnowy ? ' Watch for accumulation.' : " Umbrella's a good idea."}`);
    } else {
      parts.push(`A brief ${precipWord === 'snow' ? 'flurry' : 'shower'} is possible around ${wetTime}, but it shouldn't last.`);
    }
  } else {
    const maxPrecip = upcomingHours.length > 0 ? Math.max(...upcomingHours.map((h) => h.precip)) : 0;
    if (maxPrecip < 20) {
      parts.push(`No ${precipWord} in sight — you're clear.`);
    }
  }

  // UV
  if (uvMax >= 8) {
    parts.push(`UV index peaks at ${uvMax} — sunscreen is non-negotiable today.`);
  } else if (uvMax >= 6) {
    parts.push(`UV gets up to ${uvMax} this afternoon — consider sunscreen if you'll be out.`);
  }

  // Dew point / humidity
  const dewLevel = getDewPointLevel(dewPoint);
  if (dewPoint >= 65) {
    parts.push(`Dew point is ${dewPoint}° — ${dewLevel.label.toLowerCase()}. It's going to feel thick out there.`);
  } else if (dewPoint >= 55) {
    parts.push(`Dew point is ${dewPoint}° — starting to feel sticky.`);
  } else if (humidity < 30) {
    parts.push(`Air is very dry today — ${humidity}% humidity. Stay hydrated.`);
  } else if (humidity < 45) {
    parts.push(`Air is dry today — ${humidity}% humidity with a dew point of ${dewPoint}°. Comfortable breathing weather.`);
  }

  return parts.join(" ");
}

export function generateTomorrowSummary(daily) {
  if (!daily.temperature_2m_max[1] || !daily.temperature_2m_min[1]) {
    return 'Tomorrow\'s forecast is not yet available.';
  }
  const highF = Math.round(daily.temperature_2m_max[1]);
  const lowF = Math.round(daily.temperature_2m_min[1]);
  const code = daily.weather_code[1];
  const precipProb = daily.precipitation_probability_max[1];
  const info = getWeatherInfo(code, true);

  let summary = `Tomorrow: ${info.label}, ${highF}°/${lowF}°.`;
  if (precipProb > 60) {
    summary += ` ${precipProb}% chance of precipitation — plan accordingly.`;
  } else if (precipProb > 30) {
    summary += ` Some chance of rain (${precipProb}%).`;
  } else {
    summary += ` Looking dry.`;
  }
  return summary;
}
