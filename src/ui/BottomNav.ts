/**
 * BottomNav — v1.7.5 4-tab structure (Home / Tasks / Profile / Alerts).
 *
 * Per user 2026-05-26: 通知 / profile / 任務 / 地圖 (用家的 icon).
 * Dropped from v1.7.4 5-tab: Free + Scenes (merged into Tasks),
 * Stats + Settings (merged into Profile). Notifications/Alerts is new
 * (placeholder until streak reminders + new-chapter pings exist).
 *
 * Visual: fixed bottom, dark warm brown bg, amber-tint when active.
 */

import { applyStyle } from './domUtil';

export type BottomNavTab = 'home' | 'tasks' | 'profile' | 'alerts';

export interface BottomNavHandlers {
  onTab: (tab: BottomNavTab) => void;
}

// Inline SVG icons — outline, single-color via currentColor so the
// active state is just a parent `color:` swap.
const ICONS: Record<BottomNavTab, string> = {
  // House icon (per user: 地圖 用家的 icon)
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>`,
  // Clipboard / checklist for missions
  tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11l2 2 4-4"/><path d="M9 17h6"/></svg>`,
  // Person silhouette for profile
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>`,
  // Bell for alerts
  alerts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
};

const LABELS: Record<BottomNavTab, string> = {
  home: 'Home',
  tasks: 'Tasks',
  profile: 'Profile',
  alerts: 'Alerts',
};

export class BottomNav {
  private root: HTMLElement;
  private buttons = new Map<BottomNavTab, HTMLButtonElement>();

  constructor(active: BottomNavTab, handlers: BottomNavHandlers) {
    this.root = document.createElement('nav');
    this.root.id = 'pickup-bottom-nav';
    this.root.setAttribute('aria-label', 'Primary');
    applyStyle(this.root, {
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '40',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'stretch',
      padding: 'max(8px, env(safe-area-inset-bottom)) 6px max(10px, env(safe-area-inset-bottom)) 6px',
      background: '#3c2a1c',
      borderTop: '2px solid #2a1d12',
      boxShadow: '0 -3px 12px rgba(0, 0, 0, 0.18)',
      fontFamily: '"Nunito", "Noto Sans TC", system-ui, sans-serif',
    });

    const tabs: BottomNavTab[] = ['home', 'tasks', 'profile', 'alerts'];
    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', LABELS[tab]);
      const isActive = tab === active;
      applyStyle(btn, {
        flex: '1',
        background: 'transparent',
        border: 'none',
        padding: '8px 4px 4px',
        cursor: 'pointer',
        color: isActive ? '#f7c97d' : '#a8927a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        fontFamily: 'inherit',
        transition: 'color 160ms ease, transform 160ms ease',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      });
      btn.innerHTML = `
        <span style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">${ICONS[tab]}</span>
        <span style="font-size:10px;font-weight:800;letter-spacing:0.4px;">${LABELS[tab]}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        handlers.onTab(tab);
      });
      this.buttons.set(tab, btn);
      this.root.appendChild(btn);
    }

    document.body.appendChild(this.root);
  }

  setActive(tab: BottomNavTab): void {
    for (const [id, btn] of this.buttons) {
      btn.style.color = id === tab ? '#f7c97d' : '#a8927a';
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
