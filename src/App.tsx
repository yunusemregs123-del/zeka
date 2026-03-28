import { useEffect, useState } from 'react';
import { StatusBar } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { useGameStore } from './store/useGameStore';
import { generatePuzzle, isTutorialLevel, getTutorialSymbols, type SymbolType } from './lib/LevelEngine';
import * as Leaderboard from './lib/Leaderboard';
import * as Icons from './components/Icons';
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

const TUTORIAL_DATA: Record<number, { exampleSequence?: SymbolType[], exampleResult?: number | string }> = {
  11: { exampleSequence: ['CircleFilled', 'Plus', 'TriangleUp'], exampleResult: 2 },
  36: { exampleSequence: ['CircleFilled', 'Plus', 'Prev1'], exampleResult: 6 },
  51: { exampleSequence: ['TriangleUp', 'Plus', 'Prev2'], exampleResult: 4 },
  61: { exampleSequence: ['CircleFilled', 'CircleFilled', 'Plus', 'Mul2'], exampleResult: 4 },
  76: { exampleSequence: ['CircleFilled', 'Plus', 'ReverseNext', 'TriangleUp'], exampleResult: 0 },
  91: { exampleSequence: ['TriangleUp', 'Plus', 'Star'], exampleResult: 0 },
  111: { exampleSequence: ['CircleFilled', 'CircleFilled', 'Plus', 'InvertAll'], exampleResult: -2 },
  131: { exampleSequence: ['CircleEmpty', 'Plus', 'Heart'], exampleResult: 0 }
};

const SymbolDisplay = ({ type }: { type: SymbolType }) => {
  const Icon = Icons[type as keyof typeof Icons];
  if (!Icon) return null;
  if (type === 'Plus') return <Icon className="w-4 h-4 mx-[2px] md:mx-1 md:w-6 md:h-6 text-neutral-300 shrink-0" />;
  return (
    <motion.div
      initial={{ scale: 0, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      className="flex items-center justify-center p-[2px] md:p-1"
    >
      <Icon className="w-7 h-7 md:w-9 md:h-9 text-neutral-900 drop-shadow-sm" />
    </motion.div>
  );
};

const TutorialExample = ({ text, sequence, result }: { text?: string, sequence?: SymbolType[], result?: number | string }) => {
  if (!sequence || result === undefined) return null;
  return (
    <div className="w-full bg-neutral-50/80 border border-neutral-100 rounded-2xl p-4 mb-2 text-left shadow-[inset_0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden">
      {text && <span className="block text-[10px] font-black text-amber-500 tracking-widest uppercase mb-3 whitespace-normal">{text}</span>}
      <div className="flex items-center justify-center gap-1 md:gap-2 pb-1 whitespace-nowrap flex-nowrap w-full scale-[0.80] sm:scale-100 origin-center">
        {sequence.map((sym, i) => (
          <div key={i} className={`shrink-0 ${sym !== 'Plus' ? 'bg-white shadow-sm border border-neutral-100 rounded-xl' : ''}`}>
            <SymbolDisplay type={sym} />
          </div>
        ))}
        <span className="text-xl font-black text-neutral-300 mx-1 shrink-0">=</span>
        <span className="text-2xl md:text-3xl font-black text-amber-500 shrink-0">{result}</span>
      </div>
    </div>
  );
};

// ─── MENU SCREEN ──────────────────────────────────────
function MenuScreen({ startGame }: { startGame: (asDev?: boolean) => void }) {
  const { language, setLanguage, medals, claimedMedals, claimMedalReward } = useGameStore();
  const t = Translations[language];
  const [tab, setTab] = useState<'daily' | 'weekly' | 'alltime'>('daily');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMedals, setShowMedals] = useState(false);
  const [selectedMedal, setSelectedMedal] = useState<any>(null);
  const [scores, setScores] = useState<Leaderboard.ScoreEntry[]>([]);
  const [personalRankData, setPersonalRankData] = useState<{rank: number, row: Leaderboard.ScoreEntry} | null>(null);
  const [loading, setLoading] = useState(true);
  const personalBest = Leaderboard.getPersonalBest();

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [muteAudio, setMuteAudio] = useState(localStorage.getItem('zeka_mute') === 'true');
  const logoControls = useAnimation();

  const toggleMute = () => {
    const newMute = !muteAudio;
    setMuteAudio(newMute);
    localStorage.setItem('zeka_mute', String(newMute));
  };

  useEffect(() => {
    const hideStatusBar = async () => {
      try { await StatusBar.hide(); } catch(e) {}
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

      {/* DAILY REWARD - TOP LEFT */}
      <DailyRewardButton />

      {/* DEV BUTTON - TOP RIGHT */}
      {import.meta.env.DEV && (
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => startGame(true)}
          className="px-3 py-1.5 bg-neutral-200 text-neutral-500 rounded-lg font-bold text-[9px] tracking-widest hover:bg-neutral-300 transition-all opacity-40 hover:opacity-100"
        >
          DEV
        </button>
      </div>
      )}

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

              <div className="grid grid-cols-5 gap-1 mb-6 bg-neutral-50 rounded-2xl p-2 md:p-3 border border-neutral-100 place-items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="CircleFilled" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym1}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="TriangleUp" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym2}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="Prev1" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym3}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="Prev2" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym4}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="Mul2" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym5}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="Div2" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym6}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="ReverseNext" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym7}</span>
                </div>
                <div className="flex flex-col items-center gap-1 pb-2">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="Star" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym8}</span>
                </div>
                <div className="flex flex-col items-center gap-1 pb-2">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="InvertAll" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym9}</span>
                </div>
                <div className="flex flex-col items-center gap-1 pb-2">
                  <div className="w-8 h-8 bg-white border border-neutral-200 shadow-sm rounded-xl flex items-center justify-center scale-90 md:scale-100"><SymbolDisplay type="Heart" /></div>
                  <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 text-center tracking-tighter leading-tight whitespace-pre-line">{t.info_sym10}</span>
                </div>
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

function DailyRewardButton() {
  const { lastRewardTime, dailyRewardsToday, claimDailyReward, language } = useGameStore();
  const t = Translations[language];
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isWatching, setIsWatching] = useState(false);

  const COOLDOWN_MS = 3 * 60 * 60 * 1000;
  const timePassed = lastRewardTime ? Date.now() - lastRewardTime : COOLDOWN_MS;
  const canClaim = dailyRewardsToday < 3 && timePassed >= COOLDOWN_MS;

  const getTimeRemaining = () => {
    if (!lastRewardTime) return "";
    const remaining = COOLDOWN_MS - timePassed;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours > 0 ? hours + 's ' : ''}${mins}dk`;
  };

  const handleWatch = async () => {
    setIsWatching(true);
    const result = await Ads.showRewardedAd();
    setIsWatching(false);
    if (result.success) {
      claimDailyReward();
      setShowModal(false);
      setShowSuccess(true);
      playSound('success');
    }
  };

  return (
    <>
      <div className="absolute left-4 z-10 pt-[env(safe-area-inset-top,0px)]" style={{ top: '1.5rem' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl shadow-sm border transition-all ${canClaim ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-neutral-100 text-neutral-400'}`}
        >
          <div className={`p-1 rounded-lg ${canClaim ? 'bg-amber-400 text-white animate-pulse' : 'bg-neutral-100 text-neutral-300'}`}>
            <Icons.Gift className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] font-black tracking-tight uppercase">{t.daily_reward}</span>
            <span className="text-[9px] font-bold opacity-70">
              {canClaim ? t.daily_reward_claim : (dailyRewardsToday >= 3 ? t.daily_reward_done : `${getTimeRemaining()}${t.daily_reward_wait}`)}
            </span>
          </div>
        </motion.button>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
            <motion.div
              key="daily-gift-modal"
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[2rem] p-6 w-full max-w-[320px] shadow-2xl text-center relative"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors">
                <span className="font-bold text-neutral-400 text-xs">✕</span>
              </button>
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Icons.Gift className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black mb-2">{t.daily_gift_title}</h2>
              <p className="text-sm text-neutral-500 mb-6 font-medium leading-relaxed">
                {t.daily_gift_desc?.split('100')[0]}<strong className="text-amber-500">100 Coin</strong>{t.daily_gift_desc?.split('100')[1]}
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-neutral-400 uppercase border-b border-neutral-50 pb-2 mb-2">
                  <span>{t.daily_gift_status}</span>
                  <span className="text-neutral-800">{dailyRewardsToday}/3</span>
                </div>

                {canClaim ? (
                  <button
                    onClick={handleWatch}
                    disabled={isWatching}
                    className="w-full py-4 bg-[#1D1D1F] text-white rounded-2xl font-bold tracking-widest text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                  >
                    {isWatching ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><Icons.Play className="w-4 h-4" /> {t.daily_gift_watch}</>}
                  </button>
                ) : (
                  <div className="w-full py-4 bg-neutral-100 text-neutral-400 rounded-2xl font-bold tracking-widest text-sm italic">
                    {dailyRewardsToday >= 3 ? t.daily_gift_limit : `${getTimeRemaining()}${t.daily_gift_comeback}`}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showSuccess && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70">
            <motion.div
              key="reward-success-modal"
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-[300px] shadow-2xl text-center border-b-8 border-amber-400"
            >
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-black mb-1">{t.congrats_title}</h3>
              <p className="text-neutral-500 font-bold mb-6 text-sm">{t.congrats_desc}</p>
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-amber-400 text-white rounded-2xl font-black tracking-widest text-sm shadow-lg shadow-amber-200"
              >
                {t.congrats_btn}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
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
    streak, helpCount, langsUsed,
    startNewLevel, setCurrentValue, tickTimer, addLevelTime, setHideIntro, startGame, goToMenu, devAdvanceLevel, resetStreak, unlockMedal
  } = useGameStore();
  const t = Translations[language];

  const [sequence, setSequence] = useState<SymbolType[]>([]);
  const [expected, setExpected] = useState<number>(0);
  const [showSolution, setShowSolution] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // Modals
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [introCheckbox, setIntroCheckbox] = useState(hideIntro);

  useEffect(() => {
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
    }
  }, [level, gameState]);

  useEffect(() => {
    let interval: number;
    const isModalOpen = showTutorialModal || showIntroModal;
    if (gameState === 'PLAYING' && !isPaused && !isModalOpen && !isDevMode) {
      interval = setInterval(() => {
        tickTimer(0.1);
        if (useGameStore.getState().timeLeft <= 0) {
          handleGameOver();
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState, isPaused, showTutorialModal, showIntroModal, isDevMode]);

  useEffect(() => {
    const isModalOpen = showTutorialModal || showIntroModal;
    if (gameState === 'PLAYING' && !isPaused && !isModalOpen && !isDevMode && timeLeft < 5 && timeLeft > 0 && Math.floor(timeLeft) === timeLeft) {
      playSound('tick');
    }
  }, [Math.floor(timeLeft), gameState, isPaused, showTutorialModal, showIntroModal, isDevMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModalOpen = showTutorialModal || showIntroModal;
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
  }, [gameState, isPaused, showTutorialModal, showIntroModal, currentValue, expected, isSubmitting]);

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

  const initLevel = () => {
    const puzzle = generatePuzzle(level, previousAnswers);
    setSequence(puzzle.sequence);
    setExpected(puzzle.expectedResult);
    setShowSolution(false);
    setIsPaused(false);
    startNewLevel();
  };

  const handleGameOver = () => {
    playSound('fail');
    resetStreak();
    useGameStore.setState({ gameState: 'GAMEOVER' });
  };

  const handleLevelComplete = () => {
    playSound('success');
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
    setTimeout(() => setIsSubmitting(false), 300);
  };

  const adjustValue = (dir: number) => {
    playSound('click');
    setCurrentValue(currentValue + dir);
  };

  const timePercent = isDevMode ? 100 : (timeLeft / maxTime) * 100;

  if (gameState === 'MENU') {
    return <MenuScreen startGame={startGame} />;
  }

  if (gameState === 'GAMEOVER') {
    return (
      <GameOverScreen
        level={level}
        totalTimeSpent={totalTimeSpent}
        expected={expected}
        isDevMode={isDevMode}
        hasRevivedInCurrentGame={hasRevivedInCurrentGame}
        goToMenu={goToMenu}
      />
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans selection:bg-neutral-200 overflow-hidden relative">

      {/* HEADER */}
      <header className="flex justify-between items-center px-4 py-3 md:p-6 w-full max-w-3xl mx-auto z-10 shrink-0">
        <div className="flex flex-col">
          <span className="text-4xl font-black tracking-tighter flex items-center gap-3">
            {t.header_level} {level}
            {isDevMode && <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full font-bold tracking-widest uppercase">{t.dev_test}</span>}
          </span>
          <span className="text-sm font-semibold tracking-widest text-neutral-500 mt-1 uppercase">
            {t.header_time} <span className="text-neutral-900">{isDevMode ? '∞' : `${totalTimeSpent.toFixed(2)}s`}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white px-5 py-2 rounded-full shadow-sm border border-neutral-100">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          <span className="font-bold text-lg">{coins}</span>
        </div>
      </header>

      {/* DEV MODE CONTROLS */}
      {isDevMode && (
        <div className="flex flex-col items-center gap-3 mb-2 mx-auto z-20 w-full px-4 border-b border-amber-200 pb-3 shrink-0">

          {/* QUICK JUMP BAR */}
          <div className="w-full overflow-x-auto hide-scrollbar pb-1">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest shrink-0 bg-amber-50 px-2 py-1 rounded">{t.dev_jump}</span>
              <button onClick={() => devAdvanceLevel(1)} className="px-3 py-1.5 bg-neutral-200 rounded-lg text-[11px] font-bold transition hover:bg-neutral-300 shrink-0">{t.dev_jump_1}</button>
              <button onClick={() => devAdvanceLevel(120)} className="px-3 py-1.5 bg-neutral-200 rounded-lg text-[11px] font-bold transition hover:bg-neutral-300 shrink-0">{t.dev_jump_max}</button>
              <button onClick={() => devAdvanceLevel(500)} className="px-3 py-1.5 bg-amber-200 rounded-lg text-[11px] font-bold shadow-sm transition hover:bg-amber-300 shrink-0">{t.dev_jump_inf}</button>

              <div className="flex shrink-0 border border-neutral-300 rounded-lg overflow-hidden">
                <input
                  id="devLevelInput"
                  type="number"
                  placeholder="Bölüm"
                  className="w-16 px-2 py-1.5 text-[11px] font-bold text-center outline-none focus:bg-amber-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt((e.target as HTMLInputElement).value);
                      if (!isNaN(val) && val > 0) devAdvanceLevel(val);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const val = parseInt((document.getElementById('devLevelInput') as HTMLInputElement).value);
                    if (!isNaN(val) && val > 0) devAdvanceLevel(val);
                  }}
                  className="px-3 py-1.5 bg-[#1D1D1F] text-white text-[11px] font-bold transition hover:bg-black"
                >
                  GİT
                </button>
              </div>
              <button onClick={() => goToMenu()} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-[11px] font-bold transition hover:bg-red-200 shrink-0">EXIT DEV</button>
            </div>
          </div>

          {/* TUTORIALS BAR */}
          <div className="w-full overflow-x-auto hide-scrollbar pb-1">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest shrink-0 bg-amber-50 px-2 py-1 rounded">MODALS</span>
              <button 
                onClick={() => setShowTrackingModal(true)} 
                className="px-2 py-1 bg-amber-100 border border-amber-300 text-amber-800 rounded text-[10px] font-black hover:bg-amber-200 transition shrink-0 whitespace-nowrap"
              >
                ATT (Tracking)
              </button>
              {[11, 36, 51, 61, 76, 91, 111, 131].map(lvl => (
                <button key={lvl} onClick={() => devAdvanceLevel(lvl)} className="px-2 py-1 bg-white border border-neutral-200 rounded text-[10px] font-bold hover:bg-neutral-50 transition shrink-0 whitespace-nowrap">
                  {(t[('tut_' + lvl + '_title') as keyof typeof t])?.split(':')[0] || `Level ${lvl}`}
                </button>
              ))}
            </div>
          </div>

          <span className="font-semibold text-neutral-500 text-[11px]">Reveal Answer: <strong className="text-amber-500 text-sm ml-1">{expected}</strong></span>
        </div>
      )}


      {/* MAIN PLAY AREA */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-2 md:px-4 w-full max-w-4xl mx-auto relative z-10 pb-2">

        {/* SEQUENCE DISPLAY */}
        <motion.div
          layout
          className="flex-1 min-h-0 flex flex-wrap justify-center content-center items-center gap-[2px] md:gap-2 mb-2 md:mb-6 px-2 py-4 md:px-8 md:py-8 rounded-3xl bg-white shadow-[0_20px_40px_rgb(0,0,0,0.04)] border border-neutral-100 w-full relative overflow-y-auto"
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

        {/* INPUT AREA */}
        <div className="flex items-center justify-center gap-4 md:gap-16 my-1 md:my-4 shrink-0 select-none">
          <motion.button
            whileHover={{ scale: 1.15, x: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => adjustValue(-1)}
            disabled={isPaused || showTutorialModal || showIntroModal}
            className="w-14 h-16 md:w-20 md:h-24 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-20 disabled:hover:text-neutral-400 focus:outline-none"
          >
            <Icons.TriangleDown className="w-12 h-12 md:w-16 md:h-16 rotate-90" />
          </motion.button>

          <div className="relative w-24 h-24 md:w-40 md:h-40 flex items-center justify-center bg-white rounded-full shadow-[inset_0_-8px_16px_rgb(0,0,0,0.04),0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-50 shrink-0">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentValue}
                initial={{ y: -20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute text-5xl md:text-8xl font-black tracking-tighter drop-shadow-sm"
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
            className="w-14 h-16 md:w-20 md:h-24 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-20 disabled:hover:text-neutral-400 focus:outline-none"
          >
            <Icons.TriangleUp className="w-12 h-12 md:w-16 md:h-16 rotate-90" />
          </motion.button>
        </div>

        {/* CONFIRM BUTTON */}
        <div className="mt-3 md:mt-6 mb-2 flex items-center justify-center w-full shrink-0">
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#1D1D1F' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmission}
            disabled={isPaused || showTutorialModal || showIntroModal}
            className={`px-10 py-3 md:px-16 md:py-5 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] text-sm md:text-lg shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all focus:outline-none focus:ring-4 focus:ring-neutral-200 ${isPaused || showTutorialModal || showIntroModal ? 'opacity-20 pointer-events-none scale-95' : 'opacity-100'}`}
          >
            {t.btn_submit}
          </motion.button>
        </div>
      </main>

      {/* FOOTER & TIMER */}
      <footer className="w-full max-w-3xl mx-auto px-4 pb-4 md:px-6 md:pb-8 flex flex-col gap-4 md:gap-6 z-10 relative shrink-0">

        {/* TIMER BAR */}
        <div className="w-full h-3 bg-neutral-200/60 rounded-full overflow-hidden shadow-inner flex-shrink-0">
          <motion.div
            className={`h-full ${isDevMode ? 'bg-amber-400' : (timeLeft < 5 ? 'bg-red-500' : 'bg-[#1D1D1F]')}`}
            animate={{ width: `${timePercent}%` }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </div>

        {/* POWERUPS */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <button
            onClick={() => {
              if (isDevMode) return;
              if (isPaused) {
                setIsPaused(false);
              } else if (coins >= 50) {
                useGameStore.setState(s => ({ coins: Math.max(0, s.coins - 50) }));
                setIsPaused(true);
              }
            }}
            disabled={showTutorialModal || showIntroModal || isDevMode || (!isPaused && coins < 50)}
            className={`flex flex-col md:flex-row items-center justify-center gap-1 p-2 md:p-4 rounded-xl md:rounded-2xl shadow-sm border font-bold text-[9px] md:text-xs tracking-widest transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${isPaused ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-white border-neutral-100 hover:bg-neutral-50'}`}
          >
            <span>{isPaused ? t.btn_resume : t.btn_pause}</span>
            <span className="text-[8px] md:text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 md:py-1 rounded-full">{isDevMode || isPaused ? t.btn_free : '50C'}</span>
          </button>

          <button
            onClick={() => useGameStore.getState().addTime(10)}
            disabled={isPaused || showTutorialModal || showIntroModal || isDevMode || coins < 10}
            className="flex flex-col md:flex-row items-center justify-center gap-1 p-2 md:p-4 rounded-xl md:rounded-2xl bg-white shadow-sm border border-neutral-100 font-bold text-[9px] md:text-xs tracking-widest hover:bg-neutral-50 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <span>{t.btn_plus10}</span>
            <span className="text-[8px] md:text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 md:py-1 rounded-full">10C</span>
          </button>

          <button
            onClick={() => {
              if (coins >= 50 || isDevMode) {
                useGameStore.getState().showSolution();
                setShowSolution(!showSolution);
              }
            }}
            disabled={isPaused || showTutorialModal || showIntroModal || (!showSolution && !isDevMode && coins < 50)}
            className="flex flex-col md:flex-row items-center justify-center gap-1 p-2 md:p-4 rounded-xl md:rounded-2xl bg-white shadow-sm border border-neutral-100 font-bold text-[9px] md:text-xs tracking-widest hover:bg-neutral-50 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <span>{showSolution ? t.btn_hide : t.btn_reveal}</span>
            <span className="text-[8px] md:text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 md:py-1 rounded-full">{isDevMode ? t.btn_free : '50C'}</span>
          </button>
        </div>
      </footer>

      {/* OVERLAYS */}
      <AnimatePresence>

        {showTrackingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-[320px] w-full"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-100">
                <span className="text-3xl font-black block leading-none select-none -mt-1">Z</span>
              </div>
              <h2 className="text-[17px] font-black tracking-tight mb-3 text-[#1D1D1F] uppercase">{t.att_title || "Oyunu Ücretsiz Tut"}</h2>
              <p className="text-neutral-500 font-medium leading-relaxed mb-6 text-xs px-1">
                {t.att_desc || "Oyunu tamamen ücretsiz tutabilmek ve yeni bölümler ekleyebilmek için reklamları kullanıyoruz. Sana daha uygun reklamlar sunabilmemiz için lütfen sonraki ekranda takibe izin ver."}
              </p>

              <button
                onClick={() => setShowTrackingModal(false)}
                className="w-full py-3 bg-blue-500 text-white rounded-full font-black tracking-widest uppercase shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors text-xs"
              >
                {t.att_continue || "Devam Et"}
              </button>
            </motion.div>
          </motion.div>
        )}

        {showIntroModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl shadow-2xl max-w-[300px] w-full"
            >
              <h2 className="text-lg font-black tracking-tight mb-2.5 text-[#1D1D1F]">{t.intro_title}</h2>
              
              {/* Symbol legend — compact row */}
              <div className="flex justify-center gap-5 mb-2.5 bg-neutral-50 rounded-xl p-2.5 border border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white border border-neutral-200 shadow-sm rounded-full"><SymbolDisplay type="CircleFilled" /></div>
                  <div className="text-left">
                    <span className="font-black text-sm text-green-600 block leading-none">+1</span>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">{t.intro_full}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white border border-neutral-200 shadow-sm rounded-full"><SymbolDisplay type="CircleEmpty" /></div>
                  <div className="text-left">
                    <span className="font-black text-sm text-red-500 block leading-none">-1</span>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">{t.intro_empty}</span>
                  </div>
                </div>
              </div>

              <p className="text-neutral-500 font-medium leading-snug mb-2.5 text-[11px] px-1">
                {t.intro_p1}
              </p>

              {/* Examples — side by side */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl p-2">
                  <span className="block text-[8px] font-black text-amber-500 tracking-widest uppercase mb-1">{t.intro_ex1}</span>
                  <div className="flex items-center justify-center gap-0.5">
                    <div className="bg-white shadow-sm border border-neutral-100 rounded-lg scale-75"><SymbolDisplay type="CircleFilled" /></div>
                    <span className="text-[10px] text-neutral-300 font-bold">+</span>
                    <div className="bg-white shadow-sm border border-neutral-100 rounded-lg scale-75"><SymbolDisplay type="CircleFilled" /></div>
                    <span className="text-sm font-black text-neutral-300 mx-0.5">=</span>
                    <span className="text-lg font-black text-green-500">2</span>
                  </div>
                </div>
                <div className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl p-2">
                  <span className="block text-[8px] font-black text-amber-500 tracking-widest uppercase mb-1">{t.intro_ex2}</span>
                  <div className="flex items-center justify-center gap-0.5">
                    <div className="bg-white shadow-sm border border-neutral-100 rounded-lg scale-75"><SymbolDisplay type="CircleFilled" /></div>
                    <span className="text-[10px] text-neutral-300 font-bold">+</span>
                    <div className="bg-white shadow-sm border border-neutral-100 rounded-lg scale-75"><SymbolDisplay type="CircleEmpty" /></div>
                    <span className="text-sm font-black text-neutral-300 mx-0.5">=</span>
                    <span className="text-lg font-black text-amber-500">0</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-3 bg-neutral-100/50 p-2 rounded-lg cursor-pointer" onClick={() => setIntroCheckbox(!introCheckbox)}>
                <input
                  type="checkbox"
                  checked={introCheckbox}
                  onChange={(e) => setIntroCheckbox(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 accent-[#1D1D1F] cursor-pointer"
                />
                <label className="font-bold tracking-wide text-[9px] text-neutral-600 cursor-pointer select-none uppercase">{t.intro_checkbox}</label>
              </div>

              <button
                onClick={() => {
                  if (introCheckbox) setHideIntro(true);
                  setShowIntroModal(false);
                  initLevel();
                }}
                className="w-full py-3 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs"
              >
                {t.intro_btn}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* TUTORIAL MODAL WITH DESCRIPTIONS */}
        {showTutorialModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-4 text-center overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-5 md:p-6 rounded-3xl shadow-2xl max-w-[340px] w-full flex flex-col items-center max-h-[85dvh] overflow-y-auto overflow-x-hidden"
            >
              <div className="px-3 py-1.5 bg-amber-100 text-amber-600 rounded-full font-bold tracking-widest text-[10px] mb-6 uppercase flex items-center gap-2 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {t.tut_attention}
              </div>

              <div className="flex justify-center flex-wrap gap-2 mb-6 shrink-0">
                {getTutorialSymbols(level).map(s => (
                  <div key={s} className="p-3 bg-white border border-neutral-200 rounded-xl shadow-sm my-1">
                    <SymbolDisplay type={s} />
                  </div>
                ))}
              </div>

              <h2 className="text-lg font-black text-[#1D1D1F] mb-2 tracking-tighter shrink-0">
                {t[('tut_' + level + '_title') as LanguageCode] || "YENİ BİR KURAL"}
              </h2>

              <p className="text-neutral-500 font-medium leading-relaxed mb-4 text-[12px] max-w-[280px] shrink-0">
                {t[('tut_' + level + '_desc') as LanguageCode] || "Bu yeni kural oyunun matematiğini değiştirecek!"}
              </p>

              {TUTORIAL_DATA[level]?.exampleSequence && (
                <div className="shrink-0 w-full mb-4">
                  <TutorialExample
                    text={t[('tut_' + level + '_ex') as LanguageCode]}
                    sequence={TUTORIAL_DATA[level].exampleSequence}
                    result={TUTORIAL_DATA[level].exampleResult}
                  />
                </div>
              )}

              <button
                onClick={() => {
                  setShowTutorialModal(false);
                  initLevel();
                }}
                className="w-full py-3.5 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs mt-auto shrink-0"
              >
                {t.tut_btn}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* SOLUTION POPUP */}
        {showSolution && !isPaused && (
          <motion.div
            initial={{ y: -50, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: -50, opacity: 0, x: '-50%' }}
            className="absolute top-20 md:top-24 left-1/2 bg-[#1D1D1F] text-white px-8 py-3 md:py-4 rounded-full font-bold shadow-2xl z-40 whitespace-nowrap tracking-wide text-sm md:text-base pointer-events-none"
          >
            {t.solution_text} <span className="text-amber-400 ml-1">{expected}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
