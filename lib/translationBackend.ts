import type { BackendModule } from 'i18next';

type Loaders = Record<string, () => Promise<Record<string, unknown>>>;

/** A broken or stalled locale request must never leave the app blank. */
export function createTranslationBackend(loaders: Loaders, timeoutMs = 4000): BackendModule {
  return {
    type: 'backend',
    init() {},
    read(language, namespace, callback) {
      const loader = loaders[`../locales/${language}/${namespace}.json`];
      if (!loader) {
        callback(new Error(`Unknown translation: ${language}/${namespace}`), false);
        return;
      }

      let settled = false;
      const finish = (error: Error | null, data?: Record<string, unknown>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // false disables backend retries; i18next can use the English fallback.
        callback(error, data ?? false);
      };
      const timer = setTimeout(
        () => finish(new Error('Translation download timed out')),
        timeoutMs
      );
      Promise.resolve()
        .then(loader)
        .then(
          (data) => finish(null, data),
          (error) => finish(error instanceof Error ? error : new Error(String(error)))
        );
    },
  };
}
