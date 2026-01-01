import { fetchWeatherData, fetchWaterData, fetchPollutionData, WeatherData, WaterQualityData, PollutionData } from "./api-client";

// List of cities to monitor for the "National Dashboard" view
import { ALL_STATES } from "./all-states";

const MONITOR_CITIES = ALL_STATES.map((state, i) => ({ name: state, state }));

export interface RiskProfile {
    location: string;
    state: string;
    dengueRisk: number; // 0-100
    respiratoryRisk: number; // 0-100
    waterRisk: number; // 0-100
    overallRisk: "Low" | "Medium" | "High" | "Critical";
    primaryThreat: string;
    environmentalFactors: {
        temp: number;
        rain: boolean;
        humidity: number;
        pm25: number;
        waterQuality: string;
    };
}

// Utility to pause execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function calculateLiveRisks(weatherKey: string = "", waterKey: string = ""): Promise<RiskProfile[]> {
    const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || "sk-proj-...";
    const results: RiskProfile[] = [];
    for (const city of MONITOR_CITIES) {
        const state = city.state;
        try {
            const [weather, pollution, water] = await Promise.all([
                fetchWeatherData(state).catch(e => { console.error(`Weather API error for ${state}:`, e); return null; }),
                fetchPollutionData(state).catch(e => { console.error(`Pollution API error for ${state}:`, e); return null; }),
                fetchWaterData().catch(e => { console.error(`Water API error for ${state}:`, e); return null; })
            ]);
            const waterForRegion = water?.find(w => w.state_name === state || w.district_name === state);
            const prompt = `Given the following real-time data for ${state}:
                - Weather: ${weather ? `${weather.temp}°C, ${weather.humidity}% humidity, ${weather.description}` : 'N/A'}
                - Pollution: PM2.5=${pollution?.pm25 ?? 'N/A'}, PM10=${pollution?.pm10 ?? 'N/A'}
                - Water Quality: ${waterForRegion ? `${waterForRegion.quality_parameter}=${waterForRegion.value}` : 'N/A'}
                Provide a dengue risk (0-100), respiratory risk (0-100), water risk (0-100), and the primary threat (disease name).`;
            let openAIResponse = "";
            try {
                openAIResponse = await import("./api-client").then(m => m.analyzeWithOpenAI(prompt, OPENAI_API_KEY));
            } catch (err) {
                console.error(`OpenAI API error for ${state}:`, err);
                openAIResponse = "{\"dengueRisk\":50,\"respiratoryRisk\":50,\"waterRisk\":50,\"primaryThreat\":\"Unknown\"}";
            }
            let parsed: any = {};
            try {
                parsed = JSON.parse(openAIResponse);
            } catch {
                // fallback: extract numbers and disease
                const dengueMatch = openAIResponse.match(/dengue risk\s*[:=]\s*([0-9.]+)/i);
                parsed.dengueRisk = dengueMatch ? parseFloat(dengueMatch[1]) : 50;
                const respMatch = openAIResponse.match(/respiratory risk\s*[:=]\s*([0-9.]+)/i);
                parsed.respiratoryRisk = respMatch ? parseFloat(respMatch[1]) : 50;
                const waterMatch = openAIResponse.match(/water risk\s*[:=]\s*([0-9.]+)/i);
                parsed.waterRisk = waterMatch ? parseFloat(waterMatch[1]) : 50;
                const threatMatch = openAIResponse.match(/primary threat\s*[:=]\s*([\w /]+)/i);
                parsed.primaryThreat = threatMatch ? threatMatch[1] : "Unknown";
            }
            // Ensure all values are valid numbers
            const dengueRisk = isFinite(parsed.dengueRisk) ? parsed.dengueRisk : 50;
            const respiratoryRisk = isFinite(parsed.respiratoryRisk) ? parsed.respiratoryRisk : 50;
            const waterRisk = isFinite(parsed.waterRisk) ? parsed.waterRisk : 50;
            const maxRisk = Math.max(dengueRisk, respiratoryRisk, waterRisk);
            let overallRisk = "Low";
            if (maxRisk > 40) overallRisk = "Medium";
            if (maxRisk > 70) overallRisk = "High";
            if (maxRisk > 90) overallRisk = "Critical";
            results.push({
                location: state,
                state: state,
                dengueRisk,
                respiratoryRisk,
                waterRisk,
                overallRisk: overallRisk as any,
                primaryThreat: parsed.primaryThreat || "Unknown",
                environmentalFactors: {
                    temp: weather?.temp ?? 0,
                    humidity: weather?.humidity ?? 0,
                    rain: !!weather?.rain_last_3h,
                    pm25: pollution?.pm25 ?? 0,
                    waterQuality: waterForRegion ? (parseFloat(waterForRegion.value) > 10 ? "Poor" : "Good") : "Unknown"
                }
            });
        } catch (err) {
            // If everything fails, push a safe fallback
            console.error(`Total risk calculation failure for ${state}:`, err);
            results.push({
                location: state,
                state: state,
                dengueRisk: 50,
                respiratoryRisk: 50,
                waterRisk: 50,
                overallRisk: "Low",
                primaryThreat: "Unknown",
                environmentalFactors: {
                    temp: 0,
                    humidity: 0,
                    rain: false,
                    pm25: 0,
                    waterQuality: "Unknown"
                }
            });
        }
    }
    // If all results are empty, push a single fallback
    if (results.length === 0) {
        results.push({
            location: "Unknown",
            state: "Unknown",
            dengueRisk: 50,
            respiratoryRisk: 50,
            waterRisk: 50,
            overallRisk: "Low",
            primaryThreat: "Unknown",
            environmentalFactors: {
                temp: 0,
                humidity: 0,
                rain: false,
                pm25: 0,
                waterQuality: "Unknown"
            }
        });
    }
    return results;
}
