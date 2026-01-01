// --- OpenAI Integration for Real-Time Data Analysis ---
export async function analyzeWithOpenAI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are an expert in environmental and health data analysis. Return concise, actionable insights based on the provided data." },
                { role: "user", content: prompt }
            ],
            max_tokens: 512
        })
    });
    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response from OpenAI.";
}
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
    lastUpdated: string;
}

export async function fetchWaterData(apiKey: string = ""): Promise<WaterQualityData[]> {
    const url = `https://api.data.gov.in/resource/9c84d0d3-3d5a-4f62-9c5f-1a2f2a2b8e2c?api-key=${apiKey}&format=json&limit=100`;

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
        const response = await fetch(url);
        const data = await response.json();
        return data.records || [];
    } catch (error) {
        console.error("Water API Error:", error);
        return [];
    }
}

export async function fetchWeatherData(city: string, apiKey: string = ""): Promise<WeatherData | null> {
    const activeKey = apiKey || DEFAULT_WEATHER_KEY;

    if (!activeKey) {
        throw new Error('WEATHER_API_KEY is not set. Set WEATHER_API_KEY in environment (e.g. .env.local) before running.');
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

export async function fetchPollutionData(city: string): Promise<PollutionData | null> {
    // Use a broader search for OpenAQ
    const url = `https://api.openaq.org/v2/latest?city=${encodeURIComponent(city)}&country=IN&limit=5`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            // If OpenAQ is empty, it's often because they don't have that specific 'city' name.
            // Returning a placeholder that is clearly marked or slightly randomized but alerted
            return {
                city,
                pm25: 0, // 0 indicates data missing
                pm10: 0,
                lastUpdated: "Data Missing"
            };
        }

        // Try to find the best measurement in the results
        const result = data.results[0];
        const measurements = result.measurements;
        const pm25 = measurements.find((m: any) => m.parameter === 'pm25')?.value || 0;
        const pm10 = measurements.find((m: any) => m.parameter === 'pm10')?.value || 0;

        return {
            city,
            pm25,
            pm10,
            lastUpdated: result.measurements[0].lastUpdated
        };
    } catch (error) {
        return null;
    }
}
