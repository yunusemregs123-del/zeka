import { createPortal } from 'react-dom';
import { useEffect, useState, useMemo } from 'react';
import { StatusBar } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { useGameStore } from './store/useGameStore';
import { generatePuzzle, isTutorialLevel, getTutorialSymbols, type SymbolType } from './lib/LevelEngine';
import * as Leaderboard from './lib/Leaderboard';
import * as Icons from './components/Icons';
import { getSymbolSrc } from './lib/SymbolAssets';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { AmbientMusic } from './lib/AmbientMusic';
import { Ads } from './lib/Ads';
import { Translations, type LanguageCode } from './lib/Translations';
import { ACHIEVEMENTS } from './lib/Achievements';

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
  const src = useMemo(() => getSymbolSrc(type), [type]);
  if (!src) return null;

  const sizeClass = type === 'Plus'
    ? (size === 'small' ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4 md:w-5 md:h-5')
    : (size === 'small' ? 'w-5 h-5 md:w-6 md:h-6' : size === 'large' ? 'w-10 h-10 md:w-12 md:h-12' : 'w-7 h-7 md:w-8 md:h-8');

  const imgElement = <img src={src} alt={type} draggable={false} className={`${sizeClass} shrink-0 ${type === 'Plus' ? 'mx-[2px] md:mx-1' : 'drop-shadow-sm'}`} />;

  if (type === 'Plus') return imgElement;

  if (disableAnimation) {
    return <div className="flex items-center justify-center p-[2px]">{imgElement}</div>;
  }

  return (
    <motion.div
      initial={{ scale: 0, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      className="flex items-center justify-center p-[2px]"
    >
      {imgElement}
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
          const src = getSymbolSrc(sym);
          if (!src) return null;
          const sizeClass = sym === 'Plus'
            ? (isSmall ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4 md:w-5 md:h-5')
            : (isSmall ? 'w-5 h-5 md:w-6 md:h-6' : 'w-7 h-7 md:w-8 md:h-8');
          if (sym === 'Plus') return <img key={`ex-p-${i}`} src={src} alt="+" draggable={false} className={`mx-[2px] md:mx-1 shrink-0 ${sizeClass}`} />;
          return (
            <div key={`ex-${sym}-${i}`} className="shrink-0 bg-white shadow-sm border border-neutral-100 rounded-xl flex items-center justify-center p-[2px]">
              <img src={src} alt={sym} draggable={false} className={`${sizeClass} drop-shadow-sm`} />
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
  showLangMenu, setShowLangMenu
}: {
  startGame: (asDev?: boolean, startLevel?: number) => void,
  openDailyReward: () => void,
  coins: number,
  showInfo: boolean, setShowInfo: (v: boolean) => void,
  showLeaderboard: boolean, setShowLeaderboard: (v: boolean) => void,
  showMedals: boolean, setShowMedals: (v: boolean) => void,
  selectedMedal: any, setSelectedMedal: (v: any) => void,
  showLangMenu: boolean, setShowLangMenu: (v: boolean) => void
}) {
  const { language, setLanguage, medals, claimedMedals, claimMedalReward } = useGameStore();
  const t = Translations[language];
  const [tab, setTab] = useState<'daily' | 'weekly' | 'alltime'>('daily');
  const [scores, setScores] = useState<Leaderboard.ScoreEntry[]>([]);
  const [personalRankData, setPersonalRankData] = useState<{ rank: number, row: Leaderboard.ScoreEntry } | null>(null);
  const [loading, setLoading] = useState(true);
  const personalBest = Leaderboard.getPersonalBest();
  const [muteAudio, setMuteAudio] = useState(localStorage.getItem('zeka_mute') === 'true');
  const logoControls = useAnimation();

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

  const tabLabels = { daily: t.menu_daily_tab, weekly: t.menu_weekly_tab, alltime: t.menu_alltime_tab };

  return (
    <div className="min-h-[100dvh] bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center font-sans selection:bg-neutral-200 p-4 md:p-6 relative overflow-hidden">

      {/* HOME HEADER - CONSTRAINED FOR WEB */}
      <div className="absolute inset-x-0 top-[1.5rem] z-10 px-4 md:p-6 w-full max-w-2xl mx-auto flex justify-between items-start pointer-events-none">

        {/* LEFT: DAILY REWARD */}
        <DailyRewardButton onClick={openDailyReward} />

        {/* RIGHT: COINS - FORCED BLACK TEXT */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-neutral-200/60 shadow-sm transform active:scale-95 transition-all">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></div>
          <span className="font-black text-sm md:text-base tabular-nums leading-none" style={{ color: '#000000', opacity: 1 }}>{coins}</span>
        </div>
      </div>

      {/* DEV PANEL - ALWAYS VISIBLE FOR TESTING */}
      <div className="absolute inset-x-0 top-[4.5rem] md:top-6 z-10 w-full max-w-2xl mx-auto px-4 flex justify-end gap-1 pointer-events-none flex-wrap items-center">
        <button
          onClick={() => startGame(true)}
          className="pointer-events-auto px-3 py-1.5 bg-neutral-200 text-neutral-500 rounded-lg font-bold text-[9px] tracking-widest hover:bg-neutral-300 transition-all opacity-60 hover:opacity-100"
        >
          DEV
        </button>
        {[11, 31, 51, 71, 91, 101, 111, 131].map(lv => (
          <button
            key={lv}
            onClick={() => { startGame(true, lv); }}
            className="pointer-events-auto px-2 py-1.5 bg-amber-100 text-amber-600 rounded-lg font-bold text-[8px] tracking-wider hover:bg-amber-200 transition-all opacity-60 hover:opacity-100"
          >
            T{lv}
          </button>
        ))}
        <input
          type="number"
          min="1"
          max="999"
          placeholder="LV"
          onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseInt((e.target as HTMLInputElement).value); if (v > 0) startGame(true, v); }}}
          className="pointer-events-auto w-12 px-1.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-bold text-[9px] text-center opacity-60 focus:opacity-100 outline-none"
        />
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center w-full max-w-sm z-0">

        {/* Rhythmic Bouncing Logo Syncing with Ambient Music */}
        <motion.div
          animate={logoControls}
          className="mx-auto w-fit mb-8"
        >
          <div className="w-24 h-24 bg-[#1D1D1F] text-white rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-transform">
            <h1 className="text-5xl font-black">Z</h1>
          </div>
        </motion.div>

        <h1 className="text-6xl font-black tracking-tighter mb-2 text-[#1D1D1F]">ZEKA</h1>
        <p className="text-lg text-neutral-400 font-semibold mb-6 tracking-widest uppercase">{t.menu_subtitle}</p>

        {/* LANGUAGE SWITCHER */}
        <div className="relative w-fit mx-auto mb-6 z-20">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center justify-between gap-3 px-4 py-2 bg-white border border-neutral-200 rounded-xl shadow-sm text-xs font-bold tracking-widest uppercase hover:bg-neutral-50 hover:border-neutral-300 transition-all text-[#1D1D1F]"
          >
            <span>{language}</span>
            <Icons.ChevronDown className={`w-3 h-3 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                className="absolute top-10 inset-x-0 w-full bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden flex flex-col items-stretch"
              >
                {(['en', 'tr', 'de', 'ja', 'pt'] as LanguageCode[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                    className={`py-2 text-xs font-bold tracking-widest uppercase transition-colors ${language === lang ? 'bg-neutral-100 text-amber-500' : 'text-neutral-500 hover:bg-neutral-50 hover:text-[#1D1D1F]'}`}
                  >
                    {lang}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => startGame(false)}
          className="w-full py-6 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] text-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all"
        >
          {t.menu_start}
        </button>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={toggleMute} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-neutral-500 hover:text-black hover:-translate-y-1 transition-all">
            {muteAudio ? <Icons.MusicOff className="w-5 h-5" /> : <Icons.MusicOn className="w-5 h-5" />}
          </button>
          <button onClick={() => setShowLeaderboard(true)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-amber-500 hover:text-amber-600 hover:-translate-y-1 transition-all">
            <Icons.Trophy className="w-5 h-5" />
          </button>
          <button onClick={() => setShowMedals(true)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-neutral-500 hover:text-black hover:-translate-y-1 transition-all relative group">
            <Icons.Medal className={`w-5 h-5 ${medals.length > claimedMedals.length ? 'animate-bounce' : ''}`} />
            {medals.length > claimedMedals.length && (
              <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
          <button onClick={() => setShowInfo(true)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-100 text-neutral-500 hover:text-black hover:-translate-y-1 transition-all">
            <Icons.Info className="w-5 h-5" />
          </button>
        </div>

        {personalBest && (
          <div className="mt-8 text-center opacity-70">
            <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase block mb-1">{t.personal_best}</span>
            <span className="text-lg font-black text-neutral-800 tracking-wide">{t.level} {personalBest.level}</span>
          </div>
        )}
      </motion.div>

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

              <div className="flex flex-col gap-2 mb-6 max-h-[300px] overflow-y-auto pr-1">
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
                      <img src={getSymbolSrc(item.symKey)} alt={item.symKey} draggable={false} className="w-5 h-5" />
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
                    {scores.map((entry, idx) => (
                      <div key={entry.id} className={`flex items-center gap-2 p-2 sm:p-3 rounded-xl transition ${idx === 0 ? 'bg-amber-50 border border-amber-100' : idx === 1 ? 'bg-neutral-50 border border-neutral-100' : idx === 2 ? 'bg-orange-50/60 border border-orange-100/60' : 'bg-white border border-transparent'}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-neutral-300 text-white' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0 pr-1">
                          <span className="font-bold text-xs sm:text-sm block truncate flex items-center gap-1">
                            {entry.country_code && <span className="text-[10px]">{entry.country_code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))}</span>}
                            {entry.player_name}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-neutral-400 font-medium">{Leaderboard.formatDate(entry.created_at)}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-xs sm:text-sm block">{t.lb_b_level} {entry.level}</span>
                          <span className="text-[9px] sm:text-[10px] text-neutral-400 font-semibold">{Leaderboard.formatTime(entry.total_time)}</span>
                        </div>
                      </div>
                    ))}
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

function DailyRewardButton({ onClick }: { onClick: () => void }) {
  const { lastRewardTime, dailyRewardsToday, language } = useGameStore();
  const t = Translations[language];

  const COOLDOWN_MS = 3 * 60 * 60 * 1000;
  const timePassed = lastRewardTime ? Date.now() - lastRewardTime : COOLDOWN_MS;
  const canClaim = dailyRewardsToday < 3 && timePassed >= COOLDOWN_MS;

  const getTimeRemaining = () => {
    if (!lastRewardTime) return "";
    const remaining = Math.max(0, COOLDOWN_MS - timePassed);
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours > 0 ? hours + (t.unit_hour || 'h') + ' ' : ''}${mins}${t.unit_min || 'min'}`;
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`pointer-events-auto flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl shadow-md border transition-all ${canClaim ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-neutral-100 text-neutral-400'}`}
    >
      <div className={`p-1 md:p-1.5 rounded-lg ${canClaim ? 'bg-amber-400 text-white animate-pulse' : 'bg-neutral-100 text-neutral-300'}`}>
        <Icons.Gift className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <div className="flex flex-col items-start leading-none">
        <span className="text-[10px] md:text-xs font-black tracking-tight uppercase">{t.daily_reward}</span>
        <span className="text-[9px] md:text-[10px] font-bold opacity-70">
          {canClaim ? t.daily_reward_claim : (dailyRewardsToday >= 3 ? t.daily_reward_done : `${getTimeRemaining()}${t.daily_reward_wait}`)}
        </span>
      </div>
    </motion.button>
  );
}

// ─── GAME OVER SCREEN ──────────────────────────────────────
function GameOverScreen({ level, totalTimeSpent, expected, isDevMode, hasRevivedInCurrentGame, goToMenu }: {
  level: number; totalTimeSpent: number; expected: number; isDevMode: boolean; hasRevivedInCurrentGame: boolean; goToMenu: () => void;
}) {
  const { language } = useGameStore();
  const t = Translations[language];
  const hasSavedName = !!Leaderboard.getPlayerName();
  const [playerName, setPlayerName] = useState(Leaderboard.getPlayerName() || '');
  const [showInput] = useState(!hasSavedName);
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  useEffect(() => {
    Leaderboard.fetchAndCacheCountry();
    if (!isDevMode) {
      const newBest = Leaderboard.updatePersonalBest(level, totalTimeSpent);
      if (newBest) setIsNewBest(true);
    }
  }, [level, totalTimeSpent, isDevMode]);

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
    gameState, level, totalTimeSpent, currentValue, timeLeft, maxTime, coins, previousAnswers, hideIntro, isDevMode, hasRevivedInCurrentGame, language,
    streak, helpCount, langsUsed, dailyRewardsToday, lastRewardTime,
    startNewLevel, setCurrentValue, tickTimer, addLevelTime, setHideIntro, startGame, goToMenu, resetStreak, unlockMedal, claimDailyReward
  } = useGameStore();
  const t = Translations[language];

  const [sequence, setSequence] = useState<SymbolType[]>([]);
  const [expected, setExpected] = useState<number>(0);
  const [showSolution, setShowSolution] = useState(false);
  const [hasPaidForSolution, setHasPaidForSolution] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

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
      // Reset game-local UI states when not in playing mode
      setShowTutorialModal(false);
      setShowIntroModal(false);
    }
  }, [level, gameState, hideIntro]);



  useEffect(() => {
    let interval: number;
    const isModalOpen = showTutorialModal || showIntroModal; // Intentionally excluding showExitConfirm so timer keeps running
    if (gameState === 'PLAYING' && !isPaused && !isModalOpen && !isDevMode) {
      interval = setInterval(() => {
        tickTimer(0.1);
        if (useGameStore.getState().timeLeft <= 0) {
          setShowExitConfirm(false); // Close modal if time runs out
          handleGameOver();
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState, isPaused, showTutorialModal, showIntroModal, isDevMode]);

  useEffect(() => {
    const isModalOpen = showTutorialModal || showIntroModal || showExitConfirm;
    if (gameState === 'PLAYING' && !isPaused && !isModalOpen && !isDevMode && timeLeft < 5 && timeLeft > 0 && Math.floor(timeLeft) === timeLeft) {
      playSound('tick');
    }
  }, [Math.floor(timeLeft), gameState, isPaused, showTutorialModal, showIntroModal, showExitConfirm, isDevMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModalOpen = showTutorialModal || showIntroModal || showExitConfirm;
      if (gameState !== 'PLAYING' || isPaused || isModalOpen) return;

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

  const handleStartGame = (asDev = false) => {
    setShowSolution(false);
    setHasPaidForSolution(false);
    startGame(asDev);
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
    const puzzle = generatePuzzle(level, previousAnswers);
    setSequence(puzzle.sequence);
    setExpected(puzzle.expectedResult);
    setShowSolution(false);
    setHasPaidForSolution(false);
    setIsPaused(false);
    startNewLevel();
  };

  const handleGameOver = () => {
    playSound('fail');
    resetStreak();
    setShowSolution(false); // Reset solution when entering GameOver
    useGameStore.setState({ gameState: 'GAMEOVER' });
  };

  const handleLevelComplete = () => {
    playSound('success');
    setShowSolution(false); // Reset solution for the next level
    const timeSpent = Number((maxTime - timeLeft).toFixed(2));
    addLevelTime(timeSpent);
    useGameStore.setState({ lastLevelTime: timeSpent });
    useGameStore.getState().incrementStreak();
    useGameStore.setState(s => ({
      level: s.level + 1,
      coins: s.coins + 5,
      previousAnswers: [expected, s.previousAnswers[0]]
    }));
  };


  const handleSubmission = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (currentValue === expected) {
      handleLevelComplete();
    } else {
      handleGameOver();
    }

    // Release lock slightly after state transition
    setTimeout(() => {
      setIsSubmitting(false);
    }, 300);
  };

  const adjustValue = (dir: number) => {
    playSound('click');
    setCurrentValue(currentValue + dir);
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

  const timePercent = isDevMode ? 100 : (timeLeft / maxTime) * 100;

  return (
    <div className="h-[100dvh] w-full bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-neutral-200 overflow-hidden relative" style={{ display: 'block' }}>
      
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
          />
        ) : gameState === 'GAMEOVER' ? (
          <GameOverScreen
            level={level}
            totalTimeSpent={totalTimeSpent}
            expected={expected}
            isDevMode={isDevMode}
            hasRevivedInCurrentGame={hasRevivedInCurrentGame}
            goToMenu={goToMenu}
          />
        ) : (
          <>
            {/* GAME HEADER */}
            <header className="flex justify-between items-center px-4 py-3 md:p-6 w-full max-w-2xl mx-auto z-10 shrink-0">
              <div className="flex flex-col">
                <span className="text-4xl font-black tracking-tighter flex items-center gap-3">
                  {t.header_level} {level}
                  {isDevMode && <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full font-bold tracking-widest uppercase">{t.dev_test}</span>}
                </span>
                <span className="text-sm font-semibold tracking-widest text-neutral-500 mt-1 uppercase">
                  {t.header_time} <span className="text-neutral-900">{isDevMode ? '∞' : `${totalTimeSpent.toFixed(2)}s`}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-neutral-200 rounded-2xl shadow-sm text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <Icons.Home className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-neutral-200/60 shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></div>
                  <span className="font-black text-sm md:text-base tabular-nums leading-none" style={{ color: '#000000' }}>{coins}</span>
                </div>
              </div>
            </header>

            {/* MAIN GAME AREA */}
            <main className="flex-1 flex flex-col items-center justify-center px-2 md:px-4 w-full max-w-2xl mx-auto relative z-10 pb-2 overflow-hidden">
              {/* SEQUENCE DISPLAY */}
              <motion.div
                layout
                className="flex-1 min-h-0 flex flex-wrap justify-center content-center items-center gap-[2px] md:gap-1.5 mb-2 md:mb-4 px-2 py-4 md:px-6 md:py-6 rounded-3xl bg-white shadow-[0_20px_40px_rgb(0,0,0,0.04)] border border-neutral-100 w-full relative overflow-y-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-50/50 pointer-events-none"></div>

                <AnimatePresence mode="popLayout">
                  {sequence.map((sym, i) => {
                    if (sym === 'ReverseNext') {
                      return (
                        <div key={`${level}-${i}-revgroup`} className="flex flex-nowrap items-center shrink-0">
                          <SymbolDisplay type="ReverseNext" />
                          {i + 1 < sequence.length && sequence[i + 1] !== 'InvertAll' && <SymbolDisplay type={sequence[i + 1]} />}
                        </div>
                      );
                    }
                    if (i > 0 && sequence[i - 1] === 'ReverseNext' && sym !== 'InvertAll') return null;

                    return (
                      <div key={`${level}-${i}-${sym}`} className="shrink-0 flex items-center">
                        <SymbolDisplay type={sym} />
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
            <footer className="w-full max-w-2xl mx-auto px-4 pb-4 md:px-6 md:pb-6 flex flex-col gap-4 z-10 relative shrink-0">
              <div className="w-full h-3 bg-neutral-200/60 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className={`h-full ${isDevMode ? 'bg-amber-400' : (timeLeft < 5 ? 'bg-red-500' : 'bg-[#1D1D1F]')}`}
                  animate={{ width: `${timePercent}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  onClick={handleTogglePause}
                  disabled={showTutorialModal || showIntroModal || (!isPaused && !isDevMode && coins < 50)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[9px] font-bold tracking-widest transition disabled:opacity-30 ${isPaused ? 'bg-amber-100 border-amber-200 text-amber-900 shadow-inner' : 'bg-white border-neutral-100 text-neutral-600 shadow-sm'}`}
                >
                  <span>{isPaused ? t.btn_resume : t.btn_pause}</span>
                  <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full mt-1">50C</span>
                </button>

                <button
                  onClick={() => useGameStore.getState().addTime(10)}
                  disabled={isPaused || showTutorialModal || showIntroModal || coins < 10}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-neutral-100 text-[9px] font-bold tracking-widest shadow-sm disabled:opacity-30"
                >
                  <span>{t.btn_plus10}</span>
                  <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full mt-1">10C</span>
                </button>

                <button
                  onClick={handleToggleSolution}
                  disabled={isPaused || showTutorialModal || showIntroModal || (!showSolution && !isDevMode && !hasPaidForSolution && coins < 50)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-neutral-100 text-[9px] font-bold tracking-widest shadow-sm disabled:opacity-30"
                >
                  <span>{showSolution ? t.btn_hide : t.btn_reveal}</span>
                  <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full mt-1">50C</span>
                </button>
              </div>
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
                        <img src={getSymbolSrc(s)} alt={s} draggable={false} className="w-7 h-7 md:w-8 md:h-8" />
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
                  <p className="text-sm text-neutral-500 mb-6 font-medium leading-relaxed">{t.daily_gift_desc?.split('100')[0]}<strong className="text-amber-500">100 Coin</strong>{t.daily_gift_desc?.split('100')[1]}</p>
                  {dailyRewardsToday < 3 && (dailyRewardsToday === 0 || (Date.now() - (lastRewardTime || 0) >= 3 * 60 * 60 * 1000)) ? (
                    <button onClick={async (e) => { e.stopPropagation(); const res = await Ads.showRewardedAd(); if (res.success) { claimDailyReward(); setShowDailyRewardGlobal(false); setShowSuccessGlobal(true); playSound('success'); }}} className="w-full py-4 bg-[#1D1D1F] text-white rounded-2xl font-black tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"> {t.daily_gift_watch}</button>
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
                    <button onClick={() => { setShowExitConfirm(false); goToMenu(); }} className="w-full py-4 bg-neutral-100 text-neutral-400 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors">{t.exit_confirm_yes}</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>,
        document.getElementById('modal-root')!
      )}
    </div>
  );
}
