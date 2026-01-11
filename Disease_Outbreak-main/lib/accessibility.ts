// Accessibility utilities

export const getAriaLabel = (component: string, context?: string): string => {
  const labels: Record<string, string> = {
    "risk-meter": `Risk level indicator${context ? ` for ${context}` : ""}`,
    "water-source": `Water quality information${context ? ` for ${context}` : ""}`,
    "hospital-card": `Hospital capacity and availability${context ? ` in ${context}` : ""}`,
    "report-card": `Community report details${context ? ` from ${context}` : ""}`,
    "prediction-card": `Disease outbreak prediction${context ? ` for ${context}` : ""}`,
    "chart": `Data visualization${context ? ` showing ${context}` : ""}`,
    "navigation": "Main navigation menu",
    "sidebar": "Sidebar navigation",
    "filter": "Filter options",
    "export-button": "Export data",
    "notification-button": "Notification settings",
  };
  return labels[component] || component;
};

export const getRole = (component: string): string => {
  const roles: Record<string, string> = {
    "risk-meter": "progressbar",
    "water-source": "article",
    "hospital-card": "article",
    "report-card": "article",
    "prediction-card": "article",
    "chart": "img",
    "navigation": "navigation",
    "sidebar": "complementary",
    "filter": "search",
    "export-button": "button",
    "notification-button": "button",
  };
  return roles[component] || "region";
};

// Keyboard navigation helpers
export const handleKeyDown = (
  event: React.KeyboardEvent,
  actions: {
    Enter?: () => void;
    Escape?: () => void;
    ArrowUp?: () => void;
    ArrowDown?: () => void;
    ArrowLeft?: () => void;
    ArrowRight?: () => void;
    Tab?: () => void;
  }
): void => {
  switch (event.key) {
    case "Enter":
      actions.Enter?.();
      break;
    case "Escape":
      actions.Escape?.();
      break;
    case "ArrowUp":
      event.preventDefault();
      actions.ArrowUp?.();
      break;
    case "ArrowDown":
      event.preventDefault();
      actions.ArrowDown?.();
      break;
    case "ArrowLeft":
      event.preventDefault();
      actions.ArrowLeft?.();
      break;
    case "ArrowRight":
      event.preventDefault();
      actions.ArrowRight?.();
      break;
    case "Tab":
      actions.Tab?.();
      break;
  }
};

// Focus management
export const trapFocus = (element: HTMLElement): (() => void) => {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener("keydown", handleTabKey);
  firstElement?.focus();

  return () => {
    element.removeEventListener("keydown", handleTabKey);
  };
};

// Screen reader announcements
export const announceToScreenReader = (message: string, priority: "polite" | "assertive" = "polite"): void => {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

