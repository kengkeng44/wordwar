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
 * StoryModeScene — v1.7.4 single-page tab host.
 *
 * Replaces the old MenuScene-as-entry flow. Tear-intro lands the user
 * here, and all five tabs (Map / Free / Scenes / Stats / Settings) are
 * reachable without ever leaving this scene. Switching a tab swaps the
 * inline content panel; BottomNav stays mounted.
 *
 * Per-tab content choices (per 2026-05-26 user analysis + approval):
 *   - Map: the existing StoryMapView (zig-zag nodes + sitting cat)
 *   - Free: 1-card landing ("10 random A2 questions") with Start CTA
 *   - Scenes: 5 SCENARIO_META cards with best-score badges
 *   - Stats: 4 cards (chapters / questions / SRS queue / streak)
 *   - Settings: difficulty picker + audio mute + restart + version/about
 */
export class StoryModeScene extends Phaser.Scene {
  private currentTab: BottomNavTab = 'map';
  private mapView?: StoryMapView;
  private panelEl?: HTMLDivElement;
  private nav?: BottomNav;

  constructor() {
    super({ key: 'StoryModeScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);

    this.nav = new BottomNav('map', {
      onTab: (tab) => this.switchTab(tab),
    });

    this.switchTab('map');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private cleanup(): void {
    this.mapView?.destroy();
    this.mapView = undefined;
    this.panelEl?.remove();
    this.panelEl = undefined;
    this.nav?.destroy();
    this.nav = undefined;
  }

  // ─── Tab routing ──────────────────────────────────────────────────────

  private switchTab(tab: BottomNavTab): void {
    if (tab === this.currentTab && (this.mapView || this.panelEl)) return;
    this.currentTab = tab;
    this.nav?.setActive(tab);

    // Tear down whatever the previous tab put up
    this.mapView?.destroy();
    this.mapView = undefined;
    this.panelEl?.remove();
    this.panelEl = undefined;

    switch (tab) {
      case 'map':
        this.mapView = new StoryMapView({
          onPlayChapter: (chapter: ChapterId) => {
            const store = useRunStore.getState();
            store.setMode('story');
            store.setChapter(chapter);
            store.setScenario(null);
            store.setLevel('A2');
            this.cleanup();
            this.scene.start('ChapterIntroScene');
          },
        });
        break;
      case 'free':
        this.panelEl = this.buildFreePanel();
        document.body.appendChild(this.panelEl);
        break;
      case 'scenarios':
        this.panelEl = this.buildScenariosPanel();
        document.body.appendChild(this.panelEl);
        break;
      case 'stats':
        this.panelEl = this.buildStatsPanel();
        document.body.appendChild(this.panelEl);
        break;
      case 'settings':
        this.panelEl = this.buildSettingsPanel();
        document.body.appendChild(this.panelEl);
        break;
    }
  }

  // ─── Panel factory ────────────────────────────────────────────────────

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

  // ─── Free tab ─────────────────────────────────────────────────────────

  private buildFreePanel(): HTMLDivElement {
    const panel = this.makePanelShell(
      'Free Practice',
      '10 random A2 questions · no story · no pressure'
    );
    const content = this.getPanelContentRoot(panel);

    const diff = useRunStore.getState().difficulty;

    const card = document.createElement('div');
    applyStyle(card, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '18px',
      padding: '20px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    });
    card.innerHTML = `
      <div style="font-size:15px;font-weight:700;color:${COLOR_TEXT_DARK};line-height:1.45;">
        Quick A2 cloze · HP enabled · timer on each question.
      </div>
      <div style="font-size:12px;font-weight:700;color:${COLOR_TEXT_MUTED};">
        Difficulty · <span style="color:${COLOR_TEXT_DARK};">${DIFFICULTY_LABELS[diff]}</span>
        <span style="opacity:0.6;"> · change in Settings</span>
      </div>
    `;
    content.appendChild(card);

    const startBtn = this.makePrimaryButton('Start Free Practice', () => {
      const store = useRunStore.getState();
      store.setMode('free');
      store.setScenario(null);
      store.setChapter(null);
      store.setLevel('A2');
      this.cleanup();
      this.scene.start('PlayScene');
    });
    content.appendChild(startBtn);

    return panel;
  }

  // ─── Scenarios tab ────────────────────────────────────────────────────

  private buildScenariosPanel(): HTMLDivElement {
    const panel = this.makePanelShell(
      'Scenes',
      'Themed 10-question sets · pick the situation'
    );
    const content = this.getPanelContentRoot(panel);

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

  // ─── Stats tab ────────────────────────────────────────────────────────

  private buildStatsPanel(): HTMLDivElement {
    const panel = this.makePanelShell('Stats', 'Your cozy progress so far');
    const content = this.getPanelContentRoot(panel);

    const chapterProg = readChapterProgress();
    const srsCount = this.readSrsCount();
    const totalAnswered = this.readTotalAnswered();
    const currentStreak = useRunStore.getState().streak; // current run only

    const grid = document.createElement('div');
    applyStyle(grid, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
    });

    grid.appendChild(this.makeStatCard('Chapters', `${chapterProg.highestCompleted}/8`, 'completed'));
    grid.appendChild(this.makeStatCard('Questions', `${totalAnswered}`, 'answered'));
    grid.appendChild(this.makeStatCard('In review', `${srsCount}`, 'words still learning'));
    grid.appendChild(this.makeStatCard('Streak', `${currentStreak}`, 'this run'));

    content.appendChild(grid);

    const note = document.createElement('div');
    applyStyle(note, {
      fontSize: '12px',
      fontStyle: 'italic',
      color: COLOR_TEXT_MUTED,
      textAlign: 'center',
      marginTop: '10px',
      lineHeight: '1.5',
    });
    note.textContent = '愛哭鬼但堅韌 — 你的小貓記得每一題你跨過的關卡。';
    content.appendChild(note);

    return panel;
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
    // Approximation: Ch1 has 6 questions; if completed at least once
    // they've answered all 6 (+ blindRetry attempts not counted here).
    const chapterProg = readChapterProgress();
    return chapterProg.highestCompleted * 6;
  }

  // ─── Settings tab ─────────────────────────────────────────────────────

  private buildSettingsPanel(): HTMLDivElement {
    const panel = this.makePanelShell('Settings', 'Tune your experience');
    const content = this.getPanelContentRoot(panel);

    // Difficulty section
    content.appendChild(this.makeSettingsSection('Difficulty', this.buildDifficultyControl()));

    // Audio section
    const audioRow = document.createElement('div');
    applyStyle(audioRow, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '10px',
    });
    const audioLabel = document.createElement('div');
    audioLabel.textContent = audio.audioMuted ? 'Muted' : 'On';
    applyStyle(audioLabel, {
      fontSize: '14px',
      fontWeight: '700',
      color: COLOR_TEXT_DARK,
    });
    const audioBtn = document.createElement('button');
    audioBtn.type = 'button';
    audioBtn.textContent = audio.audioMuted ? 'Unmute' : 'Mute';
    applyStyle(audioBtn, {
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
    audioBtn.addEventListener('click', (e) => {
      e.preventDefault();
      audio.toggleAudioMuted();
      audioLabel.textContent = audio.audioMuted ? 'Muted' : 'On';
      audioBtn.textContent = audio.audioMuted ? 'Unmute' : 'Mute';
      audioBtn.style.background = audio.audioMuted ? COLOR_AMBER : '#ffffff';
      audioBtn.style.color = audio.audioMuted ? '#ffffff' : COLOR_TEXT_DARK;
    });
    audioRow.appendChild(audioLabel);
    audioRow.appendChild(audioBtn);
    content.appendChild(this.makeSettingsSection('Audio', audioRow));

    // Restart story
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
      this.switchTab('map');
    });
    content.appendChild(this.makeSettingsSection('Reset', restartBtn));

    // About
    const about = document.createElement('div');
    about.innerHTML = `
      <div style="font-size:13px;color:${COLOR_TEXT_DARK};font-weight:700;">Pickup · v1.7.4</div>
      <div style="font-size:12px;color:${COLOR_TEXT_MUTED};margin-top:4px;line-height:1.5;">
        A cozy after-work English game. Pick up moments, learn English.
      </div>
      <a href="https://github.com/kengkeng44/pickup" target="_blank" rel="noopener" style="
        display:inline-block;margin-top:8px;font-size:12px;font-weight:800;
        color:${COLOR_AMBER_DARK};text-decoration:underline;">
        GitHub →
      </a>
    `;
    content.appendChild(this.makeSettingsSection('About', about));

    return panel;
  }

  private makeSettingsSection(label: string, child: HTMLElement): HTMLElement {
    const card = document.createElement('div');
    applyStyle(card, {
      background: '#ffffff',
      border: `2px solid ${COLOR_BORDER}`,
      borderBottom: `4px solid ${COLOR_BORDER_DARK}`,
      borderRadius: '18px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    });
    const head = document.createElement('div');
    head.textContent = label;
    applyStyle(head, {
      fontSize: '11px',
      fontWeight: '800',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      color: COLOR_TEXT_MUTED,
    });
    card.appendChild(head);
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

  // ─── Shared helpers ───────────────────────────────────────────────────

  private makePrimaryButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    applyStyle(btn, {
      padding: '14px 18px',
      borderRadius: '16px',
      background: COLOR_AMBER,
      color: '#ffffff',
      border: 'none',
      borderBottom: `4px solid ${COLOR_AMBER_DARK}`,
      fontSize: '15px',
      fontWeight: '900',
      letterSpacing: '0.5px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return btn;
  }
}
