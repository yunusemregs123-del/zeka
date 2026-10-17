import { createPortal } from 'react-dom';
import { useEffect, useState, useRef } from 'react';
import { StatusBar } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { useGameStore, type GameMode } from './store/useGameStore';
import { generatePuzzle, isTutorialLevel, getTutorialSymbols, getCheckpointForLevel, type SymbolType, createPRNG } from './lib/LevelEngine';
import * as Leaderboard from './lib/Leaderboard';
import * as Icons from './components/Icons';
import { GameSymbol } from './components/GameSymbol';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { AmbientMusic } from './lib/AmbientMusic';
import { Ads } from './lib/Ads';
import { Translations, type LanguageCode } from './lib/Translations';
import { ACHIEVEMENTS } from './lib/Achievements';
import { haptic } from './lib/Haptics';
import { BrainAnalyticsModal } from './components/BrainAnalyticsModal';
import { DuelModal, type StartDuelPayload } from './components/DuelModal';
import { DuelService, type OpponentInfo } from './lib/DuelService';
import { JourneyMap } from './components/JourneyMap';
import { RollingNumber } from './components/RollingNumber';

let audioCtx: AudioContext | null = null;
let ambientMusic: AmbientMusic | null = null;
let globalGain: GainNode | null = null;
const isMuted = () => localStorage.getItem('zeka_mute') === 'true';

const initAudio = () => {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
      globalGain = audioCtx.createGain();
      globalGain.gain.value = 1;
      globalGain.connect(audioCtx.destination);
      ambientMusic = new AmbientMusic(audioCtx, globalGain);
    }
  }
};

// Tüm sesleri sessizce kapatmak / açmak için
const fadeGlobalAudio = (targetValue: number, duration = 0.15) => {
  if (!audioCtx || !globalGain) return;
  const now = audioCtx.currentTime;
  globalGain.gain.cancelScheduledValues(now);
  globalGain.gain.setValueAtTime(globalGain.gain.value, now);
  globalGain.gain.linearRampToValueAtTime(targetValue, now + duration);
};

const playSound = (type: 'click' | 'success' | 'fail' | 'tick' | 'intro') => {
  if (isMuted()) return;
  initAudio();
  if (!audioCtx || !globalGain) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(globalGain);
  const now = ctx.currentTime;

  if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.05);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'success') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.setValueAtTime(783.99, now + 0.08);
    osc.frequency.setValueAtTime(1046.50, now + 0.16);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'fail') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now); osc.stop(now + 0.3);
  } else if (type === 'tick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now); osc.stop(now + 0.05);
  } else if (type === 'intro') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(261.63, now);
    osc.frequency.exponentialRampToValueAtTime(392.00, now + 0.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.start(now); osc.stop(now + 0.6);
  }
};

const TUTORIAL_DATA: Record<number, { exampleSequence?: SymbolType[], exampleResult?: number | string, exampleSequence2?: SymbolType[], exampleResult2?: number | string }> = {
  11: { exampleSequence: ['CircleFilled', 'Plus', 'TriangleUp'], exampleResult: 2 },
  31: { exampleSequence: ['CircleFilled', 'CircleFilled', 'Plus', 'Mul2'], exampleResult: 4, exampleSequence2: ['CircleFilled', 'CircleFilled', 'CircleFilled', 'CircleFilled', 'Plus', 'Div2'], exampleResult2: 2 },
  51: { exampleSequence: ['CircleFilled', 'Plus', 'Prev1'], exampleResult: 6 },
  71: { exampleSequence: ['CircleFilled', 'Plus', 'ReverseNext', 'TriangleUp'], exampleResult: 0 },
  91: { exampleSequence: ['CircleFilled', 'CircleFilled', 'Plus', 'InvertAll'], exampleResult: -2 },
  101: { exampleSequence: ['TriangleUp', 'Plus', 'Star'], exampleResult: 0 },
  111: { exampleSequence: ['CircleEmpty', 'Plus', 'Heart'], exampleResult: 0 },
  131: { exampleSequence: ['TriangleUp', 'Plus', 'Prev2'], exampleResult: 4 }
};

const SymbolDisplay = ({ type, size = 'normal', disableAnimation = false }: { type: SymbolType, size?: 'small' | 'normal' | 'large', disableAnimation?: boolean }) => {
  if (type === 'Plus') return <GameSymbol type={type} size={size} className="mx-[2px] md:mx-1" />;

  if (disableAnimation) {
    return (
      <div className="flex items-center justify-center p-[2px] drop-shadow-sm">
        <GameSymbol type={type} size={size} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      className="flex items-center justify-center p-[2px] drop-shadow-sm"
    >
      <GameSymbol type={type} size={size} />
    </motion.div>
  );
};

const TutorialExample = ({ text, sequence, result, isSmall }: { text?: string, sequence?: SymbolType[], result?: number | string, isSmall?: boolean }) => {
  if (!sequence || result === undefined) return null;
  return (
    <div className={`w-full bg-neutral-50/80 border border-neutral-100 rounded-2xl ${isSmall ? 'p-2 mb-1' : 'p-4 mb-2'} text-left shadow-[inset_0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden`}>
      {text && <span className={`block ${isSmall ? 'text-[8px] mb-1' : 'text-[10px] mb-3'} font-black text-amber-500 tracking-widest uppercase whitespace-normal`}>{text}</span>}
      <div className={`flex items-center justify-center gap-1 md:gap-2 pb-1 whitespace-nowrap flex-nowrap w-full ${isSmall ? 'scale-[0.70]' : 'scale-[0.80] sm:scale-100'} origin-center`}>
        {sequence.map((sym, i) => {
          if (sym === 'Plus') return <GameSymbol key={`ex-p-${i}`} type="Plus" size={isSmall ? 'small' : 'normal'} className="mx-[2px] md:mx-1" />;
          return (
            <div key={`ex-${sym}-${i}`} className="shrink-0 bg-white shadow-sm border border-neutral-100 rounded-xl flex items-center justify-center p-[2px]">
              <GameSymbol type={sym} size={isSmall ? 'small' : 'normal'} className="drop-shadow-sm" />
            </div>
          );
        })}
        <span className={`${isSmall ? 'text-sm' : 'text-xl'} font-black text-neutral-300 mx-1 shrink-0`}>=</span>
        <span className={`${isSmall ? 'text-lg' : 'text-2xl md:text-3xl'} font-black text-amber-500 shrink-0`}>{result}</span>
      </div>
    </div>
  );
};

// ─── MENU SCREEN ──────────────────────────────────────
function MenuScreen({
  startGame, openDailyReward, coins,
  showInfo, setShowInfo,
  showLeaderboard, setShowLeaderboard,
  showMedals, setShowMedals,
  selectedMedal, setSelectedMedal,
  showLangMenu, setShowLangMenu,
  openBrainStats, openDuel
}: {
  startGame: (asDev?: boolean, startLevel?: number, mode?: GameMode) => void,
  openDailyReward: () => void,
  coins: number,
  showInfo: boolean, setShowInfo: (v: boolean) => void,
  showLeaderboard: boolean, setShowLeaderboard: (v: boolean) => void,
  showMedals: boolean, setShowMedals: (v: boolean) => void,
  selectedMedal: any, setSelectedMedal: (v: any) => void,
  showLangMenu: boolean, setShowLangMenu: (v: boolean) => void,
  openBrainStats: () => void,
  openDuel: () => void,
}) {
  const {
    language, setLanguage, medals, claimedMedals, claimMedalReward,
    checkpointLevel, streak
  } = useGameStore();
  const t = Translations[language];
  const [tab, setTab] = useState<'daily' | 'weekly' | 'alltime'>('daily');
  const [scores, setScores] = useState<Leaderboard.ScoreEntry[]>([]);
  const [personalRankData, setPersonalRankData] = useState<{ rank: number, row: Leaderboard.ScoreEntry } | null>(null);
  const [loading, setLoading] = useState(true);
  const [muteAudio, setMuteAudio] = useState(localStorage.getItem('zeka_mute') === 'true');
  const logoControls = useAnimation();

  const tabLabels: Record<'daily' | 'weekly' | 'alltime', string> = {
    daily: t.lb_tab_daily || 'DAILY',
    weekly: t.lb_tab_weekly || 'WEEKLY',
    alltime: t.lb_tab_alltime || 'ALL TIME',
  };

  const toggleMute = () => {
    const newMute = !muteAudio;
    setMuteAudio(newMute);
    localStorage.setItem('zeka_mute', String(newMute));
  };

  useEffect(() => {
    const hideStatusBar = async () => {
      try { await StatusBar.hide(); } catch (e) { }
    }
    hideStatusBar();
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetch = async () => {
      let data: Leaderboard.ScoreEntry[];
      if (tab === 'daily') data = await Leaderboard.getDailyScores();
      else if (tab === 'weekly') data = await Leaderboard.getWeeklyScores();
      else data = await Leaderboard.getAllTimeScores();
      setScores(data);

      const pName = Leaderboard.getPlayerName();
      if (pName) {
        const pr = await Leaderboard.getPersonalScoreAndRank(tab, pName);
        setPersonalRankData(pr);
      } else {
        setPersonalRankData(null);
      }

      setLoading(false);
    };
    fetch();
  }, [tab]);

  // Ambiyans Müziğini Ana Menüde çaldır
  useEffect(() => {
    initAudio();
    if (ambientMusic) {
      ambientMusic.setOnBeat(() => {
        if (!muteAudio) {
          logoControls.start({
            scale: [1, 1.06, 1],
            transition: { duration: 0.18, ease: "easeOut" }
          });
        }
      });
    }

    const handleFirstInteraction = () => {
      if (audioCtx?.state === 'suspended') audioCtx.resume();
      if (!muteAudio) ambientMusic?.play();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    // Sayfa yenilenirken cızırtıyı önle
    const handleBeforeUnload = () => {
      fadeGlobalAudio(0, 0.05);
      ambientMusic?.stop();
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    window.addEventListener('beforeunload', handleBeforeUnload);

    if (!muteAudio && audioCtx?.state === 'running') {
      fadeGlobalAudio(1, 0.3);
      ambientMusic?.play();
    }

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      ambientMusic?.stop();
      if (ambientMusic) ambientMusic.setOnBeat(undefined);
    };
  }, [muteAudio, logoControls]);

  // Mute tuşuna basıldığında anında tepki
  useEffect(() => {
    if (muteAudio) {
      fadeGlobalAudio(0, 0.15);
      setTimeout(() => ambientMusic?.stop(), 160);
    } else if (audioCtx?.state === 'running') {
      fadeGlobalAudio(1, 0.3);
      ambientMusic?.play();
    }
  }, [muteAudio]);

  // Arka planda müzik durdurma
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) ambientMusic?.stop();
      else if (!muteAudio && audioCtx?.state === 'running') ambientMusic?.play();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let appStateListener: any;
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) ambientMusic?.stop();
      else if (!muteAudio && audioCtx?.state === 'running') ambientMusic?.play();
    }).then(listener => appStateListener = listener);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (appStateListener) appStateListener.remove();
    };
  }, [muteAudio]);

  const [isHapticsOn, setIsHapticsOn] = useState(haptic.getStatus());

  const toggleHaptics = () => {
    const next = !isHapticsOn;
    setIsHapticsOn(next);
    haptic.setEnabled(next);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F5F5F7] text-[#1D1D1F] flex flex-col justify-between font-sans selection:bg-neutral-200 relative overflow-hidden p-4">

      {/* TOP STATUS BAR (HEADER) */}
      <header className="w-full max-w-sm mx-auto flex items-center justify-between z-20 shrink-0 pt-2">
        {/* Daily Reward Button */}
        <button
          onClick={openDailyReward}
          className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-neutral-200/80 shadow-sm active:scale-95 transition-all text-neutral-800"
        >
          <div className="p-1 rounded-lg bg-amber-400 text-white animate-pulse">
            <Icons.Gift className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider">{t.daily_reward}</span>
        </button>

        {/* Coins, Streak & Language Selector */}
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-white border border-amber-200/80 px-2.5 py-1.5 rounded-full shadow-sm">
              <span className="text-amber-500 text-xs">🔥</span>
              <span className="text-xs font-black text-amber-700 tabular-nums">{streak}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-white border border-neutral-200/80 px-3 py-1.5 rounded-full shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
            <span className="font-black text-xs tabular-nums text-neutral-900 leading-none">{coins}</span>
          </div>

          {/* LANGUAGE SELECTOR IN TOP-RIGHT */}
          <div className="relative">
            <button
              onClick={() => { haptic.impact('light'); setShowLangMenu(!showLangMenu); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-neutral-200/80 rounded-full shadow-sm text-[10px] font-black tracking-wider uppercase hover:bg-neutral-50 active:scale-95 transition-all text-neutral-700"
            >
              <span>{language}</span>
              <Icons.ChevronDown className={`w-2.5 h-2.5 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  className="absolute right-0 top-9 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden flex flex-col items-stretch z-30 min-w-[70px]"
                >
                  {(['en', 'tr', 'de', 'ja', 'pt'] as LanguageCode[]).map(lang => (
                    <button
                      key={lang}
                      onClick={() => { haptic.impact('light'); setLanguage(lang); setShowLangMenu(false); }}
                      className={`py-2 px-3 text-[10px] font-black tracking-widest uppercase transition-colors text-center ${language === lang ? 'bg-neutral-100 text-amber-500' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* CENTER HERO AREA */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center w-full max-w-sm mx-auto my-auto flex flex-col items-center justify-center z-10 py-4"
      >
        {/* Rhythmic Bouncing Logo Syncing with Ambient Music */}
        <motion.div animate={logoControls} className="mx-auto w-fit mb-4">
          <div className="w-24 h-24 bg-[#1D1D1F] text-white rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.18)] transition-transform relative overflow-hidden">
            <div className="absolute top-4 left-4 w-4 h-4 rounded-full border border-white/10" />
            <div className="absolute bottom-4 right-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-white/10" />
            <h1 className="text-5xl font-black relative z-10 select-none">Z</h1>
          </div>
        </motion.div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-[#1D1D1F] mb-1">
          ZEKA
        </h1>
        <p className="text-sm font-bold text-neutral-400 tracking-[0.25em] uppercase mb-8">
          {t.menu_subtitle}
        </p>

        {/* GIANT ICONIC PLAY BUTTON (CLASSIC MODE) */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            haptic.impact('heavy');
            startGame(false, undefined, 'CLASSIC');
          }}
          className="w-full py-5 rounded-full font-black tracking-[0.2em] text-lg sm:text-xl shadow-[0_15px_35px_rgba(0,0,0,0.18)] bg-[#1D1D1F] hover:bg-black text-white transition-all flex items-center justify-center gap-2"
        >
          <span>{checkpointLevel > 1 ? t.play_continue : t.play_start}</span>
          <Icons.Play className="w-5 h-5 fill-current ml-0.5" />
        </motion.button>

        {/* 2 SIDE-BY-SIDE BUTTONS MATCHING PLAY BUTTON WIDTH & HEIGHT */}
        <div className="w-full grid grid-cols-2 gap-3 mt-3">
          {/* MEMORY MODE BUTTON (NO EYE ICON, SUBTLE SLEEK TINT) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptic.impact('medium');
              startGame(false, 1, 'MEMORY');
            }}
            className="w-full py-4 sm:py-5 min-h-[58px] sm:min-h-[64px] bg-sky-50/90 hover:bg-sky-100 text-sky-800 border border-sky-200/80 rounded-2xl sm:rounded-3xl font-black text-xs sm:text-sm tracking-wider uppercase shadow-sm flex items-center justify-center transition-all active:scale-95"
          >
            <span>{t.mode_memory}</span>
          </motion.button>

          {/* 1vs1 DUEL MODE BUTTON (SUBTLE SLEEK TINT + SWORDS ICON) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptic.impact('medium');
              openDuel();
            }}
            className="w-full py-4 sm:py-5 min-h-[58px] sm:min-h-[64px] bg-rose-50/90 hover:bg-rose-100 text-rose-800 border border-rose-200/80 rounded-2xl sm:rounded-3xl font-black text-xs sm:text-sm tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Icons.Swords className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{t.mode_duel}</span>
          </motion.button>
        </div>

        {/* SUBTLE CHECKPOINT LABEL */}
        <div className="mt-4 text-[11px] font-black tracking-widest uppercase text-neutral-400">
          <span>{t.checkpoint_label} {checkpointLevel}</span>
        </div>
      </motion.div>

      {/* BOTTOM ACTION BUTTONS BAR */}
      <footer className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 z-20 shrink-0 pb-2">
        <button
          onClick={toggleMute}
          className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-neutral-500 hover:text-black hover:-translate-y-0.5 active:scale-95 transition-all"
        >
          {muteAudio ? <Icons.MusicOff className="w-5 h-5" /> : <Icons.MusicOn className="w-5 h-5" />}
        </button>

        <button
          onClick={() => { haptic.impact('light'); setShowLeaderboard(true); }}
          className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-amber-500 hover:text-amber-600 hover:-translate-y-0.5 active:scale-95 transition-all"
        >
          <Icons.Trophy className="w-5 h-5" />
        </button>

        <button
          onClick={() => { haptic.impact('light'); openBrainStats(); }}
          className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-blue-500 hover:text-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all"
        >
          <Icons.Brain className="w-5 h-5" />
        </button>

        <button
          onClick={() => { haptic.impact('light'); setShowMedals(true); }}
          className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-neutral-500 hover:text-black hover:-translate-y-0.5 active:scale-95 transition-all relative"
        >
          <Icons.Medal className={`w-5 h-5 ${medals.length > claimedMedals.length ? 'animate-bounce text-amber-500' : ''}`} />
          {medals.length > claimedMedals.length && (
            <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>

        <button
          onClick={() => { haptic.impact('light'); setShowInfo(true); }}
          className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-neutral-500 hover:text-black hover:-translate-y-0.5 active:scale-95 transition-all"
        >
          <Icons.Settings className="w-5 h-5" />
        </button>
      </footer>

      {/* MEDALS MODAL */}
      <AnimatePresence>
        {showMedals && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 pointer-events-auto">
            <motion.div
              key="medals-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[2.5rem] p-6 w-full max-w-[360px] shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                  <Icons.Medal className="w-6 h-6 text-[#1D1D1F]" />
                  {t.medals_title}
                </h2>
                <button onClick={() => setShowMedals(false)} className="w-9 h-9 flex items-center justify-center bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors">
                  <span className="font-bold text-neutral-400 text-xs">✕</span>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t.med_earned_title}</span>
                  <span className="text-lg font-black text-[#1D1D1F]">{medals.length} / 12</span>
                </div>
                <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(medals.length / 12) * 100}%` }}
                    className="h-full bg-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5 overflow-y-auto pr-1 custom-scrollbar pb-4 max-h-[45vh] pt-2">
                {ACHIEVEMENTS.map(med => {
                  const unlocked = medals.includes(med.id);
                  const claimed = claimedMedals.includes(med.id);
                  return (
                    <motion.div
                      key={med.id}
                      onClick={() => setSelectedMedal(med)}
                      whileHover={{ scale: 1.05 }}
                      className="group relative flex flex-col items-center gap-1 cursor-pointer"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${unlocked ? (claimed ? 'bg-neutral-800 border-neutral-800 text-white' : 'bg-amber-400 border-amber-400 text-white') : 'bg-white border-neutral-100 text-neutral-200'}`}>
                        <Icons.Medal className={`w-6 h-6 ${unlocked ? 'opacity-100' : 'opacity-30'}`} />
                        {unlocked && !claimed && (
                          <div className="absolute top-0 right-0 bg-red-500 w-3 h-3 rounded-full border-2 border-white animate-bounce" />
                        )}
                      </div>
                      <span className={`text-[6.5px] font-black uppercase tracking-tighter text-center leading-none mt-0.5 ${unlocked ? 'text-neutral-900' : 'text-neutral-300'}`}>
                        {t[med.key]}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* MEDAL DETAIL OVERLAY */}
              <AnimatePresence>
                {selectedMedal && (
                  <motion.div
                    key="medal-detail-overlay"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-white/95 z-20 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center"
                  >
                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 border-4 ${medals.includes(selectedMedal.id) ? 'bg-[#1D1D1F] border-[#1D1D1F] text-white' : 'bg-white border-neutral-100 text-neutral-200'}`}>
                      <Icons.Medal className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-black mb-2 uppercase tracking-tight">{t[selectedMedal.key]}</h3>
                    <p className="text-xs font-bold text-neutral-500 mb-6 leading-relaxed px-4">
                      {t[selectedMedal.key + '_desc'] || "???"}
                    </p>

                    <div className="bg-amber-50 px-4 py-2 rounded-full border border-amber-100 flex items-center gap-2 mb-8">
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t.med_reward}:</span>
                      <span className="text-sm font-black text-amber-600">{selectedMedal.reward} COIN</span>
                    </div>

                    {medals.includes(selectedMedal.id) && !claimedMedals.includes(selectedMedal.id) ? (
                      <button
                        onClick={() => { claimMedalReward(selectedMedal.id, selectedMedal.reward); playSound('success'); }}
                        className="w-full py-4 bg-amber-400 text-white rounded-2xl font-black tracking-widest text-xs shadow-lg hover:scale-105 active:scale-95 transition-all mb-3"
                      >
                        {t.med_claim_btn}
                      </button>
                    ) : claimedMedals.includes(selectedMedal.id) ? (
                      <div className="w-full py-4 bg-neutral-100 text-neutral-400 rounded-2xl font-black tracking-widest text-xs mb-3">
                        {t.med_claimed_status}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setSelectedMedal(null)}
                      className="w-full py-4 bg-neutral-800 text-white rounded-2xl font-black tracking-widest text-xs shadow-md hover:scale-105 active:scale-95 transition-all text-[10px]"
                    >
                      {t.info_close || "GERİ"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>


            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INFO MODAL */}
      <AnimatePresence>
        {showInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 pointer-events-auto">
            <motion.div
              key="info-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-5 w-full max-w-[340px] shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-black">{t.info_title}</h2>
                <button onClick={() => setShowInfo(false)} className="w-9 h-9 flex items-center justify-center bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors">
                  <span className="font-bold text-neutral-400 text-xs">✕</span>
                </button>
              </div>
              <p className="text-xs font-medium text-neutral-600 mb-4 leading-relaxed">
                {t.info_desc}
              </p>

              {/* Settings Toggles */}
              <div className="flex flex-col gap-2.5 mb-5">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${!muteAudio ? 'bg-amber-100 text-amber-700' : 'bg-neutral-200 text-neutral-400'}`}>
                      {!muteAudio ? <Icons.Volume className="w-4 h-4" /> : <Icons.VolumeMute className="w-4 h-4" />}
                    </div>
                    <span className="text-xs font-bold text-neutral-800 tracking-wide uppercase">{t.sound_toggle}</span>
                  </div>
                  <button
                    onClick={toggleMute}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${!muteAudio ? 'bg-[#1D1D1F]' : 'bg-neutral-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${!muteAudio ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isHapticsOn ? 'bg-blue-100 text-blue-700' : 'bg-neutral-200 text-neutral-400'}`}>
                      {isHapticsOn ? <Icons.Vibrate className="w-4 h-4" /> : <Icons.VibrateOff className="w-4 h-4" />}
                    </div>
                    <span className="text-xs font-bold text-neutral-800 tracking-wide uppercase">{t.haptics_toggle}</span>
                  </div>
                  <button
                    onClick={toggleHaptics}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${isHapticsOn ? 'bg-[#1D1D1F]' : 'bg-neutral-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isHapticsOn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-6 max-h-[220px] overflow-y-auto pr-1">
                {[
                  { symKey: 'CircleFilled', label: t.info_sym1, desc: t.info_sym1_desc || Translations['en'].info_sym1_desc },
                  { symKey: 'CircleEmpty', label: t.info_sym1_neg, desc: t.info_sym1_neg_desc || Translations['en'].info_sym1_neg_desc },
                  { symKey: 'TriangleUp', label: t.info_sym2, desc: t.info_sym2_desc || Translations['en'].info_sym2_desc },
                  { symKey: 'TriangleDown', label: t.info_sym2_neg, desc: t.info_sym2_neg_desc || Translations['en'].info_sym2_neg_desc },
                  { symKey: 'Mul2', label: t.info_sym5, desc: t.info_sym5_desc || Translations['en'].info_sym5_desc },
                  { symKey: 'Div2', label: t.info_sym6, desc: t.info_sym6_desc || Translations['en'].info_sym6_desc },
                  { symKey: 'Prev1', label: t.info_sym3, desc: t.info_sym3_desc || Translations['en'].info_sym3_desc },
                  { symKey: 'ReverseNext', label: t.info_sym7, desc: t.info_sym7_desc || Translations['en'].info_sym7_desc },
                  { symKey: 'InvertAll', label: t.info_sym9, desc: t.info_sym9_desc || Translations['en'].info_sym9_desc },
                  { symKey: 'Star', label: t.info_sym8, desc: t.info_sym8_desc || Translations['en'].info_sym8_desc },
                  { symKey: 'Heart', label: t.info_sym10, desc: t.info_sym10_desc || Translations['en'].info_sym10_desc },
                  { symKey: 'Prev2', label: t.info_sym4, desc: t.info_sym4_desc || Translations['en'].info_sym4_desc },
                ].map((item, i) => (
                  <div key={`info-${item.symKey}-${i}`} className="flex items-start gap-3 bg-neutral-50/80 p-3 rounded-2xl border border-neutral-100 shadow-sm">
                    <div className="w-10 h-10 bg-white shrink-0 shadow-sm rounded-xl border border-neutral-200 flex items-center justify-center">
                      <GameSymbol type={item.symKey as SymbolType} size="small" />
                    </div>
                    <div className="flex flex-col flex-1 pt-0.5">
                      <span className="text-[10px] sm:text-xs font-black text-neutral-800 uppercase tracking-widest">{item.label}</span>
                      <span className="text-[9px] sm:text-[10px] font-medium text-neutral-500 leading-tight mt-0.5">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mb-6">
                <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase block mb-1">{t.info_dev}</span>
                <span className="text-sm font-bold text-[#1D1D1F]">ARCN Games</span>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => window.open('https://your-privacy-policy-link-here.com', '_blank')} className="w-full py-2 bg-neutral-50 text-blue-500 rounded-xl font-bold tracking-wider text-xs md:text-sm hover:bg-neutral-100 border border-neutral-200">
                  {t.privacy_policy || "Gizlilik Politikası (Privacy Policy)"} ↗
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEADERBOARD MODAL */}
      <AnimatePresence>
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 pointer-events-auto">
            <motion.div
              key="lb-modal"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-[360px] shadow-2xl flex flex-col overflow-hidden max-h-[85dvh]"
            >
              <div className="flex justify-between items-center p-4 border-b border-neutral-100 shrink-0">
                <h2 className="text-xl font-black text-[#1D1D1F] flex items-center gap-2"><Icons.Trophy className="w-6 h-6 text-amber-500" /> {t.lb_title}</h2>
                <button onClick={() => setShowLeaderboard(false)} className="w-9 h-9 flex items-center justify-center bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors">
                  <span className="font-bold text-neutral-400 text-xs">✕</span>
                </button>
              </div>

              <div className="flex border-b border-neutral-100 shrink-0">
                {(['daily', 'weekly', 'alltime'] as const).map(t => (
                  <button
                    key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-[10px] sm:text-xs font-black tracking-widest uppercase transition-colors relative ${tab === t ? 'text-[#1D1D1F]' : 'text-neutral-300 hover:text-neutral-500'}`}
                  >
                    {tabLabels[t]}
                    {tab === t && (
                      <motion.div
                        layoutId="tabIndicator"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                        className="absolute bottom-0 inset-x-4 h-[3px] bg-[#1D1D1F] rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-3 overflow-y-auto w-full min-h-[320px] bg-neutral-50/50">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[250px] gap-3">
                    <div className="w-8 h-8 border-4 border-neutral-200 border-t-[#1D1D1F] rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">{t.lb_loading}</span>
                  </div>
                ) : scores.length === 0 ? (
                  <div className="text-center flex flex-col items-center justify-center h-full min-h-[250px]">
                    <span className="text-4xl mb-3 block">🎯</span>
                    <p className="text-neutral-400 font-semibold text-sm">{t.lb_empty}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scores.map((entry, idx) => {
                      const isMe = personalRankData?.row.player_name === entry.player_name;
                      return (
                        <div key={entry.id} className={`flex items-center gap-3 p-2 sm:p-3 rounded-xl transition ${isMe ? 'bg-blue-50 border-2 border-blue-400 shadow-sm z-10 relative' : idx === 0 ? 'bg-yellow-50 border border-yellow-400 shadow-sm' : idx === 1 ? 'bg-slate-50 border border-slate-300 shadow-sm' : idx === 2 ? 'bg-orange-50 border border-orange-400 shadow-sm' : 'bg-white border border-transparent'}`}>
                          <div className={`relative flex items-center justify-center font-black shrink-0 ${isMe ? 'bg-blue-400 text-white shadow-md ring-2 ring-blue-100 w-8 h-8 rounded-full text-sm' : idx === 0 ? 'bg-yellow-400 text-yellow-950 border-2 border-yellow-200 shadow-md w-8 h-8 rounded-full text-sm' : idx === 1 ? 'bg-slate-200 text-slate-800 border-2 border-slate-100 shadow-sm w-7 h-7 rounded-full text-xs' : idx === 2 ? 'bg-orange-400 text-orange-950 border-2 border-orange-200 shadow-sm w-7 h-7 rounded-full text-xs' : 'bg-neutral-100 text-neutral-500 w-6 h-6 rounded-full text-[10px]'}`}>
                            {idx === 0 && <span className="absolute -top-3 -right-1 text-sm drop-shadow-sm">👑</span>}
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0 pr-1">
                            <span className={`font-bold text-xs sm:text-sm block truncate flex items-center gap-1 ${isMe ? 'text-blue-800' : ''}`}>
                              {entry.country_code && <span className="text-[10px]">{entry.country_code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))}</span>}
                              {entry.player_name}
                              {isMe && <span className="text-[9px] ml-1 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{t.lb_you || "(Sen)"}</span>}
                            </span>
                            <span className={`text-[9px] sm:text-[10px] font-medium ${isMe ? 'text-blue-400/80' : 'text-neutral-400'}`}>{Leaderboard.formatDate(entry.created_at)}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-black text-xs sm:text-sm block ${isMe ? 'text-blue-800' : ''}`}>{t.lb_b_level} {entry.level}</span>
                            <span className={`text-[9px] sm:text-[10px] font-semibold ${isMe ? 'text-blue-400/80' : 'text-neutral-400'}`}>{Leaderboard.formatTime(entry.total_time)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {personalRankData && !scores.some(s => s.player_name === personalRankData.row.player_name) && (
                      <>
                        <div className="my-2 border-t-2 border-dashed border-neutral-200"></div>
                        <div className="flex items-center gap-2 p-2 sm:p-3 rounded-xl bg-blue-50 border border-blue-100">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 bg-blue-400 text-white shadow-sm ring-2 ring-blue-100">
                            {personalRankData.rank > 999 ? '999+' : personalRankData.rank}
                          </span>
                          <div className="flex-1 min-w-0 pr-1">
                            <span className="font-bold text-xs sm:text-sm text-blue-800 block truncate flex items-center gap-1">
                              {personalRankData.row.country_code && <span className="text-[10px]">{personalRankData.row.country_code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))}</span>}
                              {personalRankData.row.player_name} <span className="text-[9px] ml-1 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{t.lb_you || "(Sen)"}</span>
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-blue-400/80 font-medium">{Leaderboard.formatDate(personalRankData.row.created_at)}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-xs sm:text-sm block text-blue-800">{t.lb_b_level} {personalRankData.row.level}</span>
                            <span className="text-[9px] sm:text-[10px] text-blue-400/80 font-semibold">{Leaderboard.formatTime(personalRankData.row.total_time)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── GAME OVER SCREEN ──────────────────────────────────────
function GameOverScreen({
  level, totalTimeSpent, expected, isDevMode, hasRevivedInCurrentGame, goToMenu, onAdError,
  gameMode, timeAttackScore, memoryScore, onPlayAgain,
  isDuel, duelWinner, duelMyScore, duelOpponentName, duelOpponentScore, onPlayDuelAgain,
  duelRematchRequested, duelOpponentRematchPending, duelOpponentLeft
}: {
  level: number; totalTimeSpent: number; expected: number; isDevMode: boolean; hasRevivedInCurrentGame: boolean; goToMenu: () => void;
  onAdError?: () => void;
  gameMode: GameMode;
  timeAttackScore: number;
  memoryScore: number;
  onPlayAgain: () => void;
  isDuel?: boolean;
  duelWinner?: 'ME' | 'OPPONENT' | null;
  duelMyScore?: number;
  duelOpponentName?: string;
  duelOpponentScore?: number;
  onPlayDuelAgain?: () => void;
  duelRematchRequested?: boolean;
  duelOpponentRematchPending?: boolean;
  duelOpponentLeft?: boolean;
}) {
  const { language, coins, addCoins } = useGameStore();
  const t = Translations[language];
  const hasSavedName = !!Leaderboard.getPlayerName();
  const [playerName, setPlayerName] = useState(Leaderboard.getPlayerName() || '');
  const [showInput] = useState(!hasSavedName);
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  useEffect(() => {
    haptic.cancel();
    Leaderboard.fetchAndCacheCountry();
    if (!isDevMode && gameMode === 'CLASSIC' && !isDuel) {
      const newBest = Leaderboard.updatePersonalBest(level, totalTimeSpent);
      if (newBest) setIsNewBest(true);
    }
  }, [level, totalTimeSpent, isDevMode, gameMode, isDuel]);

  // DUEL GAME OVER VIEW
  if (isDuel || gameMode === 'DUEL') {
    const won = duelWinner === 'ME';
    const hasEnoughCoins = coins >= 25;

    return (
      <div className="min-h-[100dvh] bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center font-sans selection:bg-neutral-200 p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white p-6 rounded-[2.5rem] shadow-2xl w-full max-w-[340px] border border-neutral-100 relative overflow-hidden">
          <div className={`absolute top-0 inset-x-0 h-2 ${won ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

          {/* Top Live Coin Balance */}
          <div className="flex items-center justify-center gap-1.5 mb-3 bg-neutral-100/90 px-3 py-1 rounded-full text-xs font-black text-neutral-800 w-fit mx-auto border border-neutral-200/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">{t.coins_title || 'Bakiye'}:</span>
            <span className="tabular-nums font-black text-xs text-neutral-900 flex items-center gap-1">
              <RollingNumber value={coins} /> 🪙
            </span>
          </div>

          <div className={`w-14 h-14 ${won ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'} rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm`}>
            {won ? <Icons.Trophy className="w-7 h-7" /> : <Icons.Swords className="w-7 h-7" />}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-neutral-900 mb-1">
            {won ? t.duel_victory : t.duel_defeat}
          </h1>

          {/* Clear Stake / Reward Breakdown */}
          <div className="flex flex-col items-center justify-center mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
              won ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs' : 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs'
            }`}>
              <span>🪙</span>
              <span>{won ? `+100 COIN (${t.duel_net || 'Net'} +75)` : '-25 COIN'}</span>
            </span>
            <span className="text-[10px] font-bold text-neutral-400 mt-1">
              {won ? (t.duel_stake_win_breakdown || '25 Coin giriş iadesi + 75 Coin galibiyet ödülü') : (t.duel_stake_loss_breakdown || 'Düello giriş ücreti kesildi')}
            </span>
          </div>

          {/* Scores comparison */}
          <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100 mb-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-neutral-500 uppercase tracking-wider">{t.duel_you || 'SEN'}</span>
              <span className={`text-xl font-black ${won ? 'text-emerald-600' : 'text-neutral-800'}`}>{duelMyScore}</span>
            </div>
            <div className="border-t border-neutral-200/60" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-neutral-500 uppercase tracking-wider truncate max-w-[150px]">{duelOpponentName}</span>
              <span className={`text-xl font-black ${!won ? 'text-rose-600' : 'text-neutral-800'}`}>{duelOpponentScore}</span>
            </div>
          </div>

          {/* Short Reason Badge */}
          <div className={`mb-3 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border ${
            won ? 'bg-emerald-50/60 text-emerald-700 border-emerald-200/40' : 'bg-rose-50/60 text-rose-700 border-rose-200/40'
          }`}>
            <span>{won ? '🎯' : '⚠️'}</span>
            <span>{won ? (t.duel_reason_opponent_out || 'Rakip elendi') : (t.duel_reason_you_out || 'Hata yaptın')}</span>
          </div>

          {/* Opponent Left Notice */}
          {duelOpponentLeft && (
            <div className="mb-3 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black text-rose-600 uppercase tracking-wider">
              {t.duel_opponent_left || 'Rakip odadan ayrıldı.'}
            </div>
          )}

          {/* Insufficient Coins Notice on GameOver */}
          {!hasEnoughCoins && !duelOpponentLeft && (
            <div className="mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 flex flex-col gap-2 text-center">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wide">
                ⚠️ {t.duel_insufficient_coins}
              </span>
              <button
                onClick={async () => {
                  setIsWatchingAd(true);
                  haptic.selection();
                  const res = await Ads.showRewardedAd();
                  setIsWatchingAd(false);
                  if (res.success) {
                    addCoins(50);
                    haptic.notification('success');
                    playSound('success');
                  }
                }}
                disabled={isWatchingAd}
                className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-neutral-900 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all disabled:opacity-50"
              >
                <span>📺</span>
                <span>{isWatchingAd ? '...' : t.duel_watch_ad_coins}</span>
              </button>
            </div>
          )}

          {/* Rematch Actions */}
          {!duelOpponentLeft && (
            <div className="w-full mb-2.5">
              {duelRematchRequested ? (
                <div className="w-full py-3 bg-neutral-100 border border-neutral-200 text-neutral-600 rounded-2xl font-black tracking-wider text-xs flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-neutral-800 rounded-full animate-spin shrink-0" />
                  <span>{t.duel_rematch_requested || 'İstek Gönderildi...'}</span>
                </div>
              ) : duelOpponentRematchPending ? (
                <div className="w-full flex flex-col gap-2">
                  <div className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center gap-2 text-[11px] font-black text-amber-800 uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                    <span className="truncate">{t.duel_opponent_wants_rematch || 'Rakip Rövanş İstiyor!'}</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: hasEnoughCoins ? 0.96 : 1 }}
                    onClick={hasEnoughCoins ? onPlayDuelAgain : undefined}
                    disabled={!hasEnoughCoins}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
                      hasEnoughCoins
                        ? 'bg-neutral-900 hover:bg-black text-white hover:scale-[1.01] active:scale-95'
                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Icons.Swords className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{t.duel_accept || 'KABUL ET'}</span>
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: hasEnoughCoins ? 0.96 : 1 }}
                  onClick={hasEnoughCoins ? onPlayDuelAgain : undefined}
                  disabled={!hasEnoughCoins}
                  className={`w-full py-3.5 rounded-2xl font-black tracking-wider text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                    hasEnoughCoins
                      ? 'bg-neutral-900 hover:bg-black text-white hover:scale-[1.01] active:scale-95'
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Icons.Swords className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t.duel_rematch || 'RÖVANŞ OYNA'}</span>
                </motion.button>
              )}
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={goToMenu}
            className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl font-black tracking-wider text-xs transition-colors"
          >
            {t.gameover_menu}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // TIME ATTACK GAME OVER VIEW
  if (gameMode === 'TIME_ATTACK') {
    const isNewRecord = timeAttackScore >= useGameStore.getState().timeAttackBest && timeAttackScore > 0;
    return (
      <div className="min-h-[100dvh] bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center font-sans selection:bg-neutral-200 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white p-6 rounded-[2.5rem] shadow-2xl w-full max-w-[340px] border border-neutral-100 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-amber-500"></div>

          {isNewRecord && (
            <motion.div initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1 inline-flex items-center gap-1.5 font-black text-[10px] tracking-widest mb-3"
            >
              <span>⚡</span> {t.new_record}
            </motion.div>
          )}

          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Icons.Zap className="w-7 h-7 fill-amber-500" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#1D1D1F] mb-1">{t.gameover_time_up}</h1>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-5">
            {t.mode_time_attack}
          </p>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 mb-6 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">{t.gameover_solved}</span>
              <span className="text-3xl font-black text-amber-500">{timeAttackScore}</span>
            </div>
            <div className="border-t border-neutral-200/60" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">{t.gameover_best}</span>
              <span className="text-lg font-black text-neutral-800">{useGameStore.getState().timeAttackBest}</span>
            </div>
          </div>

          <button
            onClick={onPlayAgain}
            className="w-full py-4 bg-[#1D1D1F] text-white rounded-2xl font-black tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all mb-2.5 flex items-center justify-center gap-2"
          >
            <Icons.Play className="w-4 h-4 fill-current" />
            <span>{t.gameover_retry}</span>
          </button>

          <button
            onClick={goToMenu}
            className="w-full py-3 bg-neutral-100 text-neutral-500 rounded-2xl font-black tracking-widest text-xs hover:bg-neutral-200 transition-colors"
          >
            {t.gameover_menu}
          </button>
        </motion.div>
      </div>
    );
  }

  // MEMORY MODE GAME OVER VIEW
  if (gameMode === 'MEMORY') {
    const isNewRecord = memoryScore >= useGameStore.getState().memoryBest && memoryScore > 0;
    return (
      <div className="min-h-[100dvh] bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center font-sans selection:bg-neutral-200 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white p-6 rounded-[2.5rem] shadow-2xl w-full max-w-[340px] border border-neutral-100 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-blue-500"></div>

          {isNewRecord && (
            <motion.div initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-3 py-1 inline-flex items-center gap-1.5 font-black text-[10px] tracking-widest mb-3"
            >
              <span>🧠</span> {t.gameover_newbest || 'YENİ REKOR!'}
            </motion.div>
          )}

          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Icons.EyeOff className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#1D1D1F] mb-1">{t.gameover_title}</h1>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            {t.mode_memory}
          </p>

          <p className="text-[11px] text-neutral-400 font-bold mb-4 uppercase tracking-tight">
            {t.gameover_correct} <strong className="text-black text-lg ml-1">{expected > 0 ? `+${expected}` : expected}</strong>
          </p>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 mb-6 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">{t.gameover_solved}</span>
              <span className="text-3xl font-black text-blue-600">{memoryScore}</span>
            </div>
            <div className="border-t border-neutral-200/60" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">{t.gameover_best}</span>
              <span className="text-lg font-black text-neutral-800">{useGameStore.getState().memoryBest}</span>
            </div>
          </div>

          <button
            onClick={onPlayAgain}
            className="w-full py-4 bg-[#1D1D1F] text-white rounded-2xl font-black tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all mb-2.5 flex items-center justify-center gap-2"
          >
            <Icons.Play className="w-4 h-4 fill-current" />
            <span>{t.gameover_retry}</span>
          </button>

          <button
            onClick={goToMenu}
            className="w-full py-3 bg-neutral-100 text-neutral-500 rounded-2xl font-black tracking-widest text-xs hover:bg-neutral-200 transition-colors"
          >
            {t.gameover_menu}
          </button>
        </motion.div>
      </div>
    );
  }

  const handleSaveScore = async () => {
    if (isDevMode) { goToMenu(); return; }
    const name = playerName.trim();
    if (!name) { setErrorMsg(t.name_empty); return; }

    setIsChecking(true);
    setErrorMsg('');

    const savedName = Leaderboard.getPlayerName();
    if (name !== savedName) {
      const taken = await Leaderboard.isNameTaken(name);
      if (taken) {
        setErrorMsg(t.name_taken);
        setIsChecking(false);
        return;
      }
    }

    await Leaderboard.addScore(name, level, totalTimeSpent);
    Leaderboard.setPlayerName(name); // Persist name to device locally!
    setSaved(true);
    setIsChecking(false);
  };

  const [isWatchingRevive, setIsWatchingRevive] = useState(false);
  const { reviveGame } = useGameStore();

  const handleRevive = async () => {
    setIsWatchingRevive(true);
    const result = await Ads.showRewardedAd();
    setIsWatchingRevive(false);
    if (result.success) {
      reviveGame();
    } else {
      onAdError?.();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center font-sans selection:bg-neutral-200 p-2 sm:p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white p-5 sm:p-6 rounded-[2rem] shadow-2xl w-full max-w-[320px] border border-neutral-100 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-2 bg-red-500"></div>

        {isNewBest && (
          <motion.div initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1 inline-flex items-center gap-1.5 font-bold text-[10px] tracking-widest mb-3 mt-1"
          >
            <span>🏆</span> {t.gameover_newbest}
          </motion.div>
        )}

        <h1 className="text-3xl font-black tracking-tighter mb-1 text-red-500 mt-1">{t.gameover_title}</h1>
        <p className="text-[11px] text-neutral-400 font-bold mb-4 uppercase tracking-tight">
          {t.gameover_correct} <strong className="text-black text-lg ml-1">{expected > 0 ? `+${expected}` : expected}</strong>
        </p>

        <div className="flex flex-col gap-1 mb-4 text-left bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
          <div className="flex justify-between items-center">
            <span className="text-neutral-400 font-bold text-[9px] tracking-widest uppercase">{t.gameover_reached}</span>
            <span className="text-xl font-black">{level}</span>
          </div>
          <div className="border-t border-neutral-200/40 my-0.5"></div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400 font-bold text-[9px] tracking-widest uppercase">{t.gameover_time}</span>
            <span className="text-xl font-black">{isDevMode ? 'N/A' : Leaderboard.formatTime(totalTimeSpent)}</span>
          </div>
        </div>

        {!saved && !isDevMode ? (
          <div className="mb-2">
            {showInput ? (
              <div className="mb-3">
                <input
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder={t.gameover_name_placeholder}
                  maxLength={15}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-center text-sm outline-none focus:border-amber-400 focus:bg-white transition"
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveScore(); }}
                />
                <AnimatePresence>
                  {errorMsg && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[10px] mt-1 font-bold">{errorMsg}</motion.p>}
                </AnimatePresence>
              </div>
            ) : (
              <div className="mb-3 bg-neutral-100 rounded-xl px-4 py-3 flex items-center justify-center">
                <span className="font-black text-xs block truncate text-[#1D1D1F] uppercase tracking-wider">{playerName}</span>
                {/* 1 Cihaz 1 Kullanıcı: İsim değiştirme butonunu kaldırdık */}
              </div>
            )}

            <button
              onClick={handleSaveScore}
              disabled={isChecking}
              className={`w-full py-3.5 text-white rounded-2xl font-black tracking-widest text-xs shadow-lg transition-all ${isChecking ? 'bg-neutral-400 scale-95 pointer-events-none' : 'bg-[#1D1D1F] hover:scale-[1.02] active:scale-95'}`}
            >
              {isChecking ? t.gameover_save_checking : t.gameover_save_btn}
            </button>

            <button
              onClick={goToMenu}
              className="w-full mt-2.5 py-1 text-[9px] font-bold tracking-widest text-neutral-400 uppercase hover:text-neutral-700 transition"
            >
              {t.gameover_skip}
            </button>
          </div>
        ) : (
          <button
            onClick={() => goToMenu()}
            className="w-full py-3.5 bg-[#1D1D1F] text-white rounded-2xl font-black tracking-widest text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all mt-1"
          >
            {t.gameover_menu}
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-neutral-100 w-full">
          {!hasRevivedInCurrentGame ? (
            <>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">{t.gameover_revive_title}</p>
              <button
                onClick={handleRevive}
                disabled={isWatchingRevive}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-2xl font-black tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-amber-100"
              >
                {isWatchingRevive ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Icons.Play className="w-4 h-4" /> {t.gameover_revive_btn}</>
                )}
              </button>
            </>
          ) : (
            <div className="py-2 px-3 bg-neutral-100 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">{t.gameover_revive_used_title}</p>
              <p className="text-[9px] text-neutral-400 mt-1">{t.gameover_revive_used_desc}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const {
    gameState, gameMode, level, totalTimeSpent, currentValue, timeLeft, maxTime, coins, previousAnswers, hideIntro, isDevMode, hasRevivedInCurrentGame, language,
    timeAttackScore, memoryScore, timeAttackBest, memoryBest,
    streak, helpCount, langsUsed, dailyRewardsToday, lastRewardTime,
    startNewLevel, setCurrentValue, tickTimer, addLevelTime, setHideIntro, startGame, goToMenu, resetStreak, unlockMedal, claimDailyReward, devAdvanceLevel,
    incrementModeScore
  } = useGameStore();
  const t = Translations[language];

  const [sequence, setSequence] = useState<SymbolType[]>([]);
  const [expected, setExpected] = useState<number>(0);
  const [showSolution, setShowSolution] = useState(false);
  const [hasPaidForSolution, setHasPaidForSolution] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showCompanySplash, setShowCompanySplash] = useState(true);

  // New Modals
  const [showBrainStats, setShowBrainStats] = useState(false);
  const [showDuel, setShowDuel] = useState(false);

  // 1v1 Real-Time Duel State
  const activeRematchSeedRef = useRef<number | null>(null);
  const memoryTimerRef = useRef<any>(null);
  const duelSeedRef = useRef<number | null>(null);
  const duelRewardHandledRef = useRef(false);
  const duelCleanupTimerRef = useRef<any>(null);
  const lastPulsedSecondRef = useRef<number | null>(null);

  const clearMemoryTimer = () => {
    if (memoryTimerRef.current) {
      clearTimeout(memoryTimerRef.current);
      memoryTimerRef.current = null;
    }
  };
  const [isDuelActive, setIsDuelActive] = useState(false);
  const [duelCountdown, setDuelCountdown] = useState<number | null>(null);
  const [pendingRematchInvite, setPendingRematchInvite] = useState<{
    roomCode: string;
    opponentName: string;
  } | null>(null);
  const [duelOpponent, setDuelOpponent] = useState<OpponentInfo | null>(null);
  const [duelSeed, setDuelSeed] = useState<number | null>(null);
  const [duelRoomCode, setDuelRoomCode] = useState<string>('');
  const [duelMyScore, setDuelMyScore] = useState(0);
  const [duelOpponentScore, setDuelOpponentScore] = useState(0);
  const [duelWinner, setDuelWinner] = useState<'ME' | 'OPPONENT' | null>(null);
  const [duelRematchRequested, setDuelRematchRequested] = useState(false);
  const [duelOpponentRematchPending, setDuelOpponentRematchPending] = useState(false);
  const [duelOpponentLeft, setDuelOpponentLeft] = useState(false);

  const startDuelCountdown = () => {
    setDuelCountdown(3);
    playSound('tick');
    haptic.impact('medium');
    const cdInterval = setInterval(() => {
      setDuelCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(cdInterval);
          playSound('success');
          haptic.notification('success');
          return null;
        }
        playSound('tick');
        haptic.impact('light');
        return prev - 1;
      });
    }, 1000);
  };

  // Visual Feedback & Juiciness
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);
  const [isErrorShake, setIsErrorShake] = useState(false);
  const [isMemoryMasked, setIsMemoryMasked] = useState(false);
  const [isWatchingHintAd, setIsWatchingHintAd] = useState(false);

  // Modals
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showDailyRewardGlobal, setShowDailyRewardGlobal] = useState(false);
  const [showSuccessGlobal, setShowSuccessGlobal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMedals, setShowMedals] = useState(false);
  const [selectedMedal, setSelectedMedal] = useState<any>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [introCheckbox, setIntroCheckbox] = useState(hideIntro);
  const [isWatchingDaily, setIsWatchingDaily] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [showComboAnim, setShowComboAnim] = useState(false);
  const [lastCombo, setLastCombo] = useState(0);
  const [lastComboBonus, setLastComboBonus] = useState(0);

  useEffect(() => {
    const handleAdStart = () => ambientMusic?.stop();
    const handleAdEnd = () => { if (!isMuted() && audioCtx?.state === 'running') ambientMusic?.play(); };
    window.addEventListener('onZekaAdShow', handleAdStart);
    window.addEventListener('onZekaAdClose', handleAdEnd);
    return () => {
      window.removeEventListener('onZekaAdShow', handleAdStart);
      window.removeEventListener('onZekaAdClose', handleAdEnd);
      clearMemoryTimer();
    };
  }, []);

  useEffect(() => {
    if (showComboAnim) {
      const timer = setTimeout(() => setShowComboAnim(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showComboAnim]);

  useEffect(() => {
    if (adError) {
      const timer = setTimeout(() => setAdError(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [adError]);

  // Handle Company Splash Timing (2 seconds as requested)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCompanySplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // BACK BUTTON HANDLING (CAPACITOR)
  useEffect(() => {
    let backListener: any;
    const setup = async () => {
      backListener = await CapApp.addListener('backButton', () => {
        // Priorities: Close modals -> Pause menu -> Go to main menu -> Exit app
        if (showExitConfirm) setShowExitConfirm(false);
        else if (showTutorialModal) setShowTutorialModal(false);
        else if (showIntroModal) setShowIntroModal(false);
        else if (showTrackingModal) setShowTrackingModal(false);
        else if (showDailyRewardGlobal) setShowDailyRewardGlobal(false);
        else if (showInfo) setShowInfo(false);
        else if (showLeaderboard) setShowLeaderboard(false);
        else if (showMedals) setShowMedals(false);
        else if (selectedMedal) setSelectedMedal(null);
        else if (showSuccessGlobal) setShowSuccessGlobal(false);
        else if (gameState === 'PLAYING') {
          // If in game, show exit confirmation instead of instant exit/pause
          setShowExitConfirm(true);
        } else if (gameState === 'GAMEOVER') {
          goToMenu();
        } else {
          try { CapApp.exitApp(); } catch (e) { }
        }
      });
    };
    setup();
    return () => { if (backListener) backListener.remove(); };
  }, [showTutorialModal, showIntroModal, showTrackingModal, showDailyRewardGlobal, showSuccessGlobal, showExitConfirm, showInfo, showLeaderboard, showMedals, selectedMedal, gameState, isPaused]);

  useEffect(() => {
    // Reset state immediately on level/state change to ensure clean transition
    setShowSolution(false);
    setIsPaused(false);
    
    if (gameState === 'PLAYING') {
      if (level === 1 && !hideIntro) {
        setShowIntroModal(true);
        playSound('intro');
      } else if (level > 1 && isTutorialLevel(level)) {
        setShowTutorialModal(true);
        playSound('intro');
      } else {
        initLevel();
      }
    } else {
      // Start ambient music only if splash is over and in menu
      if (!showCompanySplash && gameState === 'MENU') {
        initAudio();
      }
      // Reset game-local UI states when not in playing mode
      setShowTutorialModal(false);
      setShowIntroModal(false);
    }
  }, [level, gameState, hideIntro, showCompanySplash]);



  useEffect(() => {
    let interval: number;
    const isModalOpen = showTutorialModal || showIntroModal; // Intentionally excluding showExitConfirm so timer keeps running
    if (gameState === 'PLAYING' && !isPaused && !isModalOpen && !isDevMode && duelCountdown === null) {
      interval = setInterval(() => {
        tickTimer(0.1);
        if (useGameStore.getState().timeLeft <= 0) {
          setShowExitConfirm(false); // Close modal if time runs out
          if (isDuelActive || gameMode === 'DUEL') {
            if (!DuelService.isFinished()) {
              DuelService.reportForfeit();
              setDuelWinner('OPPONENT');
            }
          }
          handleGameOver();
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState, isPaused, showTutorialModal, showIntroModal, isDevMode, isDuelActive, gameMode, duelCountdown]);

  useEffect(() => {
    if (gameState !== 'PLAYING') {
      lastPulsedSecondRef.current = null;
      haptic.cancel();
      return;
    }

    const isModalOpen = showTutorialModal || showIntroModal || showExitConfirm;
    if (isPaused || isModalOpen || isDevMode || duelCountdown !== null) return;

    const currentSec = Math.floor(timeLeft);
    if (currentSec <= 0) return;

    if (currentSec !== lastPulsedSecondRef.current) {
      lastPulsedSecondRef.current = currentSec;

      // In Duel Mode: Pulse strictly in sync with each second countdown
      if (isDuelActive || gameMode === 'DUEL') {
        haptic.impact('light');
      }

      // Audio tick during final 5 seconds
      if (currentSec <= 5) {
        playSound('tick');
      }
    }
  }, [Math.floor(timeLeft), gameState, isPaused, showTutorialModal, showIntroModal, showExitConfirm, isDevMode, duelCountdown, isDuelActive, gameMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModalOpen = showTutorialModal || showIntroModal || showExitConfirm;
      if (gameState !== 'PLAYING' || isPaused || isModalOpen || duelCountdown !== null) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        adjustValue(1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        adjustValue(-1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSubmission();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, showTutorialModal, showIntroModal, showExitConfirm, currentValue, expected, isSubmitting]);

  useEffect(() => {
    const s = useGameStore.getState();
    const stats = {
      level: s.level,
      coins: s.coins,
      streak: s.streak,
      helpCount: s.helpCount,
      langsUsed: s.langsUsed.length,
      achievementsCount: s.medals.length,
      totalTimeSpent: s.totalTimeSpent,
      lastTime: s.lastLevelTime,
      dailyRewardsTotal: s.dailyRewardsTotal,
    };
    ACHIEVEMENTS.forEach(med => {
      if (!s.medals.includes(med.id) && med.condition(stats)) {
        unlockMedal(med.id);
      }
    });
  }, [level, coins, streak, helpCount, langsUsed.length, totalTimeSpent]);

  const handleReturnToMenu = () => {
    haptic.cancel();
    clearMemoryTimer();
    activeRematchSeedRef.current = null;
    if ((isDuelActive || gameMode === 'DUEL') && gameState === 'PLAYING') {
      DuelService.reportForfeit();
    }
    // Clean up duel immediately to stop any polling or background vibrations
    if (duelCleanupTimerRef.current) {
      clearTimeout(duelCleanupTimerRef.current);
      duelCleanupTimerRef.current = null;
    }
    DuelService.cleanup();
    goToMenu();
    setIsDuelActive(false);
    setDuelWinner(null);
    setDuelRematchRequested(false);
    duelRewardHandledRef.current = false;
    setPendingRematchInvite(null);
    setDuelOpponentRematchPending(false);
  };

  const handleStartGame = (asDev = false, startLevel?: number, mode?: GameMode) => {
    haptic.cancel();
    clearMemoryTimer();
    activeRematchSeedRef.current = null;
    if (duelCleanupTimerRef.current) {
      clearTimeout(duelCleanupTimerRef.current);
      duelCleanupTimerRef.current = null;
    }
    DuelService.cleanup();
    setIsDuelActive(false);
    setPendingRematchInvite(null);
    setShowSolution(false);
    setHasPaidForSolution(false);
    startGame(asDev, startLevel, mode);
  };

  const awardDuelWin = () => {
    if (duelRewardHandledRef.current) return;
    duelRewardHandledRef.current = true;
    useGameStore.getState().addCoins(100);
  };

  const startRematchSession = (newSeed: number) => {
    // Idempotency check: don't start or charge again if already active for this seed!
    if (activeRematchSeedRef.current === newSeed) return;
    activeRematchSeedRef.current = newSeed;

    if (useGameStore.getState().coins < 25) {
      haptic.notification('error');
      playSound('fail');
      return;
    }

    clearMemoryTimer();
    if (duelCleanupTimerRef.current) {
      clearTimeout(duelCleanupTimerRef.current);
      duelCleanupTimerRef.current = null;
    }
    setPendingRematchInvite(null);
    useGameStore.getState().spendCoins(25);
    setIsDuelActive(true);
    duelSeedRef.current = newSeed;
    setDuelSeed(newSeed);
    setDuelMyScore(0);
    setDuelOpponentScore(0);
    setDuelWinner(null);
    setDuelRematchRequested(false);
    setDuelOpponentRematchPending(false);
    setDuelOpponentLeft(false);
    duelRewardHandledRef.current = false;
    setShowSolution(false);
    setHasPaidForSolution(false);
    haptic.notification('success');
    playSound('success');
    startGame(false, 1, 'DUEL');
    startDuelCountdown();
  };

  const handleDuelRematchRequest = async () => {
    if (duelRematchRequested) return;
    if (useGameStore.getState().coins < 25) {
      haptic.notification('error');
      playSound('fail');
      return;
    }
    setDuelRematchRequested(true);
    haptic.impact('medium');
    playSound('click');

    const res = await DuelService.requestRematch();
    if (res.started && typeof res.seed === 'number') {
      startRematchSession(res.seed);
    }
  };

  const handleStartDuel = (payload: StartDuelPayload) => {
    if (useGameStore.getState().coins < 25) {
      haptic.notification('error');
      playSound('fail');
      return;
    }
    clearMemoryTimer();
    activeRematchSeedRef.current = null;
    if (duelCleanupTimerRef.current) {
      clearTimeout(duelCleanupTimerRef.current);
      duelCleanupTimerRef.current = null;
    }
    setPendingRematchInvite(null);
    setIsDuelActive(true);
    setDuelOpponent(payload.opponent);
    duelSeedRef.current = payload.seed;
    setDuelSeed(payload.seed);
    setDuelRoomCode(payload.roomCode);
    setDuelMyScore(0);
    setDuelOpponentScore(0);
    setDuelWinner(null);
    setDuelRematchRequested(false);
    setDuelOpponentRematchPending(false);
    setDuelOpponentLeft(false);
    duelRewardHandledRef.current = false;
    setShowDuel(false);
    setShowSolution(false);
    setHasPaidForSolution(false);

    // Stake 25 coins entry fee
    useGameStore.getState().spendCoins(25);

    DuelService.setGameCallbacks({
      onOpponentScore: (score) => {
        setDuelOpponentScore(score);
        haptic.impact('light');
        playSound('tick');
      },
      onMatchFinish: (_winnerId, isWinner, finalOppScore) => {
        setDuelOpponentScore(finalOppScore);
        setDuelWinner((prev) => {
          if (prev === 'ME') return 'ME';
          return isWinner ? 'ME' : 'OPPONENT';
        });
        if (isWinner) {
          awardDuelWin();
          handleGameOver(true);
        } else {
          handleGameOver(false);
        }
      },
      onRematchInvite: () => {
        setDuelOpponentRematchPending(true);
        haptic.notification('warning');
        playSound('click');
        if (useGameStore.getState().gameState === 'MENU') {
          setPendingRematchInvite({
            roomCode: payload.roomCode,
            opponentName: payload.opponent.name || t.duel_opponent || 'Opponent',
          });
        }
      },
      onRematchStart: (newSeed) => {
        startRematchSession(newSeed);
      },
      onOpponentQuit: () => {
        setDuelOpponentLeft(true);
        if (useGameStore.getState().gameState === 'PLAYING') {
          setDuelWinner('ME');
          awardDuelWin();
          handleGameOver(true);
        }
      },
    });

    startGame(false, 1, 'DUEL');
    startDuelCountdown();
  };

  // AUTO-SHOW TRACKING MODAL FOR NEW PLAYERS
  useEffect(() => {
    const hasSeenTracking = localStorage.getItem('tracking_seen_v1'); // New key to force reset
    if (!hasSeenTracking) {
      setTimeout(() => {
        setShowTrackingModal(true);
        localStorage.setItem('tracking_seen_v1', 'true');
      }, 500);
    }
  }, []);

  const initLevel = () => {
    clearMemoryTimer();
    let puzzle;
    const activeSeed = duelSeedRef.current ?? duelSeed;
    if (isDuelActive && activeSeed !== null) {
      const rng = createPRNG(activeSeed + level);
      puzzle = generatePuzzle(level, [0, 0], rng);
    } else {
      puzzle = generatePuzzle(level, previousAnswers);
    }
    setSequence(puzzle.sequence);
    setExpected(puzzle.expectedResult);
    setShowSolution(false);
    setHasPaidForSolution(false);
    setIsPaused(false);
    setIsMemoryMasked(false);
    startNewLevel();

    // In Memory Mode, mask symbols after exactly 2.0 seconds
    if (gameMode === 'MEMORY') {
      memoryTimerRef.current = setTimeout(() => {
        setIsMemoryMasked(true);
        memoryTimerRef.current = null;
      }, 2000);
    }
  };

  const handleGameOver = (isVictory = false) => {
    clearMemoryTimer();
    haptic.cancel(); // Stop any pending continuous or interval vibrations immediately
    if (!isVictory) {
      haptic.notification('error');
      playSound('fail');
    } else {
      haptic.notification('success');
      playSound('success');
    }
    resetStreak();
    setShowSolution(false); // Reset solution when entering GameOver
    useGameStore.setState({ gameState: 'GAMEOVER' });
  };

  const timePercent = isDevMode ? 100 : (timeLeft / maxTime) * 100;

  const handleLevelComplete = () => {
    clearMemoryTimer();
    playSound('success');
    setShowSolution(false); // Reset solution for the next level
    const timeSpent = Number((maxTime - timeLeft).toFixed(2));
    addLevelTime(timeSpent);
    useGameStore.setState({ lastLevelTime: timeSpent });
    useGameStore.getState().incrementStreak();
    
    // COMBO LOGIC
    const isCombo = timeSpent <= 5.0;
    if (isCombo) {
      useGameStore.getState().incrementCombo();
    } else {
      useGameStore.getState().resetCombo();
    }

    const currentCombo = useGameStore.getState().comboCount;
    const maxPassed = useGameStore.getState().maxLevelCompleted;
    const isNewLevel = level > maxPassed;
    
    let localCoinBonus = 0;

    if (isCombo) {
      if (isNewLevel) {
        // Tiered Bonus Logic (Linear Cap)
        if (currentCombo <= 3) localCoinBonus = 2;
        else if (currentCombo < 10) localCoinBonus = 5;
        else localCoinBonus = 10;
      } else {
        // Repeated level combo: +1, +2, +3... Max capped at 10 to avoid extreme farming
        localCoinBonus = Math.min(currentCombo, 10);
      }

      setLastCombo(currentCombo);
      setLastComboBonus(localCoinBonus);
      setShowComboAnim(false);
      setTimeout(() => setShowComboAnim(true), 10);
    } else {
      setShowComboAnim(false);
    }

    const nextLevel = level + 1;
    const currentCP = getCheckpointForLevel(level);
    const nextLevelCP = getCheckpointForLevel(nextLevel);

    // If we just reached a NEW checkpoint, save it (Only in non-dev mode and non-duel mode)
    if ((nextLevelCP > currentCP || nextLevel === 25) && !useGameStore.getState().isDevMode && !isDuelActive && gameMode !== 'DUEL') {
      const finalCP = nextLevelCP;
      const finalTime = totalTimeSpent + timeSpent;
      useGameStore.setState({ 
        checkpointLevel: finalCP,
        checkpointTime: finalTime
      });
      localStorage.setItem('zeka_checkpoint', String(finalCP));
      localStorage.setItem('zeka_checkpoint_time', String(finalTime));
    }

    // ANTI-FARMING: Reward Logic (Only for single-player)
    let earnedThisLevel = 0;

    if (!isDuelActive && gameMode !== 'DUEL') {
      if (isNewLevel) {
        earnedThisLevel = 5 + localCoinBonus;
        useGameStore.setState({ maxLevelCompleted: level });
        localStorage.setItem('zeka_max_level', String(level));
      } else {
        earnedThisLevel = localCoinBonus; // Only combo coins on played levels
      }
    }

    if (earnedThisLevel > 0) {
      useGameStore.getState().addCoins(earnedThisLevel);
    }

    useGameStore.setState(s => ({
      level: nextLevel,
      previousAnswers: [expected, s.previousAnswers[0]]
    }));
  };

  const handleSubmission = () => {
    if (isSubmitting || duelCountdown !== null) return;
    setIsSubmitting(true);

    if (currentValue === expected) {
      haptic.notification('success');
      setIsSuccessFlash(true);
      setTimeout(() => setIsSuccessFlash(false), 450);

      if (isDuelActive || gameMode === 'DUEL') {
        const nextScore = duelMyScore + 1;
        setDuelMyScore(nextScore);
        DuelService.sendScore(nextScore);
      }

      if (gameMode === 'TIME_ATTACK' || gameMode === 'MEMORY') {
        incrementModeScore();
      }

      handleLevelComplete();
    } else {
      haptic.notification('error');
      setIsErrorShake(true);
      setTimeout(() => setIsErrorShake(false), 450);

      if (isDuelActive || gameMode === 'DUEL') {
        playSound('fail');
        if (!DuelService.isFinished()) {
          DuelService.reportForfeit();
          setDuelWinner('OPPONENT');
        }
        handleGameOver();
        setTimeout(() => setIsSubmitting(false), 300);
        return;
      } else if (gameMode === 'TIME_ATTACK') {
        useGameStore.setState(s => ({ timeLeft: Math.max(0, s.timeLeft - 3) }));
        playSound('fail');
        if (timeLeft <= 3) {
          handleGameOver();
        }
      } else {
        handleGameOver();
      }
    }

    // Release lock slightly after state transition
    setTimeout(() => {
      setIsSubmitting(false);
    }, 300);
  };

  const adjustValue = (dir: number) => {
    if (duelCountdown !== null) return;
    haptic.impact('light');
    playSound('click');
    setCurrentValue(currentValue + dir);
  };

  const handleWatchAdForSolution = async () => {
    setIsWatchingHintAd(true);
    haptic.selection();
    const res = await Ads.showRewardedAd();
    setIsWatchingHintAd(false);
    if (res.success) {
      setShowSolution(true);
      setHasPaidForSolution(true);
      haptic.notification('success');
      playSound('success');
    } else {
      setAdError(t.ad_error);
    }
  };

  const handleWatchAdForTime = async () => {
    setIsWatchingHintAd(true);
    haptic.selection();
    const res = await Ads.showRewardedAd();
    setIsWatchingHintAd(false);
    if (res.success) {
      useGameStore.setState(s => ({ timeLeft: s.timeLeft + 15 }));
      haptic.notification('success');
      playSound('success');
    } else {
      setAdError(t.ad_error);
    }
  };

  const handleToggleSolution = () => {
    if (showSolution) {
      setShowSolution(false);
    } else {
      if (isDevMode || hasPaidForSolution) {
        setShowSolution(true);
      } else if (coins >= 50) {
        useGameStore.getState().showSolution();
        setHasPaidForSolution(true);
        setShowSolution(true);
      }
    }
  };

  const handleTogglePause = () => {
    if (isPaused) {
      setIsPaused(false);
    } else {
      if (isDevMode) {
        setIsPaused(true);
      } else if (coins >= 50) {
        useGameStore.getState().addCoins(-50);
        setIsPaused(true);
      }
    }
  };

  return (
    <div
      className={`h-[100dvh] w-full bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-neutral-200 overflow-hidden relative transition-colors duration-300 ${
        isSuccessFlash ? 'ring-8 ring-emerald-400/90 ring-inset' : isErrorShake ? 'ring-8 ring-rose-500/90 ring-inset' : ''
      }`}
      style={{ display: 'block' }}
    >
      {/* FLOATING REMATCH NOTIFICATION TOAST (when returned to menu) */}
      <AnimatePresence>
        {gameState === 'MENU' && pendingRematchInvite && (
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-4 inset-x-4 max-w-sm mx-auto z-50 bg-[#1D1D1F] text-white p-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                <Icons.Swords className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black truncate text-white">
                  {pendingRematchInvite.opponentName}
                </span>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  {t.duel_opponent_wants_rematch || 'Rövanş İstiyor!'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleDuelRematchRequest}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Icons.Swords className="w-3.5 h-3.5" />
                <span>{t.duel_accept || 'KABUL'}</span>
              </motion.button>
              <button
                onClick={() => {
                  setPendingRematchInvite(null);
                  DuelService.cleanup();
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-2-1 SYNCHRONIZED DUEL START COUNTDOWN OVERLAY */}
      <AnimatePresence>
        {(isDuelActive || gameMode === 'DUEL') && duelCountdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white select-none"
          >
            <div className="flex items-center gap-4 sm:gap-6 mb-8">
              {/* Player 1 (You) */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-xl sm:text-2xl font-black text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                  {Leaderboard.getPlayerName()?.charAt(0).toUpperCase() || 'S'}
                </div>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider mt-2 truncate max-w-[90px]">
                  {t.duel_you || 'SEN'}
                </span>
              </div>

              {/* VS Badge */}
              <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-neutral-300 font-black text-xs tracking-widest uppercase">
                VS
              </div>

              {/* Player 2 (Opponent) */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-xl sm:text-2xl font-black text-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.3)]">
                  {duelOpponent?.name?.charAt(0).toUpperCase() || 'R'}
                </div>
                <span className="text-xs font-black text-rose-400 uppercase tracking-wider mt-2 truncate max-w-[90px]">
                  {duelOpponent?.name || t.duel_opponent || 'RAKİP'}
                </span>
              </div>
            </div>

            {/* Animated Big Countdown Number */}
            <AnimatePresence mode="wait">
              <motion.div
                key={duelCountdown}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-7xl sm:text-8xl font-black tabular-nums tracking-tighter text-white drop-shadow-2xl mb-4"
              >
                {duelCountdown}
              </motion.div>
            </AnimatePresence>

            <span className="text-xs sm:text-sm font-bold tracking-widest text-neutral-400 uppercase">
              {t.duel_sudden_death_sub || 'HAYATTA KALMA'} • {t.duel_sudden_death || 'TEK HATA ELER'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* MAIN SCREEN CONTENT */}
      <div className="absolute inset-0 flex flex-col overflow-hidden">
        {gameState === 'MENU' ? (
          <MenuScreen
            coins={coins}
            startGame={handleStartGame}
            openDailyReward={() => setShowDailyRewardGlobal(true)}
            showInfo={showInfo} setShowInfo={setShowInfo}
            showLeaderboard={showLeaderboard} setShowLeaderboard={setShowLeaderboard}
            showMedals={showMedals} setShowMedals={setShowMedals}
            selectedMedal={selectedMedal} setSelectedMedal={setSelectedMedal}
            showLangMenu={showLangMenu} setShowLangMenu={setShowLangMenu}
            openBrainStats={() => setShowBrainStats(true)}
            openDuel={() => setShowDuel(true)}
          />
        ) : gameState === 'GAMEOVER' ? (
          <GameOverScreen
            level={level}
            totalTimeSpent={totalTimeSpent}
            expected={expected}
            isDevMode={isDevMode}
            hasRevivedInCurrentGame={hasRevivedInCurrentGame}
            goToMenu={handleReturnToMenu}
            onAdError={() => setAdError(t.ad_error)}
            gameMode={gameMode}
            timeAttackScore={timeAttackScore}
            memoryScore={memoryScore}
            onPlayAgain={() => handleStartGame(false, 1, gameMode)}
            isDuel={isDuelActive}
            duelWinner={duelWinner}
            duelMyScore={duelMyScore}
            duelOpponentName={duelOpponent?.name || t.duel_opponent || 'OPPONENT'}
            duelOpponentScore={duelOpponentScore}
            duelRematchRequested={duelRematchRequested}
            duelOpponentRematchPending={duelOpponentRematchPending}
            duelOpponentLeft={duelOpponentLeft}
            onPlayDuelAgain={handleDuelRematchRequest}
          />
        ) : (
          <>
            {/* LIVE 1V1 DUEL BANNER */}
            {(isDuelActive || gameMode === 'DUEL') && (() => {
              const duelTotal = duelMyScore + duelOpponentScore;
              const myPercent = duelTotal === 0 ? 50 : Math.round((duelMyScore / duelTotal) * 100);
              const oppPercent = 100 - myPercent;

              return (
                <div className="w-full bg-[#18181B] border-b border-neutral-800 text-white py-2 px-3 sm:px-4 z-30 shadow-md relative overflow-hidden select-none">
                  {/* Top: Players & Live Numerical Scores */}
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider relative z-10">
                    {/* Left: You */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
                      <span className="text-xs font-black text-emerald-400 truncate max-w-[85px] sm:max-w-[130px]">
                        {t.duel_you || 'SEN'}
                      </span>
                      <span className="text-base sm:text-lg font-black text-white bg-white/10 px-2 py-0.5 rounded-lg tabular-nums shrink-0">
                        {duelMyScore}
                      </span>
                    </div>

                    {/* Center: Minimalist Sudden Death Badge */}
                    <div className="flex flex-col items-center shrink-0 px-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-[9px] font-bold tracking-widest uppercase">
                          {t.duel_sudden_death || 'TEK HATA ELER'}
                        </span>
                      </div>
                      {duelRoomCode && (
                        <span className="text-[8px] font-mono text-neutral-500 tracking-wider mt-0.5">
                          {duelRoomCode}
                        </span>
                      )}
                    </div>

                    {/* Right: Opponent */}
                    <div className="flex items-center gap-2 min-w-0 justify-end">
                      <span className="text-base sm:text-lg font-black text-white bg-white/10 px-2 py-0.5 rounded-lg tabular-nums shrink-0">
                        {duelOpponentScore}
                      </span>
                      <span className="text-xs font-black text-rose-400 truncate max-w-[85px] sm:max-w-[130px]">
                        {duelOpponent?.name || t.duel_opponent || 'RAKİP'}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_8px_#fb7185]" />
                    </div>
                  </div>

                  {/* Minimalist Momentum Progress Line */}
                  <div className="w-full mt-1.5 relative z-10">
                    <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden flex relative border border-white/5 shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 ease-out"
                        style={{ width: `${myPercent}%` }}
                      />
                      <div
                        className="h-full bg-gradient-to-l from-rose-600 to-amber-500 transition-all duration-500 ease-out"
                        style={{ width: `${oppPercent}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#ffffff] transition-all duration-500 ease-out z-20"
                        style={{ left: `calc(${myPercent}% - 2px)` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* IN-GAME HEADER */}
            <header className="flex justify-between items-center px-4 py-2.5 md:p-6 w-full max-w-2xl mx-auto z-10 shrink-0">
              {/* LEFT: Home Button & Level/Score */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowExitConfirm(true)}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-neutral-200 rounded-xl shadow-sm text-neutral-500 hover:text-neutral-900 transition-colors shrink-0"
                >
                  <Icons.Home className="w-5 h-5" />
                </motion.button>

                <div className="flex flex-col min-w-0 justify-center">
                  {isDuelActive || gameMode === 'DUEL' ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icons.Swords className="w-4 h-4 text-neutral-900 shrink-0" />
                      <span className="text-base sm:text-lg font-black tracking-tight text-neutral-900 truncate">
                        DÜELLO
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className="text-base sm:text-2xl font-black tracking-tight text-[#1D1D1F] flex items-center gap-1.5 leading-tight truncate">
                        {gameMode === 'TIME_ATTACK' ? (
                          <span className="text-amber-500 flex items-center gap-1 font-black">
                            <Icons.Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-500 shrink-0" />
                            <span>{t.mode_time_attack}</span>
                          </span>
                        ) : gameMode === 'MEMORY' ? (
                          <span className="text-blue-500 flex items-center gap-1 font-black">
                            <Icons.EyeOff className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                            <span>{t.mode_memory}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-900 flex items-center gap-1">
                            {t.header_level} <RollingNumber value={level} />
                          </span>
                        )}
                        {isDevMode && <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">{t.dev_test}</span>}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold tracking-wider text-neutral-500 uppercase leading-none mt-0.5 truncate">
                        {gameMode === 'TIME_ATTACK' ? (
                          <span>{t.score_label}: <strong className="text-neutral-900"><RollingNumber value={timeAttackScore} /></strong> • {t.time_attack_best}: <strong className="text-amber-600">{timeAttackBest}</strong></span>
                        ) : gameMode === 'MEMORY' ? (
                          <span>{t.score_label}: <strong className="text-neutral-900"><RollingNumber value={memoryScore} /></strong> • {t.memory_best}: <strong className="text-blue-600">{memoryBest}</strong></span>
                        ) : (
                          <span>{t.header_time} <span className="text-neutral-900">{isDevMode ? '∞' : `${totalTimeSpent.toFixed(1)}s`}</span></span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT: Timer Pill + Coins Pill */}
              <div className="flex items-center gap-2 shrink-0">
                {(gameMode === 'TIME_ATTACK' || isDuelActive || gameMode === 'DUEL') && (
                  <motion.div
                    animate={timeLeft <= 5 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                    className={`px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm border font-black text-xs sm:text-sm tabular-nums transition-colors ${
                      timeLeft <= 5
                        ? 'bg-rose-500 border-rose-600 text-white animate-pulse'
                        : isDuelActive || gameMode === 'DUEL'
                        ? 'bg-white border-neutral-200 text-neutral-900'
                        : 'bg-amber-100 border-amber-300 text-amber-900'
                    }`}
                  >
                    <span>⏱️</span>
                    <span>{timeLeft.toFixed(1)}s</span>
                  </motion.div>
                )}

                <div className="relative">
                  <div className="flex items-center gap-1.5 bg-white border border-neutral-200 px-3 py-1.5 rounded-full shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-black text-xs sm:text-sm tabular-nums text-neutral-900 leading-none">
                      <RollingNumber value={coins} />
                    </span>
                  </div>

                  <AnimatePresence>
                    {showComboAnim && lastComboBonus > 0 && (
                      <motion.div
                        initial={{ y: 0, opacity: 0, scale: 0.8 }}
                        animate={{ y: 22, opacity: 1, scale: 1 }}
                        exit={{ y: 28, opacity: 0 }}
                        className="absolute right-0 top-0 bg-amber-400 text-neutral-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap z-30 pointer-events-none"
                      >
                        x{lastCombo} +{lastComboBonus}C
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            {/* CONSTELLATION JOURNEY PROGRESS MAP */}
            {gameMode === 'CLASSIC' && (
              <JourneyMap level={level} isDark={false} />
            )}

            {/* DEV LEVEL JUMP — visible only in dev mode */}
            {isDevMode && (
              <div className="w-full max-w-2xl mx-auto px-4 pb-2 flex flex-wrap gap-1 justify-center">
                {[1, 10, 30, 31, 44, 50, 51, 70, 71, 90, 91, 100, 101, 110, 111, 130, 131, 150].map(lv => (
                  <button
                    key={lv}
                    onClick={() => devAdvanceLevel(lv)}
                    className={`px-2 py-1 rounded font-bold text-[8px] tracking-wider transition-all ${
                      lv === level ? 'bg-amber-500 text-white' :
                      [11, 31, 51, 71, 91, 101, 111, 131].includes(lv) ? 'bg-amber-100 text-amber-600' :
                      'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            )}

            {/* MAIN GAME AREA */}
            <main className="flex-1 flex flex-col items-center justify-center px-2 md:px-4 w-full max-w-2xl mx-auto relative z-10 pb-2 overflow-hidden">
              {/* SEQUENCE DISPLAY WITH JUICINESS & MEMORY MODE MASK */}
              <motion.div
                layout
                animate={isErrorShake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex-1 min-h-0 flex flex-wrap justify-center content-center items-center gap-[2px] md:gap-1.5 mb-2 md:mb-4 px-2 py-4 md:px-6 md:py-6 rounded-3xl bg-white shadow-sm border border-neutral-200/90 w-full relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-50/20 pointer-events-none"></div>

                {/* MEMORY MODE 2.0s COUNTDOWN PROGRESS BAR */}
                {gameMode === 'MEMORY' && !isMemoryMasked && (
                  <>
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-sky-100 overflow-hidden z-20">
                      <motion.div
                        key={`mem-bar-${level}`}
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: 2.0, ease: 'linear' }}
                        className="h-full bg-sky-500 rounded-full"
                      />
                    </div>
                    <motion.div
                      key={`mem-badge-${level}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/60 text-[10px] font-black uppercase text-sky-600 flex items-center gap-1 z-20 shadow-xs pointer-events-none"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      <span>{t.memory_time_remaining || '2.0s'}</span>
                    </motion.div>
                  </>
                )}

                <AnimatePresence mode="popLayout">
                  {sequence.map((sym, i) => {
                    if (sym === 'ReverseNext') {
                      return (
                        <div key={`${level}-${i}-revgroup`} className="flex flex-nowrap items-center shrink-0">
                          {isMemoryMasked ? (
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-neutral-100/90 border border-neutral-300 flex items-center justify-center font-black text-xl text-neutral-400 select-none shadow-inner">?</div>
                          ) : (
                            <SymbolDisplay type="ReverseNext" />
                          )}
                          {i + 1 < sequence.length && sequence[i + 1] !== 'InvertAll' && (
                            isMemoryMasked ? (
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-neutral-100/90 border border-neutral-300 flex items-center justify-center font-black text-xl text-neutral-400 select-none shadow-inner ml-1">?</div>
                            ) : (
                              <SymbolDisplay type={sequence[i + 1]} />
                            )
                          )}
                        </div>
                      );
                    }
                    if (i > 0 && sequence[i - 1] === 'ReverseNext' && sym !== 'InvertAll') return null;

                    return (
                      <div key={`${level}-${i}-${sym}`} className="shrink-0 flex items-center">
                        {isMemoryMasked && sym !== 'Plus' ? (
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-neutral-100/90 border border-neutral-300 flex items-center justify-center font-black text-xl text-neutral-400 select-none shadow-inner">
                            ?
                          </div>
                        ) : (
                          <SymbolDisplay type={sym} />
                        )}
                      </div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              <div className="flex items-center gap-4 md:gap-8 mb-6 md:mb-10">
                <motion.button
                  whileHover={{ scale: 1.15, x: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustValue(-1)}
                  disabled={isPaused || showTutorialModal || showIntroModal}
                  className="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-20"
                >
                  <Icons.TriangleDown className="w-12 h-12 md:w-14 md:h-14 rotate-90" />
                </motion.button>

                <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center bg-white rounded-full shadow-xl border border-neutral-50 shrink-0">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={currentValue}
                      initial={{ y: -20, opacity: 0, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 20, opacity: 0, scale: 0.8 }}
                      className="absolute text-5xl md:text-7xl font-black tracking-tighter"
                    >
                      {currentValue > 0 ? `+${currentValue}` : currentValue}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <motion.button
                  whileHover={{ scale: 1.15, x: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustValue(+1)}
                  disabled={isPaused || showTutorialModal || showIntroModal}
                  className="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-20"
                >
                  <Icons.TriangleUp className="w-12 h-12 md:w-14 md:h-14 rotate-90" />
                </motion.button>
              </div>

              <div className="mt-3 md:mt-6 mb-2 flex items-center justify-center w-full shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmission}
                  disabled={isPaused || showTutorialModal || showIntroModal}
                  className={`px-10 py-3 md:px-14 md:py-4 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] shadow-xl transition-all ${isPaused || showTutorialModal || showIntroModal ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
                >
                  {t.btn_submit}
                </motion.button>
              </div>
            </main>

            {/* FOOTER */}
            <footer className="w-full max-w-2xl mx-auto px-4 pb-4 md:px-6 md:pb-6 flex flex-col gap-2 z-10 relative shrink-0">
              {/* Live countdown numeric indicator */}
              <div className="flex items-center justify-between text-[11px] font-black tracking-wider uppercase px-1">
                <span className="text-neutral-400 flex items-center gap-1">
                  <span>⏱️</span>
                  {gameMode === 'TIME_ATTACK' ? t.timer_countdown : gameMode === 'MEMORY' ? t.timer_memory : t.timer_general}
                </span>
                <span className={`tabular-nums font-black ${timeLeft <= 5 ? 'text-red-500 text-sm animate-pulse' : 'text-neutral-800'}`}>
                  {isDevMode ? '∞' : `${timeLeft.toFixed(1)}s`}
                </span>
              </div>

              <div className="w-full h-3 bg-neutral-200/60 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className={`h-full ${isDevMode ? 'bg-amber-400' : (timeLeft < 5 ? 'bg-red-500' : gameMode === 'TIME_ATTACK' ? 'bg-amber-500' : 'bg-[#1D1D1F]')}`}
                  animate={{ width: `${timePercent}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              </div>

              {isDuelActive ? (
                /* IN 1v1 DUEL: Only show Solution button! Pause & +10s are disabled in live competitive duels */
                <div className="flex items-center justify-center w-full">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={coins >= 50 || isDevMode || hasPaidForSolution ? handleToggleSolution : handleWatchAdForSolution}
                    disabled={isWatchingHintAd}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#1D1D1F] hover:bg-black text-white font-black tracking-widest text-xs uppercase shadow-xl flex items-center justify-between hover:scale-[1.01] active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">💡</span>
                      <span>{showSolution ? t.btn_hide : (coins >= 50 || isDevMode || hasPaidForSolution ? t.btn_reveal : t.btn_reveal_ad)}</span>
                    </div>
                    <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-black">
                      {coins >= 50 || isDevMode || hasPaidForSolution ? '50C' : t.ad_label}
                    </span>
                  </motion.button>
                </div>
              ) : (
                /* SINGLE-PLAYER CONTROLS: Pause, +10s, Solution */
                <div className="grid grid-cols-3 gap-2 w-full">
                  <button
                    onClick={handleTogglePause}
                    disabled={showTutorialModal || showIntroModal || (!isPaused && !isDevMode && coins < 50)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[9px] font-bold tracking-widest transition disabled:opacity-30 ${isPaused ? 'bg-amber-100 border-amber-200 text-amber-900 shadow-inner' : 'bg-white border-neutral-100 text-neutral-600 shadow-sm'}`}
                  >
                    <span>{isPaused ? t.btn_resume : t.btn_pause}</span>
                    <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full mt-1">50C</span>
                  </button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={coins >= 10 ? () => useGameStore.getState().addTime(10) : handleWatchAdForTime}
                    disabled={isPaused || showTutorialModal || showIntroModal || isWatchingHintAd}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-neutral-100 text-[9px] font-bold tracking-widest shadow-sm disabled:opacity-30 transition-all hover:bg-neutral-50"
                  >
                    <span>{coins >= 10 ? t.btn_plus10 : t.btn_plus_ad}</span>
                    <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full mt-1">
                      {coins >= 10 ? '10C' : t.ad_label}
                    </span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={coins >= 50 || isDevMode || hasPaidForSolution ? handleToggleSolution : handleWatchAdForSolution}
                    disabled={isPaused || showTutorialModal || showIntroModal || isWatchingHintAd}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-neutral-100 text-[9px] font-bold tracking-widest shadow-sm disabled:opacity-30 transition-all hover:bg-neutral-50"
                  >
                    <span>{showSolution ? t.btn_hide : (coins >= 50 || isDevMode || hasPaidForSolution ? t.btn_reveal : t.btn_reveal_ad)}</span>
                    <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full mt-1">
                      {coins >= 50 || isDevMode || hasPaidForSolution ? '50C' : t.ad_label}
                    </span>
                  </motion.button>
                </div>
              )}
            </footer>
          </>
        )}
      </div>

      {createPortal(
        <div className="fixed inset-0 pointer-events-none z-[1000]">
          <AnimatePresence>
            {showTrackingModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 pointer-events-auto">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-[2rem] max-w-[320px] shadow-2xl text-center">
                  <h2 className="text-xl font-black mb-4 uppercase">{t.att_title}</h2>
                  <p className="text-neutral-500 mb-6 text-xs">{t.att_desc}</p>
                  <button onClick={() => setShowTrackingModal(false)} className="w-full py-3 bg-blue-500 text-white rounded-full font-black text-xs uppercase shadow-lg shadow-blue-500/30">{t.att_continue}</button>
                </motion.div>
              </motion.div>
            )}

            {showIntroModal && (
              <motion.div key="intro-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 pointer-events-auto">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-5 rounded-3xl max-w-[320px] shadow-2xl text-center">
                  <h2 className="text-lg font-black mb-3">{t.intro_title}</h2>
                  <div className="flex justify-center gap-4 mb-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      <SymbolDisplay type="CircleFilled" size="small" />
                      <span className="font-black text-xs text-green-600">+1</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <SymbolDisplay type="CircleEmpty" size="small" />
                      <span className="font-black text-xs text-red-500">-1</span>
                    </div>
                  </div>
                  <p className="text-neutral-500 text-[11px] mb-4">{t.intro_p1}</p>

                  <div className="space-y-2 mb-4">
                    <TutorialExample sequence={['CircleFilled', 'CircleFilled']} result={2} isSmall />
                    <TutorialExample sequence={['CircleFilled', 'CircleEmpty']} result={0} isSmall />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-4 bg-neutral-100/50 p-2 rounded-lg cursor-pointer" onClick={() => setIntroCheckbox(!introCheckbox)}>
                    <input type="checkbox" checked={introCheckbox} onChange={(e) => setIntroCheckbox(e.target.checked)} className="w-3.5 h-3.5 accent-[#1D1D1F] pointer-events-auto" />
                    <label className="font-bold text-[9px] text-neutral-600 cursor-pointer uppercase select-none">{t.intro_checkbox}</label>
                  </div>
                  <button onClick={() => { if (introCheckbox) setHideIntro(true); setShowIntroModal(false); initLevel(); }} className="w-full py-3 bg-[#1D1D1F] text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-xl">{t.intro_btn}</button>
                </motion.div>
              </motion.div>
            )}

            {showTutorialModal && (
              <motion.div key="tutorial-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 pointer-events-auto">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-6 rounded-3xl max-w-[340px] w-full flex flex-col items-center max-h-[85vh] overflow-y-auto shadow-2xl">
                  <div className="px-3 py-1.5 bg-amber-100 text-amber-600 rounded-full font-bold text-[10px] mb-6 uppercase flex items-center gap-2 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    {t.tut_attention}
                  </div>
                  <div className="flex justify-center flex-wrap gap-2 mb-6 shrink-0">
                    {getTutorialSymbols(level).map((s, idx) => (
                      <div key={`tut-show-${s}-${idx}`} className="p-3 bg-white border border-neutral-200 rounded-xl shadow-sm flex items-center justify-center">
                        <GameSymbol type={s} size="large" />
                      </div>
                    ))}
                  </div>
                  <h2 className="text-lg font-black text-[#1D1D1F] mb-2 shrink-0 text-center">{t[('tut_' + level + '_title') as LanguageCode] || "YENİ BİR KURAL"}</h2>
                  <p className="text-neutral-500 text-[12px] mb-6 text-center leading-relaxed shrink-0">{t[('tut_' + level + '_desc') as LanguageCode]}</p>
                  {TUTORIAL_DATA[level]?.exampleSequence && (
                    <div className="shrink-0 w-full mb-2">
                      <TutorialExample text={t[('tut_' + level + '_ex') as LanguageCode]} sequence={TUTORIAL_DATA[level].exampleSequence} result={TUTORIAL_DATA[level].exampleResult} isSmall={!!TUTORIAL_DATA[level]?.exampleSequence2} />
                    </div>
                  )}
                  {TUTORIAL_DATA[level]?.exampleSequence2 && (
                    <div className="shrink-0 w-full mb-2">
                      <TutorialExample text={t[('tut_' + level + '_ex2') as LanguageCode]} sequence={TUTORIAL_DATA[level].exampleSequence2} result={TUTORIAL_DATA[level].exampleResult2} isSmall />
                    </div>
                  )}
                  <button onClick={() => { setShowTutorialModal(false); initLevel(); }} className="w-full py-3.5 bg-[#1D1D1F] text-white rounded-full font-bold text-xs uppercase tracking-[0.2em] mt-auto shadow-xl">{t.tut_btn}</button>
                </motion.div>
              </motion.div>
            )}

            {showSolution && !isPaused && (
              <motion.div key="solution-pill" initial={{ y: -50, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: -50, opacity: 0, x: '-50%' }} className="fixed top-20 md:top-24 left-1/2 bg-[#1D1D1F] text-white px-8 py-3 rounded-full font-bold shadow-2xl pointer-events-none text-sm whitespace-nowrap z-[1100]">
                {t.solution_text} <span className="text-amber-400 ml-1">{expected}</span>
              </motion.div>
            )}

            {showDailyRewardGlobal && (
              <div key="daily-reward-overlay" className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 pointer-events-auto">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] p-6 w-full max-w-[320px] shadow-2xl text-center relative pointer-events-auto">
                  <button onClick={() => setShowDailyRewardGlobal(false)} className="absolute top-4 right-4 w-9 h-9 bg-neutral-100 rounded-full text-neutral-400 font-bold hover:bg-neutral-200 shadow-sm transition-colors text-xs flex items-center justify-center">✕</button>
                  <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200"><Icons.Gift className="w-10 h-10" /></div>
                  <h2 className="text-2xl font-black mb-2">{t.daily_gift_title}</h2>
                  <p className="text-sm text-neutral-500 mb-6 font-medium leading-relaxed">{t.daily_gift_desc?.split('200')[0]}<strong className="text-amber-500">200 Coin</strong>{t.daily_gift_desc?.split('200')[1]}</p>
                  {dailyRewardsToday < 3 && (dailyRewardsToday === 0 || (Date.now() - (lastRewardTime || 0) >= 3 * 60 * 60 * 1000)) ? (
                    <button 
                      disabled={isWatchingDaily}
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        setIsWatchingDaily(true); 
                        const res = await Ads.showRewardedAd(); 
                        setIsWatchingDaily(false); 
                        if (res.success) { 
                          claimDailyReward(); 
                          setShowDailyRewardGlobal(false); 
                          setShowSuccessGlobal(true); 
                          playSound('success'); 
                        } else {
                          setAdError(t.ad_error);
                        }
                      }} 
                      className={`w-full py-4 bg-[#1D1D1F] text-white rounded-2xl font-black tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 ${isWatchingDaily ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                      {isWatchingDaily ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>{t.daily_gift_watch}</>
                      )}
                    </button>
                  ) : ( <div className="w-full py-4 bg-neutral-100 text-neutral-400 rounded-2xl italic font-bold text-xs tracking-widest">{dailyRewardsToday >= 3 ? t.daily_gift_limit : t.daily_gift_comeback}</div> )}
                </motion.div>
              </div>
            )}

            {showSuccessGlobal && (
              <div key="success-overlay" className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 pointer-events-auto">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-white rounded-[2rem] p-8 w-full max-w-[300px] shadow-2xl text-center border-b-8 border-amber-400 pointer-events-auto">
                  <div className="text-5xl mb-4">✨</div>
                  <h3 className="text-2xl font-black mb-1">{t.congrats_title}</h3>
                  <p className="text-neutral-500 font-bold mb-6 text-sm">{t.congrats_desc}</p>
                  <button onClick={() => setShowSuccessGlobal(false)} className="w-full py-4 bg-amber-400 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-amber-200 active:scale-95 transition-all">{t.congrats_btn}</button>
                </motion.div>
              </div>
            )}

            {showExitConfirm && (
              <div key="exit-confirm-overlay" className="fixed inset-0 flex items-center justify-center p-6 bg-black/40 pointer-events-auto">
                <motion.div initial={{ scale: 0.9, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 10, opacity: 0 }} className="bg-white/95 rounded-[2rem] p-8 w-full max-w-[280px] text-center shadow-2xl relative overflow-hidden">
                  
                  {/* Live Timer Progress Bar to show it's ticking */}
                  {gameState === 'PLAYING' && !isDevMode && (
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-200">
                      <motion.div 
                        className={`h-full ${timeLeft < 5 ? 'bg-red-500' : 'bg-amber-400'}`} 
                        animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
                        transition={{ ease: "linear", duration: 0.1 }}
                      />
                    </div>
                  )}

                  <div className="w-14 h-14 bg-neutral-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 mt-2"><Icons.Home className="w-7 h-7" /></div>
                  <h2 className="text-xl font-black mb-2 text-neutral-900 leading-tight">{t.exit_confirm_title}</h2>
                  
                  {/* Pulsing countdown to emphasize the penalty of pausing here */}
                  {gameState === 'PLAYING' && !isDevMode ? (
                    <div className="bg-red-50 text-red-600 rounded-xl px-3 py-2 mb-6 border border-red-100 flex flex-col items-center animate-pulse">
                       <span className="text-[9px] font-black uppercase tracking-widest">{t.game_is_running || 'GAME IS RUNNING'}</span>
                       <span className="text-2xl font-black tabular-nums">{timeLeft.toFixed(1)}s</span>
                    </div>
                  ) : (
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-8">{t.exit_confirm_desc}</p>
                  )}

                  <div className="flex flex-col gap-2.5">
                    <button onClick={() => setShowExitConfirm(false)} className="w-full py-4 bg-neutral-900 text-white rounded-xl font-black text-xs tracking-widest uppercase shadow-lg active:scale-95 transition-all">{t.exit_confirm_no}</button>
                    <button onClick={() => { setShowExitConfirm(false); handleReturnToMenu(); }} className="w-full py-4 bg-neutral-100 text-neutral-400 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors">{t.exit_confirm_yes}</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>,
        document.getElementById('modal-root')!
      )}

      {/* UNIFIED ZEKA LOADING & ARCN SPLASH (SEAMLESS TRANSITION) */}
      <AnimatePresence>
        {showCompanySplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[2000] bg-[#1D1D1F] flex flex-col items-center justify-center p-8 pointer-events-auto"
          >
            <div className="flex-1" />
            
            {/* CENTRAL BRANDING (PRESERVES ICON TRANSITION) */}
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="w-20 h-20 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center mb-8"
            >
               <span className="text-4xl font-black text-white">Z</span>
            </motion.div>

            {/* Minimal pulsing loading indicator */}
            <motion.div 
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="mb-12 flex flex-col items-center"
            >
               <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    className="w-full h-full bg-white/60"
                  />
               </div>
               <span className="text-[10px] font-black tracking-[0.4em] text-white/60 uppercase">{t.loading || 'ZEKA LOADING'}</span>
            </motion.div>

            {/* ENLARGED ARCN LOGO AT BOTTOM */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex flex-col items-center gap-3 mb-16"
            >
              <img src="/arcnwhite.png" alt="ARCN" className="h-16 md:h-20 opacity-90 object-contain" />
              <div className="w-12 h-px bg-white/20" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adError && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 50, opacity: 0 }} 
            className="fixed bottom-10 left-0 right-0 mx-auto w-max px-6 py-3 bg-red-500 text-white rounded-2xl font-bold shadow-[0_10px_30px_rgba(239,68,68,0.4)] z-[2000] text-xs whitespace-nowrap"
          >
            {adError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BRAIN ANALYTICS & BRAIN AGE MODAL */}
      <BrainAnalyticsModal
        isOpen={showBrainStats}
        onClose={() => setShowBrainStats(false)}
        playSound={playSound}
      />

      {/* 1v1 LIVE DUEL MODAL */}
      <DuelModal
        isOpen={showDuel}
        onClose={() => setShowDuel(false)}
        onStartDuel={(payload) => handleStartDuel(payload)}
        playSound={playSound}
      />
    </div>
  );
}

