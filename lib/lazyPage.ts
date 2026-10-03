import { lazy, type ComponentType } from 'react';
import i18n from './i18n';
import { loadPublicStyles, loadWorkspaceStyles } from './pageStyles';

/** Start page code and translations together; stalled chunks must offer recovery. */
export function lazyPage<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>, namespaces: string[] = [],
  loadStyles: () => Promise<unknown> = loadPublicStyles,
) {
  let pending: Promise<{ default: T }> | undefined;
  const preload = () => pending ??= new Promise<{ default: T }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Page download timed out. Please reload to try again.')), 15_000);
    Promise.all([load(), i18n.loadNamespaces(namespaces), loadStyles()])
      .then(([module]) => resolve(module), reject)
      .finally(() => clearTimeout(timer));
  });
  return Object.assign(lazy(preload), { preload });
}

/** Protected screens retain the complete utility sheet, including nested tools. */
export function lazyWorkspacePage<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>, namespaces: string[] = [],
) {
  return lazyPage(load, namespaces, loadWorkspaceStyles);
}
