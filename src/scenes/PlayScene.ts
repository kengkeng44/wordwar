import Phaser from 'phaser';
import { useRunStore, RUN_CONFIG } from '../store/runStore';
import { audio } from '../audio/AudioManager';
import { startBgm } from '../audio/bgm';
import { speak, stopSpeaking, autoSpeak } from '../audio/tts';
import { mountTapTiles, mountTapPairs, mountTypeWhatYouHear, type TapHandle } from '../ui/TapInputUI';
import {
  sfxCorrect,
  sfxWrong,
  sfxTimerTick,
  sfxRoundTransition,
  sfxHpLoss,
} from '../audio/sfx';
import { ClozeUI } from '../ui/ClozeUI';
import { Mascot } from '../ui/Mascot';
import { GameHUD } from '../ui/GameHUD';
import { SCENARIO_META, FREE_PRACTICE_META } from '../data/scenarios';
import { CHAPTER_META } from '../data/storyKitten';

const ROUND_TIME_MS = 15_000;
const HP_MAX = 3;
const ADVANCE_CORRECT_MS = 4_000;
const ADVANCE_WRONG_MS = 8_000;
const ADVANCE_TIMEOUT_MS = 8_000;
const STORY_ADVANCE_CORRECT_MS = 1_400; // story: brief celebrate then auto-advance (v0.10 +200ms for breathing)
const ROUND_TRANSITION_BREATHING_MS = 250; // v0.10 — Duolingo pacing pause between rounds
const TIMER_LOW_THRESHOLD_MS = 5_000;

/**
 * PlayScene (v0.6 — flex-column DOM layout).
 *
 * v0.6 architecture: the Phaser canvas is hidden via CSS. The scene
 * still runs (timers + tweens drive round progression + count-ups) but
 * renders no visible pixels. GameHUD owns the flex-column layout
 * inside #app and exposes slots that Mascot + ClozeUI mount into.
 * Camera shake + screen flash run as CSS animations driven by GameHUD.
 */
export class PlayScene extends Phaser.Scene {
  private hud?: GameHUD;
  private clozeUI?: ClozeUI;
  private mascot?: Mascot;

  private roundEndsAt = 0;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timerExpired = false;
  private lastTickSecond = -1;
  private warningPlaying = false;
  private advanceTimer?: Phaser.Time.TimerEvent;
  private locked = false;

  // Loading state DOM element (only shown until content loads / on retry).
  private loadingEl?: HTMLDivElement;
  private retryEl?: HTMLButtonElement;

  // v1.6.0: POV scene backdrop (story mode only — shows a per-question
  // first-person scene image with Ken Burns + rain ambient).
  private povSceneEl?: HTMLDivElement;

  // v1.8.3: Duolingo-style alternative-input UI handles for tap-tiles
  // / tap-pairs question types.
  private tapHandle?: TapHandle;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    // Phaser canvas is hidden via CSS — no Phaser-side rendering needed.
    this.cameras.main.setBackgroundColor('#ffffff');

    // v1.8.7: Duolingo immersive lesson — defensively kill any leftover
    // bottom nav element so the player isn't pulled away mid-question.
    document.getElementById('pickup-bottom-nav')?.remove();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupOverlay();
    });

    this.showLoadingDom();
    this.bootstrap();
  }

  // ─── Scenario meta accessors ───────────────────────────────────────────────

  private activeMeta(): {
    accent: string;
    tint: string;
    mascotId: string;
    emoji: string;
    labelZh: string;
    labelEn: string;
  } {
    const { mode, scenario, chapter } = useRunStore.getState();
    if (mode === 'story' && chapter) {
      const ch = CHAPTER_META[chapter];
      return {
        accent: ch.accent,
        tint: ch.tint,
        mascotId: ch.kittenMascotId,
        emoji: ch.emoji,
        labelZh: ch.titleZh,
        labelEn: ch.titleEn,
      };
    }
    if (mode === 'scenario' && scenario) {
      return SCENARIO_META[scenario];
    }
    return FREE_PRACTICE_META;
  }

  private isStoryMode(): boolean {
    return useRunStore.getState().mode === 'story';
  }

  // ─── Bootstrap & loading ────────────────────────────────────────────────────

  private async bootstrap(): Promise<void> {
    const store = useRunStore.getState();
    try {
      // v0.5: load BOTH sentences + scenarios eagerly. Free mode needs
      // both files (unified 130-question pool); scenario mode obviously
      // needs scenarios.json; loading the smaller sentences.json on top
      // for scenario mode is negligible.
      await store.loadContent();
    } catch {
      // setError already happened inside the loader
    }
    const after = useRunStore.getState();
    const ready =
      after.mode === 'scenario'
        ? !!after.scenarioQuestions
        : !!after.questions && !!after.scenarioQuestions;
    if (after.error || !ready) {
      this.showLoadFailure(after.error ?? 'unknown');
      return;
    }

    this.hideLoadingDom();
    store.reset();

    const meta = this.activeMeta();
    const state = useRunStore.getState();
    const isStory = state.mode === 'story';
    const isScenario = state.mode === 'scenario';
    const chipLabel = isStory
      ? `Chapter ${state.chapter} · ${meta.labelEn}`
      : isScenario
        ? meta.labelEn
        : '';

    // Story mode: total rounds = SRS + 6 chapter questions. Computed in
    // startRound; if not yet set we approximate with 6 for now.
    const totalRounds = isStory
      ? Math.max(state.storyTotalQuestionCount, RUN_CONFIG.STORY_QUESTIONS_PER_CHAPTER)
      : RUN_CONFIG.QUESTIONS_PER_RUN;

    // Mount DOM overlays.
    this.hud = new GameHUD({
      accent: meta.accent,
      tint: this.lightTintFor(meta.tint),
      totalRounds,
      scenarioLabel: chipLabel,
      emoji: meta.emoji,
      hideHp: isStory,
      hideStreak: isStory,
      hideTimer: isStory,
      onChange: () => {
        this.cleanupOverlay();
        this.stopTimer();
        if (isStory) {
          this.scene.start('StoryModeScene');
        } else {
          this.scene.start('MenuScene');
        }
      },
    });

    this.clozeUI = new ClozeUI(
      {
        onAnswer: (idx) => this.handleAnswer(idx),
        onContinue: () => this.handleContinue(),
        onForceCorrect: (idx) => this.handleForceCorrect(idx),
      },
      {
        accent: meta.accent,
        buttonsSlot: this.hud.buttonsSlot(),
        revealSlot: this.hud.revealSlot(),
        forceCorrectMode: isStory,
      }
    );
    this.mascot = new Mascot({ parent: this.hud.mascotSlot() });
    // v1.9.40 audit-2 F8: in story mode, swap mascot SVG → calico WebP so
    // the cat user saw on the map continues into the lesson.
    if (isStory) {
      this.mascot.setMascotImage('/mascots/calico-anchor.webp');
    } else {
      this.mascot.setMascot(meta.mascotId);
    }

    this.nextRound();
  }

  /**
   * Scenario tint comes through fairly saturated (e.g. #fff1e0). The HUD
   * halo wants a Duolingo-style soft pastel that still reads as the
   * scenario color. We use the tint as-is — it's already pastel.
   * Returned for future tweaking if needed.
   */
  private lightTintFor(tint: string): string {
    return tint;
  }

  private showLoadingDom(): void {
    if (this.loadingEl) return;
    // v1.7.1: cat-themed loader (mini calico face + blink + recurring tear).
    // CSS animations live in style.css under `.pickup-cat-loader`.
    this.loadingEl = document.createElement('div');
    this.loadingEl.id = 'pickup-loading';
    this.loadingEl.className = 'pickup-cat-loader';
    // v1.7.2: same calico face as the entry transition, scaled to 96px
    // and rotating 360° (animation in style.css `.pickup-cat-loader svg`).
    // Identical SVG geometry to the tear-intro so the user sees brand
    // continuity between first-paint and any in-app loading state.
    this.loadingEl.innerHTML = `
      <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d="M 110 195 L 145 100 L 180 195 Z" fill="#9d3e1c"/>
        <path d="M 290 195 L 255 100 L 220 195 Z" fill="#9d3e1c"/>
        <path d="M 134 188 L 154 138 L 174 188 Z" fill="#e89887"/>
        <path d="M 266 188 L 246 138 L 226 188 Z" fill="#e89887"/>
        <ellipse cx="200" cy="295" rx="138" ry="128" fill="#fdf0d6"/>
        <ellipse cx="158" cy="220" rx="38" ry="24" fill="#e89c5e" transform="rotate(-22 158 220)"/>
        <ellipse cx="270" cy="250" rx="32" ry="38" fill="#3a2a1f" transform="rotate(18 270 250)"/>
        <path d="M 80 330 L 130 335" stroke="#3a2a1f" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
        <path d="M 80 352 L 130 350" stroke="#3a2a1f" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
        <path d="M 270 335 L 320 330" stroke="#3a2a1f" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
        <path d="M 270 350 L 320 352" stroke="#3a2a1f" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
        <ellipse cx="160" cy="295" rx="22" ry="36" fill="#1a1208"/>
        <ellipse cx="240" cy="295" rx="22" ry="36" fill="#1a1208"/>
        <circle cx="168" cy="282" r="6.5" fill="#ffffff"/>
        <circle cx="248" cy="282" r="6.5" fill="#ffffff"/>
        <path d="M 190 340 L 210 340 L 200 350 Z" fill="#d48474"/>
        <path d="M 178 372 Q 200 384 222 372" stroke="#1a1208" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      </svg>
      <div class="label">Loading…</div>
    `;
    document.body.appendChild(this.loadingEl);
  }

  private hideLoadingDom(): void {
    this.loadingEl?.remove();
    this.loadingEl = undefined;
    this.retryEl?.remove();
    this.retryEl = undefined;
  }

  private showLoadFailure(reason: string): void {
    if (this.loadingEl) {
      // Replace just the label text — keep the cat SVG visible so the
      // failure state still feels on-brand.
      const label = this.loadingEl.querySelector('.label');
      if (label) {
        label.innerHTML = `Loading failed, try again?<br><span style="font-weight:600;color:var(--pickup-error);font-size:13px;">${escapeHtml(reason)}</span>`;
      }
    }
    if (this.retryEl) return;
    this.retryEl = document.createElement('button');
    this.retryEl.type = 'button';
    this.retryEl.textContent = 'Retry';
    Object.assign(this.retryEl.style, {
      position: 'fixed',
      top: 'calc(50% + 60px)',
      left: '50%',
      transform: 'translateX(-50%)',
      minHeight: '52px',
      padding: '14px 36px',
      background: 'var(--pickup-success)',
      color: '#ffffff',
      border: 'none',
      borderBottom: '4px solid var(--pickup-success-dark)',
      borderRadius: '14px',
      fontSize: '17px',
      fontWeight: '900',
      cursor: 'pointer',
      fontFamily:
        '"Noto Sans TC", "Nunito", system-ui, -apple-system, sans-serif',
      letterSpacing: '0.5px',
      pointerEvents: 'auto',
      zIndex: '12',
      touchAction: 'manipulation',
    } as CSSStyleDeclaration);
    this.retryEl.addEventListener('click', (e) => {
      e.preventDefault();
      this.retryEl?.remove();
      this.retryEl = undefined;
      const label = this.loadingEl?.querySelector('.label');
      if (label) label.textContent = 'Loading…';
      this.bootstrap();
    });
    document.body.appendChild(this.retryEl);
  }

  // ─── Round lifecycle ────────────────────────────────────────────────────────

  private nextRound(): void {
    this.clearTimer();
    this.cancelAdvanceTimer();
    this.locked = false;
    this.stopWarning();

    const store = useRunStore.getState();
    const isStory = this.isStoryMode();

    const rounds = store.history.length;
    const target = isStory
      ? Math.max(store.storyTotalQuestionCount, RUN_CONFIG.STORY_QUESTIONS_PER_CHAPTER)
      : RUN_CONFIG.QUESTIONS_PER_RUN;
    if (rounds >= target && target > 0) {
      this.toEnd();
      return;
    }
    if (!isStory && store.hp <= 0) {
      this.toEnd();
      return;
    }

    store.startRound();
    const after = useRunStore.getState();
    if (!after.round) {
      this.toEnd();
      return;
    }

    // After first startRound in story mode the total may now be known.
    if (isStory && this.hud) {
      this.hud.setTotalRounds(after.storyTotalQuestionCount);
    }

    this.clozeUI?.resetForRound();
    this.mascot?.setAnim('idle');
    this.timerExpired = false;
    this.lastTickSecond = -1;
    this.updatePovScene();
    this.renderHud();

    // v1.8.0: question type drives UI, not the sheet flag. listen-*
    // types hide the sentence; read-* show it with a speaker button.
    // Comprehension prompts (round.question) appear above either.
    const round = after.round;
    const qType = round?.type;
    const isListeningType =
      qType === 'listen-mc' ||
      qType === 'listen-emoji' ||
      qType === 'listen-comprehension';
    const useListeningUI = round
      ? (qType ? isListeningType : useRunStore.getState().listeningMode)
      : false;

    if (useListeningUI && round && this.hud) {
      const correctWord = round.options[round.correctIndex] ?? '';
      const sentenceText = round.sentence.replace(/_{2,}/g, correctWord);
      const sentenceEl = this.hud.getSentenceElement();
      // v1.8.0: render an optional comprehension prompt above the 🔊
      // button (e.g. "How do I feel?" or "What is the problem?").
      const promptHtml = round.question
        ? `<div style="font-size:13px;color:#7a6850;font-weight:800;margin-bottom:10px;letter-spacing:0.3px;">${round.question}</div>`
        : '';
      if (sentenceEl) {
        sentenceEl.innerHTML = `
          ${promptHtml}
          <button type="button" class="pickup-listen-btn" style="
            display:inline-flex; align-items:center; gap:10px;
            margin:6px auto; padding:14px 28px;
            background:#3d8aae; color:#ffffff;
            border:none; border-bottom:4px solid #2c6986;
            border-radius:18px;
            font-family:inherit; font-size:17px; font-weight:900;
            letter-spacing:0.5px; cursor:pointer;
            touch-action:manipulation; -webkit-tap-highlight-color:transparent;
            transition: transform 80ms ease-out, border-bottom-width 80ms ease-out;
          " aria-label="Tap to hear sentence">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" aria-hidden="true" style="vertical-align:middle;"><path d="M11 5L6 9H2v6h4l5 4V5zm4.5 7c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg> Tap to listen
          </button>
        `;
        const btn = sentenceEl.querySelector('.pickup-listen-btn') as HTMLButtonElement | null;
        if (btn) {
          const onPress = () => { btn.style.transform = 'translateY(3px)'; btn.style.borderBottomWidth = '1px'; };
          const onRelease = () => { btn.style.transform = ''; btn.style.borderBottomWidth = '4px'; };
          btn.addEventListener('mousedown', onPress);
          btn.addEventListener('mouseup', onRelease);
          btn.addEventListener('mouseleave', onRelease);
          btn.addEventListener('touchstart', onPress, { passive: true });
          btn.addEventListener('touchend', onRelease);
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            speak(sentenceText);
          });
        }
      }
      // v2.0.B.51: removed both auto-speak setTimeout AND the "Audio
      // unavailable — ..." fallback microcopy per user feedback ("Audio
      // unavailable 什麼意思 刪掉"). iOS users tap the pulsing 🔊 manually;
      // non-iOS users also tap (the auto-speak experience was inconsistent
      // and the fallback text was scary/confusing). One unified manual-only
      // listen flow across all platforms.
    }

    // v1.7.16: Reading mode also gets a small 🔊 speaker button next
    // to the sentence so the player can OPTIONALLY hear it. Duolingo-
    // style: every exercise has audio access even when reading is
    // primary. Speaks the FULL sentence with the correct word filled
    // in (no [blank], no underscores).
    if (!useListeningUI && round && this.hud) {
      const sentenceEl = this.hud.getSentenceElement();
      if (sentenceEl) {
        // v1.8.0: optional comprehension prompt above the sentence
        if (round.question) {
          const prompt = document.createElement('div');
          prompt.textContent = round.question;
          Object.assign(prompt.style, {
            fontSize: '13px',
            color: '#7a6850',
            fontWeight: '800',
            marginBottom: '8px',
            letterSpacing: '0.3px',
          });
          sentenceEl.insertBefore(prompt, sentenceEl.firstChild);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pickup-mini-speaker';
        btn.setAttribute('aria-label', 'Hear sentence');
        btn.innerHTML = '🔊';
        Object.assign(btn.style, {
          background: '#fffbf2',
          border: '2px solid #e7a44a',
          borderBottom: '3px solid #b07a2a',
          borderRadius: '12px',
          padding: '4px 10px',
          fontSize: '16px',
          cursor: 'pointer',
          marginRight: '8px',
          verticalAlign: 'middle',
          fontFamily: 'inherit',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        });
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const correctWord = round.options[round.correctIndex] ?? '';
          const fullSentence = round.sentence.replace(/_{2,}/g, correctWord);
          speak(fullSentence);
        });
        sentenceEl.insertBefore(btn, sentenceEl.firstChild);
      }
    }

    // v1.8.3: tap-tiles / tap-pairs question types — replace ClozeUI's
    // option buttons with the new tap-input UI mounted into the same slot.
    this.tapHandle?.destroy();
    this.tapHandle = undefined;
    if (round && (qType === 'tap-tiles' || qType === 'tap-pairs' || qType === 'type-what-you-hear') && this.hud) {
      const slot = this.hud.buttonsSlot();
      // Hide the standard 4-MC buttons rendered by ClozeUI for this round
      slot.innerHTML = '';
      const correctWord = round.options[round.correctIndex] ?? '';
      const audioText = round.sentence.replace(/_{2,}/g, correctWord);

      if (qType === 'tap-tiles' && round.tiles && round.correctOrder) {
        this.tapHandle = mountTapTiles({
          slot,
          tiles: round.tiles,
          correctOrder: round.correctOrder,
          prompt: round.question ?? 'Tap what you hear',
          onSpeak: () => speak(audioText),
          onComplete: (correct) => this.handleAnswer(correct ? round.correctIndex : (round.correctIndex + 1) % 4),
        });
        // Auto-play once on round start
        autoSpeak(audioText);
        // Also hide the sentence card content (no sentence to read)
        const sentEl = this.hud.getSentenceElement();
        if (sentEl) sentEl.innerHTML = '';
      } else if (qType === 'type-what-you-hear') {
        const correctWord = round.options[round.correctIndex] ?? '';
        this.tapHandle = mountTypeWhatYouHear({
          slot,
          correctAnswer: correctWord,
          prompt: round.question ?? 'Type what you hear',
          onSpeak: () => speak(audioText),
          onComplete: (correct) => this.handleAnswer(correct ? round.correctIndex : (round.correctIndex + 1) % 4),
        });
        autoSpeak(audioText);
        const sentEl = this.hud.getSentenceElement();
        if (sentEl) sentEl.innerHTML = '';
      } else if (qType === 'tap-pairs' && round.pairs) {
        this.tapHandle = mountTapPairs({
          slot,
          pairs: round.pairs,
          prompt: round.question ?? 'Tap the pairs',
          onComplete: (correct) => this.handleAnswer(correct ? round.correctIndex : (round.correctIndex + 1) % 4),
        });
        const sentEl = this.hud.getSentenceElement();
        if (sentEl) sentEl.innerHTML = `<div style="font-size:13px;font-weight:700;color:#7a6850;text-align:center;">${round.sentence}</div>`;
      }
    }
    this.hud?.animateSentenceIn();
    // Story mode: no timer (force-correct flow makes the timeout pressure
    // counterproductive and stressful).
    if (!isStory) {
      this.startTimer();
    } else {
      this.hud?.hideTimer();
    }

    if (rounds > 0) {
      sfxRoundTransition();
    }
  }

  private toEnd(): void {
    const isStory = this.isStoryMode();
    this.cleanupOverlay();
    if (isStory) {
      this.scene.start('ChapterEndScene');
    } else {
      this.scene.start('EndScene');
    }
  }

  private cleanupOverlay(): void {
    this.hideLoadingDom();
    this.clozeUI?.destroy();
    this.clozeUI = undefined;
    this.mascot?.destroy();
    this.mascot = undefined;
    this.hud?.destroy();
    this.hud = undefined;
    this.povSceneEl?.remove();
    this.povSceneEl = undefined;
    this.tapHandle?.destroy();
    this.tapHandle = undefined;
    this.stopWarning();
    // v1.7.11: silence any in-flight TTS utterance when leaving PlayScene.
    stopSpeaking();
  }

  /**
   * v1.6.0: refresh the POV backdrop for the current question.
   * - Mounts lazily on first story-mode round.
   * - Encodes the current question as `data-pov-scene="chN-qM"`, which
   *   CSS uses to swap the background-image. Missing PNGs fall back to
   *   the dusky color in CSS, no broken-image icon.
   * - Toggles `data-rain="true"` for chapters whose narrative beat
   *   includes weather (Ch1 rainy night).
   */
  private updatePovScene(): void {
    const state = useRunStore.getState();
    if (state.mode !== 'story' || !state.round || !state.chapter) {
      this.povSceneEl?.remove();
      this.povSceneEl = undefined;
      return;
    }
    if (!this.povSceneEl) {
      const el = document.createElement('div');
      el.className = 'pickup-pov-scene';
      el.setAttribute('aria-hidden', 'true');
      // Mount as first child of body so it sits BEHIND #app content
      // (which has its own stacking context).
      document.body.insertBefore(el, document.body.firstChild);
      this.povSceneEl = el;
    }
    // Derive scene key from round id (format `kt-ch1-01`).
    const m = /^kt-ch(\d+)-(\d+)/i.exec(state.round.id);
    if (m) {
      const ch = Number(m[1]);
      const q = Number(m[2]);
      this.povSceneEl.setAttribute('data-pov-scene', `ch${ch}-q${q}`);
      // Ch1 = rainy-night narrative → rain ambient on.
      this.povSceneEl.setAttribute('data-rain', ch === 1 ? 'true' : 'false');
    }
  }

  private maybeStartBgm(): void {
    if (audio.audioMuted) return;
    if (audio.isBgmRunning) return;
    const ctx = audio.ensureContext();
    if (!ctx) return;
    startBgm();
  }

  private renderHud(): void {
    if (!this.hud) return;
    const state = useRunStore.getState();
    const round = state.round;
    if (!round) return;

    const meta = this.activeMeta();
    const isStory = state.mode === 'story';
    const isScenario = state.mode === 'scenario';
    const total = isStory
      ? Math.max(state.storyTotalQuestionCount, RUN_CONFIG.STORY_QUESTIONS_PER_CHAPTER)
      : RUN_CONFIG.QUESTIONS_PER_RUN;
    const qNum = Math.min(state.history.length + 1, total);

    const remaining = Math.max(0, this.roundEndsAt - this.time.now);
    const seconds = Math.ceil((remaining || ROUND_TIME_MS) / 1000);
    const low = remaining > 0 && remaining <= TIMER_LOW_THRESHOLD_MS;

    const chipLabel = isStory && state.chapter
      ? `Chapter ${state.chapter} · ${meta.labelEn}`
      : isScenario
        ? meta.labelEn
        : '';

    this.hud.render({
      hp: state.hp,
      hpMax: HP_MAX,
      streak: state.streak,
      currentRound: qNum,
      totalRounds: total,
      scenarioLabel: chipLabel,
      sentence: formatSentence(round.sentence),
      timerSeconds: seconds,
      timerRatio: remaining / ROUND_TIME_MS,
      timerLow: low,
      timerExpired: this.timerExpired,
    });
  }

  // ─── Answer / reveal flow ───────────────────────────────────────────────────

  private handleAnswer(idx: number): void {
    if (this.locked || this.timerExpired) return;
    this.locked = true;
    this.stopTimer();
    this.maybeStartBgm();

    const state = useRunStore.getState();
    if (!state.round) return;
    const isStory = this.isStoryMode();
    const prevStreak = state.streak;
    const result = state.answer(idx);

    this.clozeUI?.revealAnswer(
      idx,
      result.correctIndex,
      result.explanationZh,
      result.correct
    );

    // v1.7.15: after answering in listening mode, replace the 🔊 button
    // with the full sentence so the player can see what they just heard
    // (with the correct word highlighted in blue). This is the "reveal"
    // payoff — useful for both correct answers (confirmation) and wrong
    // answers (learning what was actually said).
    if (state.listeningMode && this.hud && state.round) {
      const correctWord = state.round.options[result.correctIndex] ?? '';
      const fullSentenceHtml = state.round.sentence.replace(
        /_{2,}/,
        `<span style="color:#3d8aae;font-weight:900;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px;">${correctWord}</span>`
      );
      const sentenceEl = this.hud.getSentenceElement();
      if (sentenceEl) {
        sentenceEl.innerHTML = `
          <div style="font-size:11px;color:#8b6f4a;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">
            You heard
          </div>
          <div style="font-size:17px;font-weight:800;color:#3c2a1c;line-height:1.45;">
            ${fullSentenceHtml}
          </div>
        `;
      }
    }

    if (result.correct) {
      this.mascot?.setAnim('happy');
      this.hud?.flash('#58cc02', 0.15);
      sfxCorrect();
      audio.vibrate(30);
      if (result.streak > prevStreak && result.streak >= 2) {
        this.hud?.pulseStreak();
      }
      // Story: short auto-advance after celebratory beat (1.2s).
      // Free/scenario: longer dwell on the explanation panel.
      this.scheduleAdvance(isStory ? STORY_ADVANCE_CORRECT_MS : ADVANCE_CORRECT_MS);
    } else {
      this.mascot?.setAnim('sad');
      this.hud?.flash('#ff4b4b', 0.13);
      this.hud?.shake();
      sfxWrong();
      if (!isStory) {
        // Outside story mode, wrong → HP loss FX + auto-advance.
        this.hud?.shakeHp();
        sfxHpLoss();
        audio.vibrate([50, 30, 50]);
        this.scheduleAdvance(ADVANCE_WRONG_MS);
      } else {
        // Story mode: NO HP, NO auto-advance. Player must tap the
        // correct option (handled via ClozeUI's force-correct retry).
        audio.vibrate(30);
      }
    }

    this.renderHud();
  }

  private handleForceCorrect(_idx: number): void {
    // Story mode only — fired when the player taps the correct answer
    // after first answering wrong. Clear store retry-flag, update UI,
    // celebrate, then schedule advance.
    const store = useRunStore.getState();
    if (!store.awaitingRetry) return;
    store.retryRound();
    this.clozeUI?.acknowledgeForceCorrect();
    this.mascot?.setAnim('happy');
    this.hud?.flash('#58cc02', 0.15);
    sfxCorrect();
    audio.vibrate(30);
    this.scheduleAdvance(STORY_ADVANCE_CORRECT_MS);
  }

  private handleContinue(): void {
    // In story mode, the Continue button is disabled while awaiting a
    // forced retry — but we double-check the state to be safe.
    const store = useRunStore.getState();
    if (store.awaitingRetry) return;
    if (!this.locked && !this.timerExpired) return;
    this.cancelAdvanceTimer();
    // v0.10 — Duolingo pacing: brief breathing pause before the next
    // question paints. Avoids the jarring instant-cut feel.
    this.advanceTimer = this.time.delayedCall(
      ROUND_TRANSITION_BREATHING_MS,
      () => this.nextRound()
    );
  }

  private scheduleAdvance(ms: number): void {
    this.cancelAdvanceTimer();
    this.advanceTimer = this.time.delayedCall(ms, () => this.nextRound());
  }

  private cancelAdvanceTimer(): void {
    if (this.advanceTimer) {
      this.advanceTimer.remove(false);
      this.advanceTimer = undefined;
    }
  }

  // ─── Timer ──────────────────────────────────────────────────────────────────

  private startTimer(): void {
    this.roundEndsAt = this.time.now + ROUND_TIME_MS;
    this.timerEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.tickTimer(),
    });
    this.tickTimer();
  }

  private tickTimer(): void {
    const remaining = Math.max(0, this.roundEndsAt - this.time.now);
    const seconds = Math.ceil(remaining / 1000);
    const low = remaining <= TIMER_LOW_THRESHOLD_MS && remaining > 0;

    this.hud?.updateTimer(seconds, low);

    if (low && !this.warningPlaying && !this.locked) {
      audio.playWarningLayer();
      this.warningPlaying = true;
    }

    if (low && seconds !== this.lastTickSecond) {
      this.lastTickSecond = seconds;
      sfxTimerTick();
      audio.vibrate(20);
    }
    if (!low) this.lastTickSecond = -1;

    if (remaining <= 0 && !this.timerExpired && !this.locked) {
      this.timerExpired = true;
      this.handleTimeout();
    }
  }

  private stopWarning(): void {
    if (this.warningPlaying) {
      audio.stopWarningLayer();
      this.warningPlaying = false;
    }
  }

  private handleTimeout(): void {
    if (this.isStoryMode()) return; // timer is hidden in story mode
    this.locked = true;
    this.stopTimer();
    const result = useRunStore.getState().timeoutRound();
    this.clozeUI?.revealTimeout(result.correctIndex, result.explanationZh);
    this.mascot?.setAnim('sad');
    this.hud?.shakeHp();
    this.hud?.flash('#ff4b4b', 0.13);
    this.hud?.shake();
    sfxHpLoss();
    audio.vibrate([80, 40, 80]);
    this.renderHud();
    this.scheduleAdvance(ADVANCE_TIMEOUT_MS);
  }

  private stopTimer(): void {
    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = undefined;
    }
    this.stopWarning();
  }

  private clearTimer(): void {
    this.stopTimer();
    this.hud?.updateTimer(15, false);
  }

}

function formatSentence(raw: string): string {
  return raw.replace(/_{3,}/g, '_____');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
