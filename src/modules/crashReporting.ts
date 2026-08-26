type CrashlyticsLike = {
  (): {
    setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<void> | void;
    log: (message: string) => void;
    recordError: (error: Error) => void;
    setUserId: (userId: string) => Promise<void> | void;
  };
};

function getCrashlytics(): CrashlyticsLike['prototype'] | null {
  try {
    // Lazy require so missing/unconfigured Firebase does not crash module import.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crashlytics = require('@react-native-firebase/crashlytics')
      .default as CrashlyticsLike;
    return crashlytics();
  } catch {
    return null;
  }
}

export async function initCrashReporting(): Promise<void> {
  try {
    const instance = getCrashlytics();
    if (!instance) {
      return;
    }
    await instance.setCrashlyticsCollectionEnabled(true);
  } catch {
    // no-op without a real Firebase project
  }
}

export function log(message: string): void {
  try {
    getCrashlytics()?.log(message);
  } catch {
    if (__DEV__) {
      console.log('[crashReporting]', message);
    }
  }
}

export function recordError(error: unknown, context?: string): void {
  try {
    const instance = getCrashlytics();
    if (!instance) {
      if (__DEV__) {
        console.warn('[crashReporting] recordError', context, error);
      }
      return;
    }
    const err =
      error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : JSON.stringify(error));
    if (context) {
      instance.log(context);
    }
    instance.recordError(err);
  } catch {
    if (__DEV__) {
      console.warn('[crashReporting] recordError', context, error);
    }
  }
}

export function setUserId(userId: string | null): void {
  try {
    void getCrashlytics()?.setUserId(userId ?? '');
  } catch {
    // ignore
  }
}
