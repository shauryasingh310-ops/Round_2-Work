// Basic types
export interface RegionData {
    region: string;
    cases: number;
    severity: "low" | "medium" | "high" | "critical";
    hospital_capacity: number;
    population: number;
    trend: "rising" | "falling" | "stable";
    last_updated: number; // timestamp
}

export interface PredictionAlert {
    id: string;
    region: string;
    disease: string; // inferred from region for now
    risk_level: "Low" | "Medium" | "High" | "Critical";
    confidence: number;
    days_ahead: number;
    contributing_factors: string[];
}

// Initial Seed Data
// Initial Seed Data - Based on NCDC/NVBDCP 2024 Provisional Reports (Approximated)
const INITIAL_DATA: RegionData[] = [
    // --- High Malaria Burden States (NVBDCP 2024) ---
    { region: "Odisha", cases: 1420, severity: "critical", hospital_capacity: 45, population: 41974218, trend: "rising", last_updated: Date.now() }, // High Malaria
    { region: "Chhattisgarh", cases: 850, severity: "high", hospital_capacity: 55, population: 29436231, trend: "stable", last_updated: Date.now() },
    { region: "Jharkhand", cases: 620, severity: "high", hospital_capacity: 50, population: 32988134, trend: "falling", last_updated: Date.now() },
    { region: "Tripura", cases: 410, severity: "high", hospital_capacity: 60, population: 3673917, trend: "rising", last_updated: Date.now() },

    // --- High Dengue Burden States (NVBDCP 2024) ---
    { region: "West Bengal", cases: 1250, severity: "critical", hospital_capacity: 35, population: 91276115, trend: "rising", last_updated: Date.now() }, // Severe Dengue Outbreak
    { region: "Uttar Pradesh", cases: 980, severity: "critical", hospital_capacity: 40, population: 199812341, trend: "rising", last_updated: Date.now() },
    { region: "Bihar", cases: 890, severity: "high", hospital_capacity: 38, population: 104099452, trend: "rising", last_updated: Date.now() },
    { region: "Karnataka", cases: 750, severity: "high", hospital_capacity: 75, population: 61095297, trend: "stable", last_updated: Date.now() },
    { region: "Maharashtra", cases: 680, severity: "high", hospital_capacity: 65, population: 112374333, trend: "rising", last_updated: Date.now() }, // Rising Chikungunya
    { region: "Delhi", cases: 540, severity: "high", hospital_capacity: 80, population: 16787941, trend: "falling", last_updated: Date.now() },
    { region: "Tamil Nadu", cases: 420, severity: "medium", hospital_capacity: 85, population: 72147030, trend: "stable", last_updated: Date.now() },
    { region: "Kerala", cases: 380, severity: "medium", hospital_capacity: 88, population: 33406061, trend: "stable", last_updated: Date.now() },

    // --- Moderate/Low Burden States ---
    { region: "Andhra Pradesh", cases: 310, severity: "medium", hospital_capacity: 70, population: 49577103, trend: "stable", last_updated: Date.now() },
    { region: "Telangana", cases: 290, severity: "medium", hospital_capacity: 72, population: 35003674, trend: "stable", last_updated: Date.now() },
    { region: "Gujarat", cases: 275, severity: "medium", hospital_capacity: 68, population: 60439692, trend: "falling", last_updated: Date.now() },
    { region: "Rajasthan", cases: 240, severity: "medium", hospital_capacity: 62, population: 68548437, trend: "falling", last_updated: Date.now() },
    { region: "Madhya Pradesh", cases: 210, severity: "medium", hospital_capacity: 58, population: 72626809, trend: "stable", last_updated: Date.now() },
    { region: "Haryana", cases: 150, severity: "low", hospital_capacity: 78, population: 25351462, trend: "stable", last_updated: Date.now() },
    { region: "Punjab", cases: 130, severity: "low", hospital_capacity: 76, population: 27743338, trend: "falling", last_updated: Date.now() },
    { region: "Assam", cases: 180, severity: "medium", hospital_capacity: 65, population: 31205576, trend: "rising", last_updated: Date.now() },
    { region: "Uttarakhand", cases: 90, severity: "low", hospital_capacity: 72, population: 10086292, trend: "falling", last_updated: Date.now() },
    { region: "Himachal Pradesh", cases: 45, severity: "low", hospital_capacity: 82, population: 6864602, trend: "stable", last_updated: Date.now() },
    { region: "Jammu & Kashmir", cases: 35, severity: "low", hospital_capacity: 68, population: 12267032, trend: "stable", last_updated: Date.now() },
    { region: "Goa", cases: 85, severity: "low", hospital_capacity: 85, population: 1458545, trend: "rising", last_updated: Date.now() },

    // --- North East & Others ---
    { region: "Manipur", cases: 120, severity: "medium", hospital_capacity: 55, population: 2855794, trend: "rising", last_updated: Date.now() },
    { region: "Meghalaya", cases: 95, severity: "low", hospital_capacity: 58, population: 2966889, trend: "stable", last_updated: Date.now() },
    { region: "Mizoram", cases: 240, severity: "medium", hospital_capacity: 60, population: 1097206, trend: "rising", last_updated: Date.now() }, // High relative to pop
    { region: "Nagaland", cases: 40, severity: "low", hospital_capacity: 62, population: 1978502, trend: "stable", last_updated: Date.now() },
    { region: "Arunachal Pradesh", cases: 30, severity: "low", hospital_capacity: 65, population: 1383727, trend: "stable", last_updated: Date.now() },
    { region: "Sikkim", cases: 15, severity: "low", hospital_capacity: 80, population: 610577, trend: "stable", last_updated: Date.now() },
];

class SimulationEngine {
    private static instance: SimulationEngine;
    private state: RegionData[] = [];

    private constructor() {
        this.state = [...INITIAL_DATA];
    }

    public static getInstance(): SimulationEngine {
        if (!SimulationEngine.instance) {
            SimulationEngine.instance = new SimulationEngine();
        }
        return SimulationEngine.instance;
    }

    public getRegionData(): RegionData[] {
        return this.state;
    }

    // This method simulates "Time Passing"
    public tick(): void {
        this.state = this.state.map(region => {
            let change = 0;
            const randomFactor = Math.random();

            // Infection Logic (Heuristic)
            if (region.trend === "rising") {
                // Rising trend: high chance of increase
                if (randomFactor > 0.3) change = Math.floor(Math.random() * 8) + 1; // +1 to +8
                else change = -1; // Small chance of recovery
            } else if (region.trend === "falling") {
                // Falling trend: high chance of decrease
                if (randomFactor > 0.3) change = -1 * (Math.floor(Math.random() * 5) + 1); // -1 to -5
                else change = 1;
            } else {
                // Stable: fluctuate slightly
                change = Math.floor(Math.random() * 5) - 2; // -2 to +2
            }

            // Update Cases
            let newCases = Math.max(0, region.cases + change);
            let newTrend = region.trend;

            // Trend Update Logic
            // If cases spike too much, switch to rising
            if (change > 5) newTrend = "rising";
            // If cases drop consistently, switch to falling
            if (change < -3) newTrend = "falling";
            // Random chance to stabilize or shift
            if (Math.random() > 0.95) {
                const trends: ("rising" | "falling" | "stable")[] = ["rising", "falling", "stable"];
                newTrend = trends[Math.floor(Math.random() * trends.length)];
            }

            // Severity Logic based on Thresholds
            let newSeverity: RegionData["severity"] = "low";
            if (newCases > 300) newSeverity = "critical";
            else if (newCases > 150) newSeverity = "high";
            else if (newCases > 50) newSeverity = "medium";

            return {
                ...region,
                cases: newCases,
                trend: newTrend,
                severity: newSeverity,
                last_updated: Date.now()
            };
        });
    }

    // Generate Predictions based on the CURRENT Real State
    public getPredictions(): PredictionAlert[] {
        const predictions: PredictionAlert[] = [];

        // Logical Heuristic: Find regions with concerning stats
        this.state.forEach((region, index) => {
            if (region.severity === "critical" || region.severity === "high") {
                // Map regions to likely diseases (Simplified heuristic)
                let disease = "Viral Fever";
                if (region.region === "Uttar Pradesh" || region.region === "Bihar") disease = "Cholera";
                if (region.region === "Maharashtra") disease = "Leptospirosis";
                if (region.region === "West Bengal") disease = "Diarrhea";

                // Calculate Confidence based on "real" metrics
                // More cases = higher confidence of outbreak
                let confidence = 0.5;
                if (region.cases > 400) confidence = 0.95;
                else if (region.cases > 300) confidence = 0.85;
                else if (region.cases > 200) confidence = 0.75;

                // Only predict if confidence is high enough
                if (confidence > 0.7) {
                    predictions.push({
                        id: `pred-${index}-${Date.now()}`, // Unique ID
                        region: region.region,
                        disease: disease,
                        risk_level: region.severity === "critical" ? "Critical" : "High",
                        confidence: confidence,
                        days_ahead: Math.floor(Math.random() * 10) + 3, // 3-13 days
                        contributing_factors: [
                            region.trend === "rising" ? "Rapidly rising case count" : "High baseline infection rate",
                            region.hospital_capacity < 60 ? "Strained hospital capacity" : "High population density",
                            "Seasonal vector proliferation"
                        ]
                    });
                }
            }
        });

        // Sort by urgency
        return predictions.sort((a, b) => {
            const riskOrder = { "Critical": 3, "High": 2, "Medium": 1, "Low": 0 };
            return riskOrder[b.risk_level] - riskOrder[a.risk_level];
        });
    }
}

export const simulationEngine = SimulationEngine.getInstance();
