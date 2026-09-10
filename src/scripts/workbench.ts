/**
 * Multi-agent workbench: publish a goal, route subtasks to Cursor / Coco / 豆包,
 * collect deliverables, and roll them into one summary for the human.
 */

export type AgentId = 'cursor' | 'coco' | 'doubao';
export type TaskStatus = 'queued' | 'working' | 'done' | 'blocked';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  blurb: string;
  accent: string;
}

export interface Subtask {
  id: string;
  agentId: AgentId;
  title: string;
  brief: string;
  status: TaskStatus;
  result: string;
  updatedAt: string;
}

export interface Mission {
  id: string;
  goal: string;
  notes: string;
  createdAt: string;
  status: 'open' | 'summarized';
  subtasks: Subtask[];
  summary: string;
}

export const AGENTS: Agent[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    role: '工程与实现',
    blurb: '写代码、改仓库、开 PR、跑验证。',
    accent: '#1F6FEB',
  },
  {
    id: 'coco',
    name: 'Coco',
    role: '统筹与落地',
    blurb: '拆任务、盯进度、补流程、催决策。',
    accent: '#0F7B6C',
  },
  {
    id: 'doubao',
    name: '豆包',
    role: '调研与表达',
    blurb: '查资料、写文案、中文润色、对外话术。',
    accent: '#C45C26',
  },
];

const STORAGE_KEY = 'botdirectory-multi-agent-workbench-v1';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function loadMissions(): Mission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Mission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMissions(missions: Mission[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
  } catch {
    /* private mode */
  }
}

/** Keyword routing — which agents should take a cut of the goal. */
export function routeAgents(goal: string): AgentId[] {
  const text = goal.toLowerCase();
  const hits = new Set<AgentId>();

  const cursorKeys = [
    '代码',
    '开发',
    '工程',
    'bug',
    '修复',
    'pr',
    '仓库',
    'api',
    '前端',
    '后端',
    '部署',
    '测试',
    '实现',
    'code',
    'build',
    'repo',
    'cursor',
  ];
  const cocoKeys = [
    '安排',
    '统筹',
    '协调',
    '进度',
    '流程',
    '跟进',
    '拆解',
    '计划',
    '落地',
    '催',
    '决策',
    'ops',
    'coco',
  ];
  const doubaoKeys = [
    '文案',
    '调研',
    '研究',
    '翻译',
    '润色',
    '营销',
    '话术',
    '内容',
    '报告',
    '总结',
    '豆包',
    'copy',
    'research',
  ];

  for (const k of cursorKeys) if (text.includes(k)) hits.add('cursor');
  for (const k of cocoKeys) if (text.includes(k)) hits.add('coco');
  for (const k of doubaoKeys) if (text.includes(k)) hits.add('doubao');

  if (hits.size === 0) return ['coco', 'cursor', 'doubao'];
  if (!hits.has('coco') && hits.size === 1) hits.add('coco');
  return AGENTS.map((a) => a.id).filter((id) => hits.has(id));
}

function draftSubtask(agentId: AgentId, goal: string): Pick<Subtask, 'title' | 'brief'> {
  switch (agentId) {
    case 'cursor':
      return {
        title: '实现与落地代码',
        brief: `围绕目标「${goal}」，负责可运行的改动：摸清仓库现状、实现最小可用方案、自测，并准备可审查的产出（diff / PR 说明）。不要替其他 agent 写长文案。`,
      };
    case 'coco':
      return {
        title: '拆解、编排与验收',
        brief: `把目标「${goal}」拆成可执行步骤，标出依赖与风险，跟踪 Cursor / 豆包进度，汇总缺口，并给出需要人类拍板的决策清单。`,
      };
    case 'doubao':
      return {
        title: '调研、表达与对外材料',
        brief: `针对「${goal}」做信息收集与表达：要点调研、中文说明、对用户可见文案或话术草稿。输出要能直接并入总汇报。`,
      };
  }
}

export function buildPrompt(subtask: Subtask, mission: Mission): string {
  const agent = AGENTS.find((a) => a.id === subtask.agentId)!;
  return [
    `你是工作台里的「${agent.name}」（${agent.role}）。`,
    `总目标：${mission.goal}`,
    mission.notes ? `补充说明：${mission.notes}` : null,
    `你的子任务：${subtask.title}`,
    subtask.brief,
    '完成后只交回：1) 结论摘要 2) 具体产出 3) 阻塞/需要人类决定的事。不要做其他 agent 职责内的事。',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function demoResult(agentId: AgentId, goal: string): string {
  switch (agentId) {
    case 'cursor':
      return [
        '结论：已按目标划出实现路径与最小改动面。',
        `产出：针对「${goal}」给出可落地的工程步骤（结构、入口文件、验证命令），并预留 PR 说明草稿。`,
        '阻塞：需要真实仓库权限或 API Key 才能把改动推到远端。',
      ].join('\n');
    case 'coco':
      return [
        '结论：任务已拆成三角色并行，依赖清晰。',
        `产出：① Cursor 负责实现 ② 豆包负责表达材料 ③ 我负责汇总验收「${goal}」。`,
        '决策清单：优先级、截止时间、是否允许自动发消息/发 PR。',
      ].join('\n');
    case 'doubao':
      return [
        '结论：已整理可对外说明的要点。',
        `产出：围绕「${goal}」的背景一句话、三要点、用户可见说明草稿。`,
        '阻塞：若有品牌语气/禁语清单，请补充后我再定稿。',
      ].join('\n');
  }
}

function composeSummary(mission: Mission): string {
  const lines: Array<string | null> = [
    '# 工作台汇总',
    '',
    `目标：${mission.goal}`,
    mission.notes ? `备注：${mission.notes}` : null,
    '',
    '状态概览：',
  ];
  for (const sub of mission.subtasks) {
    const agent = AGENTS.find((a) => a.id === sub.agentId)!;
    lines.push(`- ${agent.name} · ${statusLabel(sub.status)} · ${sub.title}`);
  }
  lines.push('', '各方产出：');
  for (const sub of mission.subtasks) {
    const agent = AGENTS.find((a) => a.id === sub.agentId)!;
    lines.push('', `## ${agent.name}`, sub.result.trim() || '（尚未回填结果）');
  }
  const blocked = mission.subtasks.filter((s) => s.status === 'blocked');
  if (blocked.length) {
    lines.push('', '## 需要你拍板');
    for (const s of blocked) lines.push(`- ${s.title}`);
  }
  lines.push('', `生成时间：${new Date().toLocaleString()}`);
  return lines.filter((l) => l !== null).join('\n');
}

function statusLabel(status: TaskStatus): string {
  return { queued: '排队', working: '进行中', done: '完成', blocked: '受阻' }[status];
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function mountWorkbench(root: HTMLElement): void {
  let missions = loadMissions();
  let activeId: string | null = missions[0]?.id ?? null;

  const shell = el('div', { class: 'wb-shell' });
  const publish = el('section', { class: 'wb-publish', 'aria-label': '发布任务' });
  const board = el('section', { class: 'wb-board', 'aria-label': '智能体泳道' });
  const summary = el('section', { class: 'wb-summary', 'aria-label': '总汇总' });
  const history = el('aside', { class: 'wb-history', 'aria-label': '任务历史' });

  shell.append(publish, board, summary, history);
  root.replaceChildren(shell);

  const goalInput = el('textarea', {
    class: 'wb-input wb-goal',
    rows: '3',
    placeholder: '描述你要完成的事，例如：为新产品落地页写文案，并实现页面与上线检查清单',
  }) as HTMLTextAreaElement;
  const notesInput = el('textarea', {
    class: 'wb-input wb-notes',
    rows: '2',
    placeholder: '可选补充：截止时间、品牌语气、仓库链接、禁止事项…',
  }) as HTMLTextAreaElement;

  const assignRow = el('div', { class: 'wb-assign' });
  const agentChecks = AGENTS.map((agent) => {
    const id = `wb-agent-${agent.id}`;
    const label = el('label', { class: 'wb-check', for: id });
    const input = el('input', {
      type: 'checkbox',
      id,
      value: agent.id,
      checked: 'checked',
    }) as HTMLInputElement;
    label.append(input, document.createTextNode(` ${agent.name} · ${agent.role}`));
    return { agent, input, label };
  });
  for (const c of agentChecks) assignRow.append(c.label);

  const actions = el('div', { class: 'wb-publish-actions' });
  const autoBtn = el('button', {
    type: 'button',
    class: 'wb-btn wb-btn-ghost',
    text: '按关键词自动分派',
  });
  const publishBtn = el('button', {
    type: 'button',
    class: 'wb-btn wb-btn-primary',
    text: '发布到工作台',
  });
  actions.append(autoBtn, publishBtn);

  publish.append(
    el('h2', { class: 'wb-section-title', text: '发布任务' }),
    el('p', {
      class: 'wb-section-lead',
      text: '你只需要在这里下发目标。工作台会拆给 Cursor、Coco、豆包，再把结果汇总回来。',
    }),
    goalInput,
    notesInput,
    assignRow,
    actions,
  );

  autoBtn.addEventListener('click', () => {
    const routed = new Set(routeAgents(goalInput.value.trim() || 'default'));
    for (const c of agentChecks) c.input.checked = routed.has(c.agent.id);
  });

  publishBtn.addEventListener('click', () => {
    const goal = goalInput.value.trim();
    if (!goal) {
      goalInput.focus();
      return;
    }
    const selected = agentChecks.filter((c) => c.input.checked).map((c) => c.agent.id);
    const agentIds = selected.length ? selected : routeAgents(goal);
    const createdAt = nowIso();
    const mission: Mission = {
      id: uid('mission'),
      goal,
      notes: notesInput.value.trim(),
      createdAt,
      status: 'open',
      summary: '',
      subtasks: agentIds.map((agentId) => {
        const draft = draftSubtask(agentId, goal);
        return {
          id: uid('task'),
          agentId,
          title: draft.title,
          brief: draft.brief,
          status: 'queued' as TaskStatus,
          result: '',
          updatedAt: createdAt,
        };
      }),
    };
    missions = [mission, ...missions];
    activeId = mission.id;
    saveMissions(missions);
    goalInput.value = '';
    notesInput.value = '';
    render();
  });

  function activeMission(): Mission | null {
    return missions.find((m) => m.id === activeId) ?? missions[0] ?? null;
  }

  function render(): void {
    const mission = activeMission();
    board.replaceChildren();
    summary.replaceChildren();
    history.replaceChildren();

    history.append(el('h2', { class: 'wb-section-title', text: '任务历史' }));
    if (!missions.length) {
      history.append(el('p', { class: 'wb-empty', text: '还没有任务。发布第一条后会出现在这里。' }));
    } else {
      const list = el('ul', { class: 'wb-history-list' });
      for (const m of missions) {
        const li = el('li', { class: m.id === mission?.id ? 'is-active' : '' });
        const btn = el('button', { type: 'button', class: 'wb-history-item' });
        btn.append(
          el('span', { class: 'wb-history-goal', text: m.goal }),
          el('span', { class: 'wb-history-meta', text: new Date(m.createdAt).toLocaleString() }),
        );
        btn.addEventListener('click', () => {
          activeId = m.id;
          render();
        });
        li.append(btn);
        list.append(li);
      }
      history.append(list);
      const clearBtn = el('button', {
        type: 'button',
        class: 'wb-btn wb-btn-ghost wb-btn-small',
        text: '清空本地历史',
      });
      clearBtn.addEventListener('click', () => {
        if (!confirm('清空本机保存的全部工作台任务？')) return;
        missions = [];
        activeId = null;
        saveMissions(missions);
        render();
      });
      history.append(clearBtn);
    }

    if (!mission) {
      board.append(
        el('div', { class: 'wb-board-empty' }, [
          el('p', { text: '发布一条任务后，这里会出现 Cursor / Coco / 豆包 三条泳道。' }),
        ]),
      );
      summary.append(
        el('h2', { class: 'wb-section-title', text: '总汇总' }),
        el('p', { class: 'wb-empty', text: '各方完成后，这里生成一份给你的总汇报。' }),
      );
      return;
    }

    board.append(
      el('div', { class: 'wb-board-head' }, [
        el('h2', { class: 'wb-section-title', text: '智能体泳道' }),
        el('p', { class: 'wb-mission-goal', text: mission.goal }),
      ]),
    );

    const lanes = el('div', { class: 'wb-lanes' });
    for (const agent of AGENTS) {
      const sub = mission.subtasks.find((s) => s.agentId === agent.id);
      const lane = el('article', {
        class: 'wb-lane',
        style: `--lane-accent: ${agent.accent}`,
      });
      lane.append(
        el('header', { class: 'wb-lane-head' }, [
          el('div', { class: 'wb-lane-identity' }, [
            el('span', { class: 'wb-lane-dot', 'aria-hidden': 'true' }),
            el('strong', { text: agent.name }),
            el('span', { class: 'wb-lane-role', text: agent.role }),
          ]),
          el('p', { class: 'wb-lane-blurb', text: agent.blurb }),
        ]),
      );

      if (!sub) {
        lane.append(el('p', { class: 'wb-empty', text: '本任务未分派给该智能体。' }));
        lanes.append(lane);
        continue;
      }

      lane.append(
        el('div', { class: 'wb-chip', text: statusLabel(sub.status) }),
        el('h3', { class: 'wb-lane-task', text: sub.title }),
        el('p', { class: 'wb-lane-brief', text: sub.brief }),
      );

      const promptBox = el('textarea', {
        class: 'wb-input wb-prompt',
        rows: '5',
        readonly: 'true',
      }) as HTMLTextAreaElement;
      promptBox.value = buildPrompt(sub, mission);

      const resultBox = el('textarea', {
        class: 'wb-input wb-result',
        rows: '6',
        placeholder: '把该智能体的产出粘贴回来，或点「模拟完成」生成示例结果…',
      }) as HTMLTextAreaElement;
      resultBox.value = sub.result;

      const laneActions = el('div', { class: 'wb-lane-actions' });
      const copyBtn = el('button', {
        type: 'button',
        class: 'wb-btn wb-btn-ghost wb-btn-small',
        text: '复制派工提示词',
      });
      const workingBtn = el('button', {
        type: 'button',
        class: 'wb-btn wb-btn-ghost wb-btn-small',
        text: '标为进行中',
      });
      const demoBtn = el('button', {
        type: 'button',
        class: 'wb-btn wb-btn-ghost wb-btn-small',
        text: '模拟完成',
      });
      const saveBtn = el('button', {
        type: 'button',
        class: 'wb-btn wb-btn-primary wb-btn-small',
        text: '回填结果',
      });
      const blockBtn = el('button', {
        type: 'button',
        class: 'wb-btn wb-btn-ghost wb-btn-small',
        text: '标为受阻',
      });

      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(promptBox.value);
          copyBtn.textContent = '已复制';
          setTimeout(() => {
            copyBtn.textContent = '复制派工提示词';
          }, 1200);
        } catch {
          promptBox.select();
        }
      });
      workingBtn.addEventListener('click', () => {
        sub.status = 'working';
        sub.updatedAt = nowIso();
        saveMissions(missions);
        render();
      });
      demoBtn.addEventListener('click', () => {
        sub.status = 'working';
        saveMissions(missions);
        render();
        window.setTimeout(() => {
          const current = missions.find((m) => m.id === mission.id);
          const task = current?.subtasks.find((s) => s.id === sub.id);
          if (!task) return;
          task.result = demoResult(agent.id, mission.goal);
          task.status = 'done';
          task.updatedAt = nowIso();
          saveMissions(missions);
          render();
        }, 700 + Math.random() * 900);
      });
      saveBtn.addEventListener('click', () => {
        sub.result = resultBox.value.trim();
        sub.status = sub.result ? 'done' : 'queued';
        sub.updatedAt = nowIso();
        saveMissions(missions);
        render();
      });
      blockBtn.addEventListener('click', () => {
        sub.result = resultBox.value.trim();
        sub.status = 'blocked';
        sub.updatedAt = nowIso();
        saveMissions(missions);
        render();
      });

      laneActions.append(copyBtn, workingBtn, demoBtn, saveBtn, blockBtn);
      lane.append(
        el('label', { class: 'wb-field-label', text: '派工提示词（粘到对应对话）' }),
        promptBox,
        el('label', { class: 'wb-field-label', text: '回填产出' }),
        resultBox,
        laneActions,
      );
      lanes.append(lane);
    }
    board.append(lanes);

    const doneCount = mission.subtasks.filter((s) => s.status === 'done').length;
    const total = mission.subtasks.length;
    summary.append(
      el('h2', { class: 'wb-section-title', text: '总汇总' }),
      el('p', {
        class: 'wb-section-lead',
        text: `已完成 ${doneCount}/${total} 个子任务。点下方生成给你的总汇报。`,
      }),
    );
    const summaryActions = el('div', { class: 'wb-publish-actions' });
    const genBtn = el('button', { type: 'button', class: 'wb-btn wb-btn-primary', text: '生成总汇报' });
    const copySummaryBtn = el('button', {
      type: 'button',
      class: 'wb-btn wb-btn-ghost',
      text: '复制总汇报',
    });
    summaryActions.append(genBtn, copySummaryBtn);
    const summaryOut = el('textarea', {
      class: 'wb-input wb-summary-out',
      rows: '14',
      placeholder: '汇总会显示在这里…',
    }) as HTMLTextAreaElement;
    summaryOut.value = mission.summary;
    genBtn.addEventListener('click', () => {
      mission.summary = composeSummary(mission);
      mission.status = 'summarized';
      saveMissions(missions);
      summaryOut.value = mission.summary;
    });
    copySummaryBtn.addEventListener('click', async () => {
      if (!summaryOut.value.trim()) {
        mission.summary = composeSummary(mission);
        summaryOut.value = mission.summary;
        saveMissions(missions);
      }
      try {
        await navigator.clipboard.writeText(summaryOut.value);
        copySummaryBtn.textContent = '已复制';
        setTimeout(() => {
          copySummaryBtn.textContent = '复制总汇报';
        }, 1200);
      } catch {
        summaryOut.select();
      }
    });
    summary.append(summaryActions, summaryOut);
  }

  render();
}
