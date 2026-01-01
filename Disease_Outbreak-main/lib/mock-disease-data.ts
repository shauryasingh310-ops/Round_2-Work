// Centralized logical mock data for all analytics, dashboard, and prediction pages
// This data is used for all static/mock displays across the app

export const MOCK_DISEASE_DATA = [
  { state: "Delhi", disease: "Cholera", cases: 120, deaths: 2, risk: 0.82 },
  { state: "Maharashtra", disease: "Dengue", cases: 340, deaths: 8, risk: 0.67 },
  { state: "Uttar Pradesh", disease: "Typhoid", cases: 210, deaths: 4, risk: 0.54 },
  { state: "Assam", disease: "Hepatitis A", cases: 95, deaths: 1, risk: 0.48 },
  { state: "Meghalaya", disease: "Cholera", cases: 60, deaths: 0, risk: 0.41 },
  { state: "West Bengal", disease: "Dengue", cases: 180, deaths: 3, risk: 0.59 },
  { state: "Kerala", disease: "Leptospirosis", cases: 75, deaths: 1, risk: 0.36 },
  { state: "Bihar", disease: "Typhoid", cases: 130, deaths: 2, risk: 0.44 },
  { state: "Punjab", disease: "Cholera", cases: 55, deaths: 0, risk: 0.29 },
  { state: "Karnataka", disease: "Dengue", cases: 110, deaths: 1, risk: 0.38 },
];

export const MOCK_DEMOGRAPHIC_DATA = [
  { age_group: "0-5 years", cases: 90, severity: 32 },
  { age_group: "6-12 years", cases: 70, severity: 28 },
  { age_group: "13-18 years", cases: 55, severity: 19 },
  { age_group: "19-35 years", cases: 110, severity: 22 },
  { age_group: "36-60 years", cases: 140, severity: 31 },
  { age_group: "60+ years", cases: 80, severity: 37 },
];

export const MOCK_SEASONAL_INSIGHTS = [
  { season: "Monsoon (Jun-Sep)", prediction: "Peak outbreak period", cases_avg: 210, recommendation: "Enhanced water monitoring, pre-positioned resources" },
  { season: "Post-Monsoon (Oct-Nov)", prediction: "Declining trend begins", cases_avg: 140, recommendation: "Maintain surveillance, continue preventive measures" },
  { season: "Winter (Dec-Feb)", prediction: "Low-risk period", cases_avg: 65, recommendation: "Focus on preparedness for next monsoon" },
  { season: "Summer (Mar-May)", prediction: "Gradual increase", cases_avg: 120, recommendation: "Pre-monsoon water quality checks intensify" },
];

export const MOCK_VULNERABLE_DEMOGRAPHICS = [
  { group: "Children under 5", risk: "Critical", percentage: 28, recommendations: "Vaccination drives, safe water access, hygiene training" },
  { group: "Elderly (60+ years)", risk: "High", percentage: 21, recommendations: "Medical monitoring, nutrition support, home care" },
  { group: "Rural remote areas", risk: "High", percentage: 19, recommendations: "Mobile health camps, water infrastructure, education" },
];
