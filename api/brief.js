export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { current, hourly, daily, locationName, timeOfDay } = req.body;

    const weatherContext = `
Location: ${locationName}
Time of day: ${timeOfDay}
Current temp: ${current.temp}°F (feels like ${current.feelsLike}°F)
Conditions: ${current.conditions}
Wind: ${current.windDir} ${current.windSpeed} mph, gusts ${current.gustSpeed} mph
Humidity: ${current.humidity}%
Dew point: ${current.dewPoint}°F
Cloud cover: ${current.cloudCover}%
UV index max today: ${current.uvMax}

Today: High ${daily.todayHigh}°F, Low ${daily.todayLow}°F
Precipitation chance today: ${daily.todayPrecipChance}%

Tomorrow: ${daily.tomorrowConditions}, High ${daily.tomorrowHigh}°F / Low ${daily.tomorrowLow}°F
Tomorrow precipitation chance: ${daily.tomorrowPrecipChance}%

Next few hours precipitation probability: ${hourly.precipProbs}

Sunrise: ${daily.sunrise}
Sunset: ${daily.sunset}
`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `You are a friendly, conversational weather briefer for a personal weather app called "My Weather." Write a brief weather summary based on this data. 

Rules:
- Write 2-4 sentences for the main brief
- Be conversational and human, like a helpful friend — not a meteorologist
- Lead with what matters most right now (rain coming? dangerously hot? perfect day?)
- Include practical advice when relevant (umbrella, sunscreen, jacket, etc.)
- Don't just list numbers — interpret them for the person
- No greeting or sign-off, just the brief
- Use plain language, no jargon
- Be concise but warm

Important context for interpreting moisture:
- USE DEW POINT, not humidity, to judge how the air feels. Humidity percentage is misleading without temperature context.
- High humidity (90%+) at cold temps (below 50°F) is normal and NOT sticky/muggy — it just means damp, raw cold air. Don't call it "sticky."
- Dew point below 50°F = comfortable. 50-60°F = noticeable. 60-65°F = muggy. 65-70°F = very uncomfortable. Above 70°F = dangerous, your body can't cool itself.
- Only mention humidity/moisture if the dew point is actually high enough to affect comfort (above 55°F).

Then on a new line starting with "TOMORROW:" write one sentence about tomorrow.

Weather data:
${weatherContext}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', errText);
      return res.status(500).json({ error: 'Claude API request failed' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Split into main brief and tomorrow
    const parts = text.split(/TOMORROW:\s*/i);
    const mainBrief = (parts[0] || '').trim();
    const tomorrowBrief = (parts[1] || '').trim();

    return res.status(200).json({
      brief: mainBrief,
      tomorrow: tomorrowBrief || null,
    });

  } catch (err) {
    console.error('Brief generation error:', err);
    return res.status(500).json({ error: 'Failed to generate brief' });
  }
}
