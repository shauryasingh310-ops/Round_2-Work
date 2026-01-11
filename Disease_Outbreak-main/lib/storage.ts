// LocalStorage-based data persistence utilities

export interface StoredReport {
  id: string;
  type: "symptom" | "water" | "sanitation";
  date: string;
  region: string;
  description: string;
  status: "pending" | "verified" | "resolved";
  verified_by?: string;
  responses: number;
  anonymous: boolean;
  createdAt: number;
  location?: { lat: number; lng: number };
}

export interface UserPreferences {
  favoriteLocations: string[];
  alertThresholds: {
    riskLevel: "Low" | "Medium" | "High" | "Critical";
    enabled: boolean;
  }[];
  notificationsEnabled: boolean;
  theme: "light" | "dark" | "auto";
  selectedState?: string;
  language?: string;
}

export interface HistoricalData {
  date: string;
  state: string;
  riskScore: number;
  cases: number;
  environmentalFactors: {
    temp: number;
    humidity: number;
    pm25: number;
    waterQuality: string;
  };
}

const STORAGE_KEYS = {
  REPORTS: "epiguard_reports",
  PREFERENCES: "epiguard_preferences",
  HISTORICAL_DATA: "epiguard_historical",
  ALERTS: "epiguard_alerts",
  CACHE: "epiguard_cache",
} as const;

// Reports Storage
export const reportStorage = {
  getAll: (): StoredReport[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save: (report: Omit<StoredReport, "id" | "createdAt">): StoredReport => {
    const reports = reportStorage.getAll();
    const newReport: StoredReport = {
      ...report,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    reports.push(newReport);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    return newReport;
  },

  update: (id: string, updates: Partial<StoredReport>): StoredReport | null => {
    const reports = reportStorage.getAll();
    const index = reports.findIndex((r) => r.id === id);
    if (index === -1) return null;
    reports[index] = { ...reports[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    return reports[index];
  },

  delete: (id: string): boolean => {
    const reports = reportStorage.getAll();
    const filtered = reports.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered));
    return filtered.length < reports.length;
  },

  findByRegion: (region: string): StoredReport[] => {
    return reportStorage.getAll().filter((r) => r.region === region);
  },
};

// User Preferences Storage
export const preferencesStorage = {
  get: (): UserPreferences => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      favoriteLocations: [],
      alertThresholds: [
        { riskLevel: "Critical", enabled: true },
        { riskLevel: "High", enabled: true },
        { riskLevel: "Medium", enabled: false },
        { riskLevel: "Low", enabled: false },
      ],
      notificationsEnabled: true,
      theme: "dark",
      language: "en",
    };
  },

  save: (preferences: Partial<UserPreferences>): UserPreferences => {
    const current = preferencesStorage.get();
    const updated = { ...current, ...preferences };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    return updated;
  },

  addFavoriteLocation: (location: string): void => {
    const prefs = preferencesStorage.get();
    if (!prefs.favoriteLocations.includes(location)) {
      prefs.favoriteLocations.push(location);
      preferencesStorage.save(prefs);
    }
  },

  removeFavoriteLocation: (location: string): void => {
    const prefs = preferencesStorage.get();
    prefs.favoriteLocations = prefs.favoriteLocations.filter((l) => l !== location);
    preferencesStorage.save(prefs);
  },
};

// Historical Data Storage
export const historicalStorage = {
  save: (data: HistoricalData): void => {
    try {
      const existing = historicalStorage.getAll();
      existing.push(data);
      // Keep only last 365 days
      const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const filtered = existing.filter((d) => new Date(d.date).getTime() > cutoff);
      localStorage.setItem(STORAGE_KEYS.HISTORICAL_DATA, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to save historical data:", error);
    }
  },

  getAll: (): HistoricalData[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORICAL_DATA);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getByState: (state: string): HistoricalData[] => {
    return historicalStorage.getAll().filter((d) => d.state === state);
  },

  getTrend: (state: string, days: number = 30): HistoricalData[] => {
    const all = historicalStorage.getByState(state);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return all.filter((d) => new Date(d.date).getTime() > cutoff).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  },
};

// Cache Management
export const cacheStorage = {
  set: (key: string, data: any, ttl: number = 5 * 60 * 1000): void => {
    const item = {
      data,
      expires: Date.now() + ttl,
    };
    try {
      const cache = cacheStorage.getAll();
      cache[key] = item;
      localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error("Cache set error:", error);
    }
  },

  get: (key: string): any | null => {
    try {
      const cache = cacheStorage.getAll();
      const item = cache[key];
      if (!item) return null;
      if (Date.now() > item.expires) {
        delete cache[key];
        localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
        return null;
      }
      return item.data;
    } catch {
      return null;
    }
  },

  getAll: (): Record<string, { data: any; expires: number }> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CACHE);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CACHE);
  },
};

// Duplicate Detection
export const detectDuplicateReport = (newReport: {
  type: string;
  region: string;
  description: string;
}): StoredReport | null => {
  const reports = reportStorage.getAll();
  const recentReports = reports.filter(
    (r) => Date.now() - r.createdAt < 24 * 60 * 60 * 1000 // Last 24 hours
  );

  return (
    recentReports.find(
      (r) =>
        r.type === newReport.type &&
        r.region === newReport.region &&
        r.description.toLowerCase().trim() === newReport.description.toLowerCase().trim()
    ) || null
  );
};

// Spam Detection (simple keyword-based)
export const detectSpam = (description: string): boolean => {
  const spamKeywords = [
    "buy now",
    "click here",
    "free money",
    "urgent",
    "limited time",
    "act now",
    "guaranteed",
  ];
  const lowerDesc = description.toLowerCase();
  return spamKeywords.some((keyword) => lowerDesc.includes(keyword));
};

