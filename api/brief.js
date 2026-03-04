export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { current, hourly, daily, locationName, timeOfDay, tone, profile, calendarEvents } = req.body;

    const toneInstructions = {
      friendly: `Tone: Warm and conversational, like a helpful friend. Personable but not over the top.`,
      facts:    `Tone: Concise and factual. No personality, no fluff. Just the key information in plain language. Shorter is better.`,
      witty:    `Tone: Light and playful. A little dry humor or clever observation about the weather is welcome, but keep it natural — don't force it.`,
      coach:    `Tone: Motivational and energetic, like a coach giving a pre-game pep talk. Use the weather as fuel. "Crisp air = perfect conditions." Make them want to get out there.`,
    };
    const toneGuide = toneInstructions[tone] || toneInstructions.friendly;

    // Profile context
    const hasProfile = profile?.name || profile?.activities?.length > 0;
    const activityLabels = {
      running: 'running outdoors', cycling: 'cycling', commute_car: 'driving a car commute',
      commute_transit: 'commuting by transit', kids_sports: "attending kids' outdoor sports",
      gardening: 'gardening', golf: 'playing golf', hiking: 'hiking',
      outdoor_work: 'outdoor work / construction', motorcycling: 'motorcycling',
      fishing: 'fishing', dog_walks: 'walking a dog',
    };
    const profileContext = hasProfile
      ? `User profile:\nName: ${profile.name || 'not provided'}\nActivities affected by weather: ${profile.activities?.map(a => activityLabels[a] || a).join(', ') || 'none specified'}`
      : '';

    // Calendar context — today + tomorrow
    const todayEvents  = calendarEvents?.today  || [];
    const tomorrowEvts = calendarEvents?.tomorrow || [];
    const hasCalendarToday    = todayEvents.length > 0;
    const hasCalendarTomorrow = tomorrowEvts.length > 0;

    const fmtEvent = ev =>
      `- ${ev.allDay ? 'All day' : `${ev.start}${ev.end ? `–${ev.end}` : ''}`}: ${ev.title}${ev.location ? ` @ ${ev.location}` : ''}`;

    const calendarContext = (hasCalendarToday || hasCalendarTomorrow) ? [
      hasCalendarToday    ? `Today's calendar events:\n${todayEvents.map(fmtEvent).join('\n')}`    : '',
      hasCalendarTomorrow ? `Tomorrow's calendar events:\n${tomorrowEvts.map(fmtEvent).join('\n')}` : '',
    ].filter(Boolean).join('\n\n') : '';

    // Weather data block
    const weatherContext = `Location: ${locationName}
Time of day: ${timeOfDay} (hour: ${current.hour || 'unknown'})
Current temp: ${current.temp}°F (feels like ${current.feelsLike}°F)
Conditions: ${current.conditions}
Wind: ${current.windDir} ${current.windSpeed} mph, gusts ${current.gustSpeed} mph
Humidity: ${current.humidity}% | Dew point: ${current.dewPoint}°F
Cloud cover: ${current.cloudCover}% | UV index max: ${current.uvMax}

Today: High ${daily.todayHigh}°F / Low ${daily.todayLow}°F | Precip chance: ${daily.todayPrecipChance}%
Next few hours precip probability: ${hourly.precipProbs}
Sunrise: ${daily.sunrise} | Sunset: ${daily.sunset}

Tomorrow: ${daily.tomorrowConditions}, High ${daily.tomorrowHigh}°F / Low ${daily.tomorrowLow}°F | Precip: ${daily.tomorrowPrecipChance}%`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        messages: [{
          role: 'user',
          content: `You are a weather briefer for a personal weather app called "My Weather."

${toneGuide}
${profileContext ? `\n${profileContext}\n` : ''}${profile?.name ? `Address the user by name (${profile.name}) naturally — once if it fits, not every sentence.\n` : ''}${profile?.activities?.length > 0 ? `The user does these activities. If weather significantly affects any today, mention it with specific practical advice. Don't force it if conditions are mild.\n` : ''}${calendarContext ? `\n${calendarContext}\n\nCalendar instructions: The user has outdoor events today. Always acknowledge them — mention conditions relevant to each event (temp, rain chance, wind, UV, etc.) even if weather is pleasant. Be specific and practical: "You've got a beach trip at 2pm — it'll be sunny and hot, pack sunscreen." Mention tomorrow's events only in the TOMORROW sentence.\n` : ''}
Write a brief weather summary based on this data.

CRITICAL — Time awareness:
- Current time of day: ${timeOfDay} (hour: ${current.hour || 'unknown'})
- Brief should cover what's AHEAD, not a recap.
- Morning: focus on the day ahead. Afternoon: rest of today + evening. Evening: tonight + overnight only.
- Reference timeframes like "this afternoon," "tonight" — not "today" as a whole.

Rules:
- 2–4 sentences for the main brief
- Conversational, not meteorologist-speak
- Lead with what matters most right now
- Practical advice when relevant (umbrella, jacket, sunscreen)
- Interpret numbers, don't just list them
- No greeting or sign-off

Moisture guidance:
- Use dew point, not humidity %, to judge comfort
- Dew point <50°F = comfortable | 50–60° = noticeable | 60–65° = muggy | 65–70° = very uncomfortable | >70° = dangerous
- Only mention moisture if dew point is above 55°F

Then write EXACTLY "TOMORROW:" on its own line, followed by one sentence about tomorrow. Do NOT start with the word "Tomorrow."

Weather data:
${weatherContext}`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', errText);
      return res.status(500).json({ error: 'Claude API request failed' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const parts = text.split(/TOMORROW:\s*/i);

    return res.status(200).json({
      brief:    (parts[0] || '').trim(),
      tomorrow: (parts[1] || '').trim() || null,
    });

  } catch (err) {
    console.error('Brief generation error:', err);
    return res.status(500).json({ error: 'Failed to generate brief' });
  }
}
