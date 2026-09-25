import { lazy, type ComponentType } from 'react';
import i18n from './i18n';

/** Start page code and translations together; stalled chunks must offer recovery. */
export function lazyPage<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>, namespaces: string[] = [],
) {
  let pending: Promise<{ default: T }> | undefined;
  const preload = () => pending ??= new Promise<{ default: T }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Page download timed out. Please reload to try again.')), 15_000);
    Promise.all([load(), i18n.loadNamespaces(namespaces)])
      .then(([module]) => resolve(module), reject)
      .finally(() => clearTimeout(timer));
  });
  return Object.assign(lazy(preload), { preload });
}
