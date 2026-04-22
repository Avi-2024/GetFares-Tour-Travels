import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { settingsApi } from "../api/settings";
import { useAuth } from "./AuthContext";
import {
  DATE_TIME_PREFERENCES_STORAGE_KEY,
  DEFAULT_DATE_TIME_PREFERENCES,
  formatDateTimeWithPreferences,
  formatDateWithPreferences,
  getBrowserTimeZone,
  loadDateTimePreferencesFromStorage,
  normalizeDateTimePreferences,
  parseApiDateTime,
  saveDateTimePreferencesToStorage,
  type DateTimePreferences,
} from "../utils/dateTimePreferences";

const DATE_TIME_PREFERENCES_UPDATED_EVENT =
  "crm:datetime-preferences:updated";

type DateTimePreferencesContextValue = {
  preferences: DateTimePreferences;
  updatePreferences: (next: Partial<DateTimePreferences>) => void;
  refreshPreferences: () => Promise<void>;
  parseApiDateTime: (value: unknown) => Date | null;
  formatDate: (value: unknown, fallback?: string) => string;
  formatDateTime: (
    value: unknown,
    fallback?: string,
    timeZoneOverride?: string | null,
  ) => string;
};

const DateTimePreferencesContext =
  createContext<DateTimePreferencesContextValue | null>(null);

function extractObject<T extends object>(response: unknown): T | null {
  if (!response || typeof response !== "object") return null;
  const payload = response as { data?: unknown };
  if (payload.data && typeof payload.data === "object") {
    return payload.data as T;
  }
  return response as T;
}

function toDateTimePreferencePatch(value: unknown): Partial<DateTimePreferences> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    timezone:
      typeof record.timezone === "string" ? record.timezone : undefined,
    locale: typeof record.locale === "string" ? record.locale : undefined,
    dateFormat:
      typeof record.dateFormat === "string" ? record.dateFormat : undefined,
  };
}

export const DateTimePreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<DateTimePreferences>(
    DEFAULT_DATE_TIME_PREFERENCES,
  );

  const applyPreferences = useCallback(
    (patch: Partial<DateTimePreferences>, persist = true) => {
      setPreferences((prev) => {
        const next = normalizeDateTimePreferences({
          ...prev,
          ...patch,
        });
        if (persist) {
          saveDateTimePreferencesToStorage(next);
        }
        return next;
      });
    },
    [],
  );

  const updatePreferences = useCallback(
    (patch: Partial<DateTimePreferences>) => {
      applyPreferences(patch, true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(DATE_TIME_PREFERENCES_UPDATED_EVENT));
      }
    },
    [applyPreferences],
  );

  const refreshPreferences = useCallback(async () => {
    if (!token) return;
    try {
      const response = await settingsApi.getSystemPreferences();
      const patch = toDateTimePreferencePatch(extractObject(response));
      applyPreferences(
        normalizeDateTimePreferences({
          ...patch,
          timezone: getBrowserTimeZone(),
        }),
        true,
      );
    } catch {
      try {
        const response = await settingsApi.getSystem();
        const patch = toDateTimePreferencePatch(extractObject(response));
        applyPreferences(
          normalizeDateTimePreferences({
            ...patch,
            timezone: getBrowserTimeZone(),
          }),
          true,
        );
      } catch {
        // Keep local/browser defaults.
      }
    }
  }, [applyPreferences, token]);

  useEffect(() => {
    const stored = loadDateTimePreferencesFromStorage();
    if (stored) {
      setPreferences(stored);
    }
  }, []);

  useEffect(() => {
    void refreshPreferences();
  }, [refreshPreferences]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== DATE_TIME_PREFERENCES_STORAGE_KEY) return;
      const stored = loadDateTimePreferencesFromStorage();
      if (stored) {
        setPreferences(stored);
      }
    };
    const onUpdated = () => {
      const stored = loadDateTimePreferencesFromStorage();
      if (stored) {
        setPreferences(stored);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DATE_TIME_PREFERENCES_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DATE_TIME_PREFERENCES_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const value = useMemo<DateTimePreferencesContextValue>(
    () => ({
      preferences,
      updatePreferences,
      refreshPreferences,
      parseApiDateTime,
      formatDate: (input, fallback = "N/A") =>
        formatDateWithPreferences(input, preferences, fallback),
      formatDateTime: (input, fallback = "N/A", timeZoneOverride?: string | null) =>
        formatDateTimeWithPreferences(
          input,
          preferences,
          fallback,
          timeZoneOverride,
        ),
    }),
    [preferences, refreshPreferences, updatePreferences],
  );

  return (
    <DateTimePreferencesContext.Provider value={value}>
      {children}
    </DateTimePreferencesContext.Provider>
  );
};

export const useDateTimePreferences = () => {
  const context = useContext(DateTimePreferencesContext);
  if (!context) {
    throw new Error(
      "useDateTimePreferences must be used within a DateTimePreferencesProvider.",
    );
  }
  return context;
};
