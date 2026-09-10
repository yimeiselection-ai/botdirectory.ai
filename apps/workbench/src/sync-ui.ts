import {
  getApiBase,
  setApiBase,
  loadAuth,
  login,
  signup,
  logout,
  pullMissions,
  pushMissions,
  mergeMissions,
} from './sync';
import { getStoredMissions, setStoredMissions, type Mission } from './workbench';

export function mountSyncBar(
  host: HTMLElement,
  opts: { onMissionsChanged: () => void },
): void {
  const box = document.createElement('section');
  box.className = 'wb-sync';
  box.setAttribute('aria-label', '云端同步');
  host.replaceChildren(box);

  let busy = false;
  let message = '';

  function setMsg(text: string): void {
    message = text;
    render();
  }

  async function withBusy(fn: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true;
    render();
    try {
      await fn();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '操作失败');
    } finally {
      busy = false;
      render();
    }
  }

  function render(): void {
    const auth = loadAuth();
    const apiBase = getApiBase();
    box.replaceChildren();

    const title = document.createElement('h2');
    title.className = 'wb-section-title';
    title.textContent = '云端账号同步';
    box.append(title);

    const lead = document.createElement('p');
    lead.className = 'wb-section-lead';
    lead.textContent = auth
      ? `已登录：${auth.user.email}。电脑和手机用同一账号即可同步任务。`
      : '注册 / 登录后，电脑与手机共用同一份任务（Cloudflare 免费额度，无需自购服务器）。';
    box.append(lead);

    const apiRow = document.createElement('div');
    apiRow.className = 'wb-sync-row';
    const apiInput = document.createElement('input');
    apiInput.className = 'wb-input wb-sync-api';
    apiInput.placeholder = '同步服务地址，例如 https://workbench-sync.xxx.workers.dev';
    apiInput.value = apiBase;
    apiInput.setAttribute('aria-label', '同步服务地址');
    const saveApi = document.createElement('button');
    saveApi.type = 'button';
    saveApi.className = 'wb-btn wb-btn-ghost wb-btn-small';
    saveApi.textContent = '保存地址';
    saveApi.addEventListener('click', () => {
      setApiBase(apiInput.value.trim());
      setMsg('已保存同步服务地址');
    });
    apiRow.append(apiInput, saveApi);
    box.append(apiRow);

    if (!auth) {
      const email = document.createElement('input');
      email.className = 'wb-input';
      email.type = 'email';
      email.placeholder = '邮箱';
      email.autocomplete = 'username';
      const password = document.createElement('input');
      password.className = 'wb-input';
      password.type = 'password';
      password.placeholder = '密码（至少 8 位）';
      password.autocomplete = 'current-password';
      const actions = document.createElement('div');
      actions.className = 'wb-publish-actions';
      const loginBtn = document.createElement('button');
      loginBtn.type = 'button';
      loginBtn.className = 'wb-btn wb-btn-primary';
      loginBtn.textContent = busy ? '处理中…' : '登录';
      loginBtn.disabled = busy;
      loginBtn.addEventListener('click', () =>
        withBusy(async () => {
          await login(email.value.trim(), password.value);
          setMsg('登录成功');
          await syncNow(true);
        }),
      );
      const signupBtn = document.createElement('button');
      signupBtn.type = 'button';
      signupBtn.className = 'wb-btn wb-btn-ghost';
      signupBtn.textContent = '注册';
      signupBtn.disabled = busy;
      signupBtn.addEventListener('click', () =>
        withBusy(async () => {
          await signup(email.value.trim(), password.value);
          setMsg('注册成功');
          await syncNow(true);
        }),
      );
      actions.append(loginBtn, signupBtn);
      box.append(email, password, actions);
    } else {
      const actions = document.createElement('div');
      actions.className = 'wb-publish-actions';
      const pullBtn = document.createElement('button');
      pullBtn.type = 'button';
      pullBtn.className = 'wb-btn wb-btn-primary';
      pullBtn.textContent = busy ? '同步中…' : '立即同步';
      pullBtn.disabled = busy;
      pullBtn.addEventListener('click', () => withBusy(async () => syncNow(false)));
      const logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.className = 'wb-btn wb-btn-ghost';
      logoutBtn.textContent = '退出登录';
      logoutBtn.disabled = busy;
      logoutBtn.addEventListener('click', () =>
        withBusy(async () => {
          await logout();
          setMsg('已退出登录');
        }),
      );
      actions.append(pullBtn, logoutBtn);
      box.append(actions);
    }

    if (message) {
      const msg = document.createElement('p');
      msg.className = 'wb-sync-msg';
      msg.textContent = message;
      box.append(msg);
    }
  }

  async function syncNow(afterLogin: boolean): Promise<void> {
    const local = getStoredMissions();
    const cloud = await pullMissions();
    let merged: Mission[];
    if (!cloud.missions.length) {
      merged = local;
      if (local.length) await pushMissions(local);
      setMsg(afterLogin ? '已登录，本地任务已上传云端' : '云端为空，已上传本地任务');
    } else if (!local.length) {
      merged = cloud.missions;
      setStoredMissions(merged);
      setMsg('已从云端拉取任务');
    } else {
      merged = mergeMissions(local, cloud.missions);
      setStoredMissions(merged);
      await pushMissions(merged);
      setMsg('已合并本地与云端，并写回云端');
    }
    opts.onMissionsChanged();
  }

  render();

  // Auto-sync once when already logged in.
  if (loadAuth() && getApiBase()) {
    withBusy(async () => syncNow(false)).catch(() => undefined);
  }
}
