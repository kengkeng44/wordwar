import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';
import { markLessonCompleted } from '../store/runStore';
import { ClozeUI } from '../ui/ClozeUI';
import { GameHUD } from '../ui/GameHUD';
import { Mascot } from '../ui/Mascot';
import { CHAPTER_META } from '../data/storyKitten';
import { speak, autoSpeak } from '../audio/tts';
import {
  mountTapTiles,
  mountTapPairs,
  mountTypeWhatYouHear,
  type TapHandle,
} from '../ui/TapInputUI';
import {
  loadChapterLessons,
  findLesson,
  type Lesson,
  type Question,
  type ChapterId,
} from '../data/lessons';
import type { ClozeQuestion } from '../data/sentences';

export type LessonSceneData = {
  chapter: number;
  lessonId: string;
};

const ADVANCE_CORRECT_MS = 1_400; // Story-mode pacing (matches PlayScene STORY_ADVANCE_CORRECT_MS)

/**
 * LessonScene — v2.0 single-lesson scope (forks PlayScene's question
 * sequencer pattern for the new Duolingo-nested model).
 *
 * Called from StoryMapView (Task 9 next iteration) via:
 *   this.scene.start('LessonScene', { chapter: 1, lessonId: 'kt-ch1-l5' })
 *
 * ClozeUI signature note (Task 8 adaptation):
 *   The plan assumed ClozeUI took (scene, question, {onCorrect, onWrong}).
 *   Actual signature is (handlers, opts) where handlers = {onAnswer,
 *   onContinue, onForceCorrect?} and opts requires {accent, buttonsSlot,
 *   revealSlot, forceCorrectMode?}. We adapted by mounting GameHUD first
 *   (which owns the DOM slots ClozeUI needs) and using the existing
 *   PlayScene handler signature.
 *
 *   ClozeUI auto-subscribes to useRunStore.round to render question text,
 *   so we drive Q→Q advancement by calling useRunStore.setState({ round })
 *   directly with each lesson question cast to ClozeQuestion (the
 *   structurally permissive shape — discriminated Question union would
 *   narrow on access and break v1.x consumer code). Tracked as v2 tech
 *   debt: refactor ClozeUI to consume discriminated types directly.
 */
export class LessonScene extends Phaser.Scene {
  static KEY = 'LessonScene';

  private lesson!: Lesson;
  private chapter!: number;
  private questionIdx = 0;
  private hud?: GameHUD;
  private clozeUI?: ClozeUI;
  private mascot?: Mascot;
  private advanceTimer?: Phaser.Time.TimerEvent;
  private locked = false;
  // v2.0.A.7: Duolingo alt-input UI handle for tap-tiles / tap-pairs /
  // type-what-you-hear (mirrors PlayScene.tapHandle).
  private tapHandle?: TapHandle;

  constructor() {
    super({ key: LessonScene.KEY });
  }

  async init(data: LessonSceneData) {
    this.chapter = data.chapter;
    this.questionIdx = 0;
    try {
      const lessons = await loadChapterLessons(data.chapter as ChapterId);
      const found = findLesson(lessons, data.lessonId);
      if (!found) {
        console.error(`Lesson ${data.lessonId} not found in chapter ${data.chapter}`);
        this.scene.start('StoryModeScene');
        return;
      }
      this.lesson = found;
    } catch (e) {
      console.error('LessonScene init failed:', e);
      this.scene.start('StoryModeScene');
      return;
    }
  }

  create(): void {
    if (!this.lesson) return;

    // Defensively kill any leftover bottom nav (matches PlayScene v1.8.7).
    document.getElementById('pickup-bottom-nav')?.remove();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupOverlay();
    });

    // Story-mode meta from the chapter (LessonScene is only used for story).
    const ch = CHAPTER_META[this.chapter as ChapterId];
    const meta = {
      accent: ch.accent,
      tint: ch.tint,
      mascotId: ch.kittenMascotId,
      emoji: ch.emoji,
      labelEn: ch.titleEn,
    };

    // Seed runStore for ClozeUI's subscription (story mode, no HP/timer/streak).
    const store = useRunStore.getState();
    store.setMode('story');
    store.setChapter(this.chapter as ChapterId);
    store.reset();

    this.hud = new GameHUD({
      accent: meta.accent,
      tint: meta.tint,
      totalRounds: this.lesson.questions.length,
      scenarioLabel: `Chapter ${this.chapter} · ${meta.labelEn}`,
      emoji: meta.emoji,
      hideHp: true,
      hideStreak: true,
      hideTimer: true,
      onChange: () => {
        this.cleanupOverlay();
        this.scene.start('StoryModeScene');
      },
    });

    this.clozeUI = new ClozeUI(
      {
        onAnswer: (idx) => this.handleAnswer(idx),
        onContinue: () => this.handleContinue(),
        onForceCorrect: () => this.handleForceCorrect(),
      },
      {
        accent: meta.accent,
        buttonsSlot: this.hud.buttonsSlot(),
        revealSlot: this.hud.revealSlot(),
        forceCorrectMode: true,
      }
    );

    this.mascot = new Mascot({ parent: this.hud.mascotSlot() });
    this.mascot.setMascotImage('/mascots/calico-anchor.webp');

    this.renderQuestion(this.lesson.questions[0]);
  }

  private renderQuestion(q: Question): void {
    this.locked = false;
    this.cancelAdvanceTimer();

    // Tear down any prior tap UI from the previous question — symmetric
    // with PlayScene.ts:475-476.
    this.tapHandle?.destroy();
    this.tapHandle = undefined;

    // Push question into runStore so ClozeUI's subscription picks it up.
    // Cast to ClozeQuestion (permissive shape) — see header note re: types.
    useRunStore.setState({
      round: q as unknown as ClozeQuestion,
      answered: false,
      awaitingRetry: false,
      lastResult: null,
    });
    this.clozeUI?.resetForRound();
    this.mascot?.setAnim('idle');
    this.renderHud();

    // v2.0.B.30: removed auto-speak. iOS Safari rejects Audio.play() with
    // NotAllowedError when called from setTimeout (delayed gesture chain).
    // User now taps 🔊 manually — always works because that IS the gesture.

    // v2.0.A.7: dispatch by discriminated `q.type` — mirrors
    // PlayScene.ts:473-520 routing pattern. Without this, tap-tiles /
    // tap-pairs / type-what-you-hear fall through to ClozeUI's 4-option
    // MC buttons and break (Ch1 grandma-v4 ships a tap-pairs review @ Q8).
    //
    // Routing map (covers all 7 QuestionType variants):
    //   listen-mc            → ClozeUI 4-MC (default)
    //   listen-emoji         → ClozeUI 4-MC (default)
    //   listen-comprehension → ClozeUI 4-MC (default)
    //   read-mc-with-audio   → ClozeUI 4-MC (default)
    //   type-what-you-hear   → mountTypeWhatYouHear (text input)
    //   tap-tiles            → mountTapTiles
    //   tap-pairs            → mountTapPairs
    const qType = q.type;
    const round = q as any;
    if (
      this.hud &&
      (qType === 'tap-tiles' || qType === 'tap-pairs' || qType === 'type-what-you-hear')
    ) {
      const slot = this.hud.buttonsSlot();
      // Hide ClozeUI's standard 4-MC buttons for this round.
      slot.innerHTML = '';
      const correctIndex = round.correctIndex ?? 0;
      const correctWord = round.options?.[correctIndex] ?? '';
      const audioText = String(round.sentence ?? '').replace(/_{2,}/g, correctWord);

      if (qType === 'tap-tiles' && round.tiles && round.correctOrder) {
        this.tapHandle = mountTapTiles({
          slot,
          tiles: round.tiles,
          correctOrder: round.correctOrder,
          prompt: round.question ?? 'Tap what you hear',
          onSpeak: () => speak(audioText),
          onComplete: (correct) =>
            this.handleAnswer(correct ? correctIndex : (correctIndex + 1) % 4),
        });
        autoSpeak(audioText);
        const sentEl = this.hud.getSentenceElement();
        if (sentEl) sentEl.innerHTML = '';
      } else if (qType === 'type-what-you-hear') {
        this.tapHandle = mountTypeWhatYouHear({
          slot,
          correctAnswer: correctWord,
          prompt: round.question ?? 'Type what you hear',
          onSpeak: () => speak(audioText),
          onComplete: (correct) =>
            this.handleAnswer(correct ? correctIndex : (correctIndex + 1) % 4),
        });
        autoSpeak(audioText);
        const sentEl = this.hud.getSentenceElement();
        if (sentEl) sentEl.innerHTML = '';
      } else if (qType === 'tap-pairs' && round.pairs) {
        this.tapHandle = mountTapPairs({
          slot,
          pairs: round.pairs,
          prompt: round.question ?? 'Tap the pairs',
          onComplete: (correct) =>
            this.handleAnswer(correct ? correctIndex : (correctIndex + 1) % 4),
        });
        const sentEl = this.hud.getSentenceElement();
        if (sentEl) {
          sentEl.innerHTML = `<div style="font-size:13px;font-weight:700;color:#7a6850;text-align:center;">${round.sentence}</div>`;
        }
      }
    }
  }

  private renderHud(): void {
    if (!this.hud) return;
    const total = this.lesson.questions.length;
    const qNum = Math.min(this.questionIdx + 1, total);
    this.hud.render({
      hp: 0,
      hpMax: 0,
      streak: 0,
      currentRound: qNum,
      totalRounds: total,
      scenarioLabel: `Chapter ${this.chapter} · ${this.lesson.id}`,
      sentence: this.lesson.questions[this.questionIdx].sentence,
      timerSeconds: 0,
      timerRatio: 0,
      timerLow: false,
      timerExpired: false,
    });
  }

  private handleAnswer(idx: number): void {
    if (this.locked) return;
    const q = this.lesson.questions[this.questionIdx];
    // Only 4-option types have correctIndex; tap-tiles/tap-pairs go through
    // their own UI which routes to handleAnswer with synthesized indices.
    const correctIndex = (q as any).correctIndex ?? 0;
    const correct = idx === correctIndex;
    this.locked = true;

    this.clozeUI?.revealAnswer(idx, correctIndex, q.explanationZh, correct);

    if (correct) {
      this.mascot?.setAnim('happy');
      this.scheduleAdvance(ADVANCE_CORRECT_MS);
    } else {
      this.mascot?.setAnim('sad');
      // forceCorrectMode: ClozeUI handles blindRetry inline. Player must
      // eventually tap the correct option → fires onForceCorrect.
    }
  }

  private handleForceCorrect(): void {
    this.clozeUI?.acknowledgeForceCorrect();
    this.mascot?.setAnim('happy');
    this.scheduleAdvance(ADVANCE_CORRECT_MS);
  }

  private handleContinue(): void {
    this.cancelAdvanceTimer();
    this.advance();
  }

  private scheduleAdvance(ms: number): void {
    this.cancelAdvanceTimer();
    this.advanceTimer = this.time.delayedCall(ms, () => this.advance());
  }

  private cancelAdvanceTimer(): void {
    if (this.advanceTimer) {
      this.advanceTimer.remove(false);
      this.advanceTimer = undefined;
    }
  }

  private advance(): void {
    this.questionIdx += 1;
    if (this.questionIdx >= this.lesson.questions.length) {
      this.finish();
      return;
    }
    this.renderQuestion(this.lesson.questions[this.questionIdx]);
  }

  private finish(): void {
    markLessonCompleted(this.chapter, this.lesson.id);
    this.cleanupOverlay();
    this.scene.start('StoryModeScene');
  }

  private cleanupOverlay(): void {
    this.cancelAdvanceTimer();
    this.tapHandle?.destroy();
    this.tapHandle = undefined;
    this.clozeUI?.destroy();
    this.clozeUI = undefined;
    this.mascot?.destroy();
    this.mascot = undefined;
    this.hud?.destroy();
    this.hud = undefined;
  }
}
