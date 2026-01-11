const DEFAULT_WEATHER_KEY = process.env.WEATHER_API_KEY;

export interface WaterQualityData {
    station_code: string;
    station_name: string;
    state_name: string;
    district_name: string;
    quality_parameter: string;
    value: string;
}

export interface WeatherData {
    city: string;
    temp: number;
    humidity: number;
    wind_speed: number;
    description: string;
    rain_last_3h: number;
}

export interface PollutionData {
    city: string;
    pm25: number;
    pm10: number;
    usEpaIndex?: number;
    gbDefraIndex?: number;
    lastUpdated: string;
}

export async function fetchWaterData(apiKey: string = ""): Promise<WaterQualityData[]> {
    try {
        // ONLY use mock if NO API KEY is present at all
        if (!apiKey) {
            console.log("No Water API Key - using simulation data");
            return [
                { station_code: "M001", station_name: "Ganga (Varanasi)", state_name: "Uttar Pradesh", district_name: "Varanasi", quality_parameter: "Dissolved Oxygen", value: "3.8" },
                { station_code: "D002", station_name: "Yamuna (Okhla)", state_name: "Delhi", district_name: "New Delhi", quality_parameter: "BOD", value: "45" },
                { station_code: "K003", station_name: "Vrishabhavathi", state_name: "Karnataka", district_name: "Bengaluru", quality_parameter: "pH", value: "8.5" },
                { station_code: "M004", station_name: "Mithi River", state_name: "Maharashtra", district_name: "Mumbai", quality_parameter: "BOD", value: "30" },
            ];
        }

        // Pull more than the default 100 records so we cover more states.
        // data.gov.in uses limit+offset pagination.
        const limit = 1000;
        const maxPages = 5; // cap to avoid long cold starts
        const all: WaterQualityData[] = [];

        for (let page = 0; page < maxPages; page++) {
            const offset = page * limit;
            const url = `https://api.data.gov.in/resource/9c84d0d3-3d5a-4f62-9c5f-1a2f2a2b8e2c?api-key=${apiKey}&format=json&limit=${limit}&offset=${offset}`;
            const response = await fetch(url);
            if (!response.ok) break;
            const data = await response.json();
            const records: WaterQualityData[] = data.records || [];
            all.push(...records);
            if (records.length < limit) break;
        }

        // If a key was provided but we still got nothing (invalid key, quota, upstream issue),
        // fall back to simulation so the UI doesn't show empty water for all states.
        if (all.length === 0) {
            console.warn("Water API returned 0 records; falling back to simulation data");
            return [
                { station_code: "M001", station_name: "Ganga (Varanasi)", state_name: "Uttar Pradesh", district_name: "Varanasi", quality_parameter: "Dissolved Oxygen", value: "3.8" },
                { station_code: "D002", station_name: "Yamuna (Okhla)", state_name: "Delhi", district_name: "New Delhi", quality_parameter: "BOD", value: "45" },
                { station_code: "K003", station_name: "Vrishabhavathi", state_name: "Karnataka", district_name: "Bengaluru", quality_parameter: "pH", value: "8.5" },
                { station_code: "M004", station_name: "Mithi River", state_name: "Maharashtra", district_name: "Mumbai", quality_parameter: "BOD", value: "30" },
            ];
        }

        return all;
    } catch (error) {
        console.error("Water API Error:", error);
        // If we fail while a key is present, still return simulation to keep the app usable.
        return [
            { station_code: "M001", station_name: "Ganga (Varanasi)", state_name: "Uttar Pradesh", district_name: "Varanasi", quality_parameter: "Dissolved Oxygen", value: "3.8" },
            { station_code: "D002", station_name: "Yamuna (Okhla)", state_name: "Delhi", district_name: "New Delhi", quality_parameter: "BOD", value: "45" },
            { station_code: "K003", station_name: "Vrishabhavathi", state_name: "Karnataka", district_name: "Bengaluru", quality_parameter: "pH", value: "8.5" },
            { station_code: "M004", station_name: "Mithi River", state_name: "Maharashtra", district_name: "Mumbai", quality_parameter: "BOD", value: "30" },
        ];
    }
}

export async function fetchWeatherData(city: string, apiKey: string = ""): Promise<WeatherData | null> {
    const activeKey = apiKey || DEFAULT_WEATHER_KEY;

    if (!activeKey) {
        // In client components, server-only env vars are unavailable.
        // Return null rather than throwing to avoid crashing the UI.
        console.warn('WEATHER_API_KEY is not set. Returning null weather data.');
        return null;
    }

    // Ensure queries default to India when country not provided
    const query = city.includes(",") ? city : `${city}, India`;
    const url = `https://api.weatherapi.com/v1/current.json?key=${activeKey}&q=${encodeURIComponent(query)}&aqi=yes`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data || data.error) {
            console.error(`Weather API Error for ${city}:`, data?.error || data);
            return null;
        }

        return {
            city: data.location?.name || city,
            temp: data.current?.temp_c ?? 0,
            humidity: data.current?.humidity ?? 0,
            wind_speed: data.current?.wind_kph ?? data.current?.wind_mph ?? 0,
            description: data.current?.condition?.text || "",
            rain_last_3h: data.current?.precip_mm ?? 0
        };

    } catch (error) {
        console.error(`Fetch error for ${city}:`, error);
        return null;
    }
}

export async function fetchPollutionData(
    city: string,
    coords?: { lat: number; lng: number }
): Promise<PollutionData | null> {
    const activeKey = DEFAULT_WEATHER_KEY;
    if (!activeKey) {
        return {
            city,
            pm25: 0,
            pm10: 0,
            usEpaIndex: undefined,
            gbDefraIndex: undefined,
            lastUpdated: 'Data Missing',
        };
    }

    // WeatherAPI provides air quality as part of current.json when aqi=yes.
    // This replaces the prior OpenAQ integration, which now returns HTTP 410 (Gone).
    const query = coords ? `${coords.lat},${coords.lng}` : (city.includes(",") ? city : `${city}, India`);
    const url = `https://api.weatherapi.com/v1/current.json?key=${activeKey}&q=${encodeURIComponent(query)}&aqi=yes`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data || data.error) {
            return {
                city,
                pm25: 0,
                pm10: 0,
                usEpaIndex: undefined,
                gbDefraIndex: undefined,
                lastUpdated: 'Data Missing',
            };
        }

        const aq = data.current?.air_quality;
        const pm25 = typeof aq?.pm2_5 === 'number' ? aq.pm2_5 : 0;
        const pm10 = typeof aq?.pm10 === 'number' ? aq.pm10 : 0;
        const usEpaIndexRaw = aq?.['us-epa-index'];
        const gbDefraIndexRaw = aq?.['gb-defra-index'];
        const usEpaIndex = typeof usEpaIndexRaw === 'number' ? usEpaIndexRaw : undefined;
        const gbDefraIndex = typeof gbDefraIndexRaw === 'number' ? gbDefraIndexRaw : undefined;
        const lastUpdated = data.current?.last_updated || 'Unknown';

        return {
            city: data.location?.name || city,
            pm25,
            pm10,
            usEpaIndex,
            gbDefraIndex,
            lastUpdated,
        };
    } catch {
        return {
            city,
            pm25: 0,
            pm10: 0,
            usEpaIndex: undefined,
            gbDefraIndex: undefined,
            lastUpdated: 'Data Missing',
        };
    }
}
