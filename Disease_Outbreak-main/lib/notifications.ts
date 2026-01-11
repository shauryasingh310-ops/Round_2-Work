// Browser notification system

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

class NotificationService {
  private permission: NotificationPermission = "default";

  constructor() {
    if (typeof window !== "undefined" && "Notification" in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    if (this.permission === "default") {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  async show(options: NotificationOptions): Promise<void> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("Notifications not supported");
      return;
    }

    if (this.permission === "default") {
      this.permission = await this.requestPermission();
    }

    if (this.permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || "/icon.png",
        badge: options.badge || "/icon.png",
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        data: options.data,
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }

  showRiskAlert(state: string, riskLevel: "High" | "Critical", riskScore: number): void {
    this.show({
      title: `🚨 ${riskLevel} Risk Alert: ${state}`,
      body: `Disease outbreak risk has reached ${riskLevel} level (${riskScore}%). Immediate attention recommended.`,
      tag: `risk_alert_${state}`,
      requireInteraction: true,
      data: { type: "risk_alert", state, riskLevel },
    });
  }

  showNewReport(reportId: string, region: string): void {
    this.show({
      title: "📋 New Community Report",
      body: `A new report has been submitted for ${region}. Click to view details.`,
      tag: `report_${reportId}`,
      data: { type: "report", reportId, region },
    });
  }

  showWaterQualityAlert(region: string, source: string): void {
    this.show({
      title: "💧 Water Quality Alert",
      body: `Critical contamination detected in ${source}, ${region}. Boil water advisory issued.`,
      tag: `water_alert_${region}`,
      requireInteraction: true,
      data: { type: "water_alert", region, source },
    });
  }
}

export const notificationService = new NotificationService();

