import Phaser from 'phaser';
import type { ChapterId } from '../data/storyKitten';
import {
  readChapterProgress,
  resetStoryProgress,
} from '../data/storyKitten';
import {
  SCENARIO_META,
  SCENARIOS_IN_ORDER,
  readBestScore,
  type ScenarioId,
} from '../data/scenarios';
import type { Difficulty } from '../data/sentences';
import { useRunStore } from '../store/runStore';
import { audio } from '../audio/AudioManager';
import { applyStyle } from '../ui/domUtil';
import { StoryMapView } from '../ui/StoryMapView';
import { BottomNav, type BottomNavTab } from '../ui/BottomNav';
import { NodeActivitySheet } from '../ui/NodeActivitySheet';
import { readXp, levelProgress } from '../data/xp';
import { readStreak } from '../data/streak';
import { evaluateAchievements, countUnlocked } from '../data/achievements';

const COLOR_BG = '#fef8ed';
const COLOR_AMBER = '#e7a44a';
const COLOR_AMBER_DARK = '#b07a2a';
const COLOR_NODE_DARK = '#7a5b3a';
const COLOR_BORDER = '#ead9bb';
const COLOR_BORDER_DARK = '#d4c098';
const COLOR_TEXT_DARK = '#3c2a1c';
const COLOR_TEXT_MUTED = '#7a6850';
const COLOR_DANGER = '#8b4530';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/**
 * StoryModeScene — v1.7.5 4-tab single-page host.
 *
 * Tab structure (per user 2026-05-26):
 *   - Home    → the story map (with sitting cat)
 *   - Tasks   → Free Practice + Scenarios (combined "challenges" home)
 *   - Profile → Stats + Difficulty + Audio + Reset + About (everything
 *               that used to be Stats + Settings)
 *   - Alerts  → placeholder for v1.8+ streak / new-chapter notifications
 */
export class StoryModeScene extends Phaser.Scene {
  private currentTab: BottomNavTab = 'home';
  private mapView?: StoryMapView;
  private panelEl?: HTMLDivElement;
  private nav?: BottomNav;

  constructor() {
    super({ key: 'StoryModeScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);

    this.nav = new BottomNav('home', {
      onTab: (tab) => this.switchTab(tab),
    });

    this.switchTab('home');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private cleanup(): void {
    this.mapView?.destroy();
    this.mapView = undefined;
    this.panelEl?.remove();
    this.panelEl = undefined;
    this.nav?.destroy();
    this.nav = undefined;
    this.activitySheet?.dismiss();
    this.activitySheet = undefined;
  }

  private activitySheet?: NodeActivitySheet;

  private openActivitySheet(chapter: ChapterId): void {
    this.activitySheet?.dismiss();
    const startChapter = (listening: boolean) => {
      const store = useRunStore.getState();
      store.setMode('story');
      store.setChapter(chapter);
      store.setScenario(null);
      store.setLevel('A2');
      store.setListeningMode(listening);
      this.cleanup();
      this.scene.start('ChapterIntroScene');
    };
    this.activitySheet = new NodeActivitySheet({
      sectionLabel: `Section 1 · Chapter ${chapter}`,
      questionLabel: 'Story practice — pick a mode',
      onListening: () => startChapter(true),
      onReading: () => startChapter(false),
      onDismiss: () => { this.activitySheet = undefined; },
    });
  }

  // ─── Tab routing ──────────────────────────────────────────────────────

  private switchTab(tab: BottomNavTab): void {
    if (tab === this.currentTab && (this.mapView || this.panelEl)) return;
    this.currentTab = tab;
    this.nav?.setActive(tab);

    this.mapView?.destroy();
    this.mapView = undefined;
    this.panelEl?.remove();
    this.panelEl = undefined;

    switch (tab) {
      case 'home':
        this.mapView = new StoryMapView({
          onPlayChapter: (chapter: ChapterId) => {
            // v1.7.11: tapping a node no longer goes straight into the
            // chapter. We open the listening/reading sheet first.
            this.openActivitySheet(chapter);
          },
        });
        break;
      case 'tasks':
        this.panelEl = this.buildTasksPanel();
        document.body.appendChild(this.panelEl);
        break;
      case 'profile':
        this.panelEl = this.buildProfilePanel();
        document.body.appendChild(this.panelEl);
        break;
      case 'alerts':
        this.panelEl = this.buildAlertsPanel();
        document.body.appendChild(this.panelEl);
        break;
    }
  }

  // ─── Panel shell ──────────────────────────────────────────────────────

  private makePanelShell(titleEn: string, subtitle?: string): HTMLDivElement {
    const root = document.createElement('div');
    applyStyle(root, {
      position: 'fixed',
      inset: '0',
      background: COLOR_BG,
      zIndex: '20',
      paddingTop: 'max(28px, env(safe-area-inset-top))',
      paddingBottom: '110px',
      overflowY: 'auto',
      fontFamily: '"Nunito", "Noto Sans TC", system-ui, sans-serif',
      color: COLOR_TEXT_DARK,
    });

    const wrap = document.createElement('div');
    wrap.dataset.panelContent = '1';
    applyStyle(wrap, {
      width: 'min(420px, calc(100vw - 32px))',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    });

    const title = document.createElement('h1');
    title.textContent = titleEn;
    applyStyle(title, {
      fontSize: '26px',
      fontWeight: '900',
      color: COLOR_AMBER_DARK,
      margin: '0',
      letterSpacing: '-0.4px',
    });
    wrap.appendChild(title);

    if (subtitle) {
      const sub = document.createElement('div');
      sub.textContent = subtitle;
      applyStyle(sub, {
        fontSize: '13px',
        fontWeight: '600',
        color: COLOR_TEXT_MUTED,
        marginTop: '-6px',
      });
      wrap.appendChild(sub);
    }

    root.appendChild(wrap);
    return root;
  }

  private getPanelContentRoot(panel: HTMLDivElement): HTMLDivElement {
    return panel.querySelector<HTMLDivElement>('[data-panel-content]')!;
  }

  private makeSectionHeader(text: string): HTMLDivElement {
    const div = document.createElement('div');
    div.textContent = text;
    applyStyle(div, {
      fontSize: '11px',
      fontWeight: '800',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      color: COLOR_TEXT_MUTED,
      marginTop: '8px',
      marginBottom: '-6px',
    });
    return div;
  }

  // ─── Tasks tab (Free + Scenes merged) ────────────────────────────────

  private buildTasksPanel(): HTMLDivElement {
    const panel = this.makePanelShell(
      'Tasks',
      'Bite-sized practice outside the story'
    );
    const content = this.getPanelContentRoot(panel);

    // v1.9.6: Daily challenge banner — show streak + encourage daily play
    const dailyCard = document.createElement('div');
    const streakCount = readStreak();
    applyStyle(dailyCard, {
      background: `linear-gradient(135deg, ${COLOR_AMBER} 0%, #d4823a 100%)`,
      borderRadius: '18px',
      padding: '14px 16px',
      color: '#ffffff',
      boxShadow: `0 4px 0 ${COLOR_AMBER_DARK}, 0 10px 16px -3px rgba(60, 42, 28, 0.22)`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    });
    dailyCard.innerHTML = `
      <div style="font-size:30px;line-height:1;">🔥</div>
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;opacity:0.85;">
          Daily Streak
        </div>
        <div style="font-size:18px;font-weight:900;line-height:1.2;margin-top:2px;">
          ${streakCount} day${streakCount === 1 ? '' : 's'}
        </div>
        <div style="font-size:11px;font-weight:600;opacity:0.92;margin-top:2px;">
          Keep it alive — answer any question today
        </div>
      </div>
    `;
    content.appendChild(dailyCard);

    // Quick Practice section
    content.appendChild(this.makeSectionHeader('Quick Practice'));

    const diff = useRunStore.getState().difficulty;
    const freeCard = document.createElement('button');
    freeCard.type = 'button';
    applyStyle(freeCard, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '18px',
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    });
    freeCard.innerHTML = `
      <div style="font-size:28px;line-height:1;">🎲</div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:900;color:${COLOR_TEXT_DARK};">
          Free Practice
        </div>
        <div style="font-size:12px;font-weight:700;color:${COLOR_TEXT_MUTED};margin-top:3px;">
          10 random A2 questions · ${DIFFICULTY_LABELS[diff]}
        </div>
      </div>
      <div style="font-size:22px;color:${COLOR_AMBER};font-weight:900;">→</div>
    `;
    freeCard.addEventListener('click', (e) => {
      e.preventDefault();
      const store = useRunStore.getState();
      store.setMode('free');
      store.setScenario(null);
      store.setChapter(null);
      store.setLevel('A2');
      this.cleanup();
      this.scene.start('PlayScene');
    });
    content.appendChild(freeCard);

    // Scenarios section
    content.appendChild(this.makeSectionHeader('Scenarios'));

    for (const id of SCENARIOS_IN_ORDER) {
      content.appendChild(this.makeScenarioCard(id));
    }

    return panel;
  }

  private makeScenarioCard(id: ScenarioId): HTMLElement {
    const meta = SCENARIO_META[id];
    const best = readBestScore(id);

    const card = document.createElement('button');
    card.type = 'button';
    applyStyle(card, {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 16px',
      borderRadius: '18px',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      background: '#ffffff',
      color: COLOR_TEXT_DARK,
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 80ms ease-out',
    });
    card.innerHTML = `
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1.3px;color:${meta.accent};text-transform:uppercase;">
          ${meta.emoji} ${meta.labelEn}
        </div>
        <div style="font-size:15px;font-weight:700;color:${COLOR_TEXT_DARK};margin-top:3px;">
          ${meta.labelZh}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;font-weight:700;color:${COLOR_TEXT_MUTED};letter-spacing:0.5px;">BEST</div>
        <div style="font-size:18px;font-weight:900;color:${best > 0 ? COLOR_AMBER_DARK : '#cdbfa8'};">${best}/10</div>
      </div>
    `;
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const store = useRunStore.getState();
      store.setMode('scenario');
      store.setScenario(id);
      store.setChapter(null);
      store.setLevel('A2');
      this.cleanup();
      this.scene.start('PlayScene');
    });
    return card;
  }

  // ─── Profile tab (Stats + Settings merged) ────────────────────────────

  private buildProfilePanel(): HTMLDivElement {
    const panel = this.makePanelShell('Profile', '愛哭鬼但堅韌 — your cozy progress');
    const content = this.getPanelContentRoot(panel);

    // ── XP / Level hero card (v1.7.11) ──
    content.appendChild(this.makeXpHeroCard());

    // ── Stats section ──
    content.appendChild(this.makeSectionHeader('Your Stats'));

    const chapterProg = readChapterProgress();
    const srsCount = this.readSrsCount();
    const totalAnswered = this.readTotalAnswered();
    // v1.9.5: use persistent daily streak (not per-run streak)
    const dailyStreak = readStreak();
    const currentStreak = dailyStreak;

    const grid = document.createElement('div');
    applyStyle(grid, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
    });
    grid.appendChild(this.makeStatCard('Chapters', `${chapterProg.highestCompleted}/8`, 'completed'));
    grid.appendChild(this.makeStatCard('Questions', `${totalAnswered}`, 'answered'));
    grid.appendChild(this.makeStatCard('In review', `${srsCount}`, 'still learning'));
    grid.appendChild(this.makeStatCard('Streak', `${currentStreak}`, 'day(s)'));
    content.appendChild(grid);

    // ── Difficulty section ──
    content.appendChild(this.makeSectionHeader('Difficulty'));
    content.appendChild(this.wrapSettingCard(this.buildDifficultyControl()));

    // ── Audio section ──
    content.appendChild(this.makeSectionHeader('Audio'));
    content.appendChild(this.wrapSettingCard(this.buildAudioControl()));

    // ── Reset section ──
    content.appendChild(this.makeSectionHeader('Danger Zone'));
    const restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.textContent = 'Restart story progress';
    applyStyle(restartBtn, {
      padding: '12px 16px',
      borderRadius: '14px',
      background: '#ffffff',
      color: COLOR_DANGER,
      border: `2px solid ${COLOR_DANGER}`,
      borderBottom: `4px solid #6e3625`,
      fontWeight: '800',
      fontSize: '14px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      width: '100%',
    });
    restartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!window.confirm('Restart story? All chapter progress will be cleared.')) return;
      resetStoryProgress();
      try { localStorage.removeItem('pickup.map.cat-node'); } catch { /* ignore */ }
      this.switchTab('home');
    });
    content.appendChild(restartBtn);

    // ── About ──
    content.appendChild(this.makeSectionHeader('About'));
    const about = document.createElement('div');
    applyStyle(about, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '18px',
      padding: '14px 16px',
    });
    about.innerHTML = `
      <div style="font-size:13px;color:${COLOR_TEXT_DARK};font-weight:800;">Pickup · v1.7.5</div>
      <div style="font-size:12px;color:${COLOR_TEXT_MUTED};margin-top:4px;line-height:1.5;">
        A cozy after-work English game. Pick up moments, learn English.
      </div>
      <a href="https://github.com/kengkeng44/pickup" target="_blank" rel="noopener" style="
        display:inline-block;margin-top:8px;font-size:12px;font-weight:800;
        color:${COLOR_AMBER_DARK};text-decoration:underline;">
        GitHub →
      </a>
    `;
    content.appendChild(about);

    return panel;
  }

  private wrapSettingCard(child: HTMLElement): HTMLElement {
    const card = document.createElement('div');
    applyStyle(card, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '18px',
      padding: '14px 16px',
    });
    card.appendChild(child);
    return card;
  }

  private buildDifficultyControl(): HTMLElement {
    const row = document.createElement('div');
    applyStyle(row, { display: 'flex', gap: '8px' });
    const tiers: Difficulty[] = ['easy', 'medium', 'hard'];
    const current = useRunStore.getState().difficulty;
    const buttons = new Map<Difficulty, HTMLButtonElement>();
    const paint = (active: Difficulty) => {
      for (const [id, el] of buttons) {
        const isActive = id === active;
        el.style.background = isActive ? COLOR_AMBER : '#ffffff';
        el.style.color = isActive ? '#ffffff' : COLOR_TEXT_MUTED;
        el.style.borderColor = isActive ? COLOR_AMBER_DARK : COLOR_BORDER;
      }
    };
    for (const tier of tiers) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = DIFFICULTY_LABELS[tier];
      applyStyle(btn, {
        flex: '1',
        padding: '10px 0',
        fontSize: '13px',
        fontWeight: '800',
        background: '#ffffff',
        color: COLOR_TEXT_MUTED,
        border: `2px solid ${COLOR_BORDER}`,
        borderRadius: '10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 160ms ease, color 160ms ease',
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        useRunStore.getState().setDifficulty(tier);
        paint(tier);
      });
      buttons.set(tier, btn);
      row.appendChild(btn);
    }
    paint(current);
    return row;
  }

  private buildAudioControl(): HTMLElement {
    const row = document.createElement('div');
    applyStyle(row, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '10px',
    });
    const label = document.createElement('div');
    label.textContent = audio.audioMuted ? 'Muted' : 'On';
    applyStyle(label, { fontSize: '14px', fontWeight: '700', color: COLOR_TEXT_DARK });
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = audio.audioMuted ? 'Unmute' : 'Mute';
    applyStyle(btn, {
      padding: '8px 18px',
      borderRadius: '12px',
      background: audio.audioMuted ? COLOR_AMBER : '#ffffff',
      color: audio.audioMuted ? '#ffffff' : COLOR_TEXT_DARK,
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `3px solid ${COLOR_BORDER_DARK}`,
      fontWeight: '800',
      fontSize: '13px',
      cursor: 'pointer',
      fontFamily: 'inherit',
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      audio.toggleAudioMuted();
      label.textContent = audio.audioMuted ? 'Muted' : 'On';
      btn.textContent = audio.audioMuted ? 'Unmute' : 'Mute';
      btn.style.background = audio.audioMuted ? COLOR_AMBER : '#ffffff';
      btn.style.color = audio.audioMuted ? '#ffffff' : COLOR_TEXT_DARK;
    });
    row.appendChild(label);
    row.appendChild(btn);
    return row;
  }

  private makeXpHeroCard(): HTMLElement {
    const xp = readXp();
    const { level, intoLevel, nextLevelAt, fraction } = levelProgress(xp);
    const card = document.createElement('div');
    applyStyle(card, {
      background: `linear-gradient(135deg, ${COLOR_AMBER} 0%, #d4892a 100%)`,
      borderRadius: '20px',
      padding: '18px 20px',
      color: '#ffffff',
      boxShadow: `0 5px 0 ${COLOR_AMBER_DARK}, 0 14px 18px -4px rgba(60, 42, 28, 0.25)`,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    });
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;opacity:0.88;text-transform:uppercase;">
            Level
          </div>
          <div style="font-size:38px;font-weight:900;line-height:1;margin-top:2px;">
            ${level}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;opacity:0.88;text-transform:uppercase;">
            Total XP
          </div>
          <div style="font-size:24px;font-weight:900;line-height:1;margin-top:2px;">
            ${xp}
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;font-size:11px;font-weight:700;opacity:0.92;">
        <div style="flex:1;height:10px;background:rgba(255,255,255,0.25);border-radius:5px;overflow:hidden;">
          <div style="width:${Math.round(fraction * 100)}%;height:100%;background:#ffffff;border-radius:5px;transition:width 600ms ease-out;"></div>
        </div>
        <div>${intoLevel} / ${nextLevelAt} → L${level + 1}</div>
      </div>
    `;
    return card;
  }

  private makeStatCard(label: string, value: string, sublabel: string): HTMLElement {
    const card = document.createElement('div');
    applyStyle(card, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '16px',
      padding: '16px 14px',
      textAlign: 'center',
    });
    card.innerHTML = `
      <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:${COLOR_TEXT_MUTED};text-transform:uppercase;">${label}</div>
      <div style="font-size:32px;font-weight:900;color:${COLOR_NODE_DARK};margin:4px 0 2px;line-height:1.1;">${value}</div>
      <div style="font-size:10px;font-weight:700;color:${COLOR_TEXT_MUTED};">${sublabel}</div>
    `;
    return card;
  }

  private readSrsCount(): number {
    try {
      const raw = localStorage.getItem('wordwar.srs.kitten');
      if (!raw) return 0;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.length : 0;
    } catch { return 0; }
  }

  private readTotalAnswered(): number {
    const chapterProg = readChapterProgress();
    return chapterProg.highestCompleted * 6;
  }

  // ─── Alerts tab (placeholder for v1.8+) ───────────────────────────────

  private buildAlertsPanel(): HTMLDivElement {
    // v1.9.7: Alerts tab now hosts the Achievements grid (renamed function
    // but tab still routed via 'alerts'). Future: also add streak nudges.
    const counts = countUnlocked();
    const panel = this.makePanelShell(
      'Achievements',
      `${counts.unlocked}/${counts.total} unlocked`
    );
    const content = this.getPanelContentRoot(panel);

    const grid = document.createElement('div');
    applyStyle(grid, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
    });

    for (const ach of evaluateAchievements()) {
      const card = document.createElement('div');
      applyStyle(card, {
        background: ach.unlocked ? '#ffffff' : '#f3eddc',
        border: `2px solid ${ach.unlocked ? COLOR_AMBER : COLOR_BORDER}`,
        borderBottom: `4px solid ${ach.unlocked ? COLOR_AMBER_DARK : COLOR_BORDER_DARK}`,
        borderRadius: '16px',
        padding: '14px 12px',
        textAlign: 'center',
        opacity: ach.unlocked ? '1' : '0.6',
        filter: ach.unlocked ? 'none' : 'grayscale(0.3)',
      });
      card.innerHTML = `
        <div style="font-size:36px;line-height:1;margin-bottom:6px;">${ach.emoji}</div>
        <div style="font-size:13px;font-weight:900;color:${COLOR_TEXT_DARK};line-height:1.2;">${ach.title}</div>
        <div style="font-size:11px;font-weight:600;color:${COLOR_TEXT_MUTED};margin-top:4px;line-height:1.35;">
          ${ach.description}
        </div>
        ${ach.progressLabel ? `<div style="font-size:10px;font-weight:800;letter-spacing:0.5px;color:${COLOR_AMBER_DARK};margin-top:6px;">${ach.progressLabel}</div>` : ''}
      `;
      grid.appendChild(card);
    }

    content.appendChild(grid);
    return panel;
  }
}
