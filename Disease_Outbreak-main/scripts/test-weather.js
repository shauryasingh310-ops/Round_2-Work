// Load local env file when present (dev only)
try { require('dotenv').config(); } catch (e) {}

const city = process.argv[2] || 'London';
// Accept API key as third CLI arg: node scripts/test-weather.js <city> <key>
const cliKey = process.argv[3];
const key = cliKey || process.env.WEATHER_API_KEY;

if (!key) {
  console.error('Usage: node scripts/test-weather.js <city> <WEATHER_API_KEY>\nOr set WEATHER_API_KEY in your environment.');
  process.exit(1);
}

const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(city)}&aqi=yes`;

(async ()=>{
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) { console.error('API error', data.error); process.exit(1); }
    console.log('location:', data.location?.name);
    console.log('temp_c:', data.current?.temp_c);
    console.log('humidity:', data.current?.humidity);
    console.log('wind_kph:', data.current?.wind_kph);
    console.log('condition:', data.current?.condition?.text);
    console.log('precip_mm:', data.current?.precip_mm);
    // Print a short raw preview
    const raw = JSON.stringify(data, null, 2);
    console.log('\nraw (truncated):\n', raw.slice(0, 1500));
  } catch(e){ console.error('fetch failed', e); process.exit(2); }
})();
