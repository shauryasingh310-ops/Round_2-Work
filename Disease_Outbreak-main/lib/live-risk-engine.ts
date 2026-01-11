import { ALL_STATES } from "./all-states";

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

type DiseaseDataApiResponse = {
    updatedAt: string
    states: Array<{
        state: string
        overallRisk?: "Low" | "Medium" | "High" | "Critical"
        dengueRisk?: number
        respiratoryRisk?: number
        waterRisk?: number
        primaryThreat?: string
        environmentalFactors?: {
            temp: number
            humidity: number
            rain: boolean
            pm25: number
            waterQuality: string
        }
    }>
}

export async function calculateLiveRisks(weatherKey: string = "", waterKey: string = ""): Promise<RiskProfile[]> {
    try {
        const res = await fetch('/api/disease-data', { cache: 'no-store' })
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const data = (await res.json()) as DiseaseDataApiResponse

        const byState = new Map<string, DiseaseDataApiResponse['states'][number]>()
        for (const row of data.states ?? []) {
            if (row?.state) byState.set(row.state, row)
        }

        const results: RiskProfile[] = ALL_STATES.map((state) => {
            const row = byState.get(state)
            return {
                location: state,
                state,
                dengueRisk: typeof row?.dengueRisk === 'number' ? row.dengueRisk : 50,
                respiratoryRisk: typeof row?.respiratoryRisk === 'number' ? row.respiratoryRisk : 50,
                waterRisk: typeof row?.waterRisk === 'number' ? row.waterRisk : 50,
                overallRisk: (row?.overallRisk ?? "Low") as any,
                primaryThreat: row?.primaryThreat ?? "Unknown",
                environmentalFactors: {
                    temp: row?.environmentalFactors?.temp ?? 0,
                    humidity: row?.environmentalFactors?.humidity ?? 0,
                    rain: !!row?.environmentalFactors?.rain,
                    pm25: row?.environmentalFactors?.pm25 ?? 0,
                    waterQuality: row?.environmentalFactors?.waterQuality ?? "Unknown",
                },
            }
        })

        return results
    } catch {
        // Safe fallback (no secrets, no external AI)
        return ALL_STATES.map((state) => ({
            location: state,
            state,
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
                waterQuality: "Unknown",
            },
        }))
    }
}
