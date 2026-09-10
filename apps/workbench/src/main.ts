import './styles.css';
import { mountWorkbench } from './workbench';
import { mountSyncBar } from './sync-ui';
import { loadAuth, getApiBase, pushMissions } from './sync';

const page = document.querySelector('.wb-page');
const root = document.querySelector('[data-wb-root]');
if (!(root instanceof HTMLElement) || !(page instanceof HTMLElement)) {
  throw new Error('Workbench root missing');
}

const syncHost = document.createElement('div');
syncHost.className = 'wb-sync-host';
const main = page.querySelector('.wb-main');
if (main) {
  const hero = main.querySelector('.wb-hero');
  if (hero) hero.insertAdjacentElement('afterend', syncHost);
  else main.prepend(syncHost);
}

let pushTimer: number | undefined;

const wb = mountWorkbench(root, {
  onChange(missions) {
    if (!loadAuth() || !getApiBase()) return;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => {
      pushMissions(missions).catch(() => {
        /* offline / conflict — user can tap 立即同步 */
      });
    }, 800);
  },
});

mountSyncBar(syncHost, {
  onMissionsChanged: () => wb.reload(),
});
