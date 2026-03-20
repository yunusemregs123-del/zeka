import { useEffect, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { generatePuzzle, isTutorialLevel, getTutorialSymbols, type SymbolType } from './lib/LevelEngine';
import * as Leaderboard from './lib/Leaderboard';
import * as Icons from './components/Icons';
import { motion, AnimatePresence } from 'framer-motion';

let audioCtx: AudioContext | null = null;

const playSound = (type: 'click' | 'success' | 'fail' | 'tick' | 'intro') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  // Reuse audio context to prevent 6-context browser limit dropping sounds
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  
  if (type === 'click') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'success') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.1);
    osc.frequency.setValueAtTime(800, now + 0.2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'fail') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now); osc.stop(now + 0.3);
  } else if (type === 'tick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(now); osc.stop(now + 0.05);
  } else if (type === 'intro') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(now); osc.stop(now + 0.5);
  }
};

const TUTORIAL_CONTENT: Record<number, { title: string, desc: string, exampleText?: string, exampleSequence?: SymbolType[], exampleResult?: number | string }> = {
  11: {
    title: "YENİ SİMGE: YUKARI VE AŞAĞI ÜÇGEN",
    desc: "Araya artı (+) girdikten sonraki kısımlar tamamen yeni simgedir. Yukarı üçgen sonuca doğrudan +1 ekler. Aşağı üçgen ise eksi etki (-1) yaratır. Zamanla sayıları artırmak veya azaltmak için sıklıkla kullanılacak.",
    exampleText: "Örnek İşlem (1 + 1):",
    exampleSequence: ['CircleFilled', 'Plus', 'TriangleUp'],
    exampleResult: 2
  },
  36: {
    title: "YENİ SİMGE: YAKIN GEÇMİŞ HAFIZASI (1)",
    desc: "İçinde 1 yazan dairesel ok, BİR ÖNCEKİ (az önce başarıyla geçtiğin) bölümün doğru cevabı neyse birebir o sayıyı ifade eder. Artık her geçtiğin bölümün cevabını kısa süreliğine hafızana kazıman gerekecek!",
    exampleText: "Diyelim ki bir önceki elin doğru cevabı 5 idi:",
    exampleSequence: ['CircleFilled', 'Plus', 'Prev1'],
    exampleResult: 6
  },
  51: {
    title: "YENİ SİMGE: DERİN GEÇMİŞ HAFIZASI (2)",
    desc: "İçinde 2 yazan bu dairesel ok işleri iyice zorlaştırır. Bu simge, İKİ BÖLÜM ÖNCEKİ doğru cevaptır! Sadece bir önceki değil, ondan da önceki bölümün sonucunu aklında tutmalısın.",
    exampleText: "Diyelim ki İKİ el önceki cevap 3 idi:",
    exampleSequence: ['TriangleUp', 'Plus', 'Prev2'],
    exampleResult: 4
  },
  61: {
    title: "YENİ SİMGE: ÇARPAN VE BÖLEN KUTULAR",
    desc: "İçinde 'x2' yazan kare geldiğinde, o noktaya gelene kadarki işlemin sonucunu direkt 2 ile çarpar. '/2' ise yarısına böler.",
    exampleText: "Örnek (2 x 2):",
    exampleSequence: ['CircleFilled', 'CircleFilled', 'Plus', 'Mul2'],
    exampleResult: 4
  },
  76: {
    title: "YENİ SİMGE: YÖN TERSİNE ÇEVİRİCİ DÜZ OKLAR",
    desc: "İleri ve geri yönündeki iki ok KESİNLİKLE '+' almadan doğrudan sağındaki işlemin mantığını yıkar! +1'i -1, Çarpmayı Bölme yapar.",
    exampleText: "Zıt etki (1 - 1):",
    exampleSequence: ['CircleFilled', 'Plus', 'ReverseNext', 'TriangleUp'],
    exampleResult: 0
  },
  91: {
    title: "YENİ SİMGE: HİÇLİK YILDIZI",
    desc: "Bazen dizi ne kadar karmaşık olursa olsun bölümün sonlarına doğru bir yıldız belirebilir. Yıldız var olan bütün denklemi kırar, geçmişi ve geleceği hiçe sayar.",
    exampleText: "Yıldızlı bir sorunun tek cevabı vardır:",
    exampleSequence: ['TriangleUp', 'Plus', 'Star'],
    exampleResult: 0
  },
  111: {
    title: "YENİ SİMGE: İŞARET DEĞİŞTİREN KARE",
    desc: "Üstü siyah çapraz bir çizgiyle kapatılmış boş kare HER ZAMAN bölüm dizisinin en sonuna yerleşir. O noktaya kadar doğru cevabı ne bulduysan onun işaretini (artıysa eksi, eksiyse artı) ters çevirir, seni dev bir tuzağa düşürür.",
    exampleText: "Tüm sonucu tersine (2 -> -2) çevirir:",
    exampleSequence: ['CircleFilled', 'CircleFilled', 'Plus', 'InvertAll'],
    exampleResult: -2
  },
  131: {
    title: "YENİ SİMGE: OLAĞANÜSTÜ KALP",
    desc: "Sürpriz! Kalp ortaya çıktığında, eğer senin hesapladığın denklemin asıl cevabı eksi (-) bir değere düşüyorsa, oyun sana acır ve o bölümün cevabını 0 kabul eder. Ancak asıl cevabın pozitif bir değerse, Kalp işlemi hiç etkilemezmiş gibi doğru cevabı bulmalısın.",
    exampleText: "Cevap -1 olsa bile son anda Kalp kurtarır:",
    exampleSequence: ['CircleEmpty', 'Plus', 'Heart'],
    exampleResult: 0
  }
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
    <div className="w-full bg-neutral-50/80 border border-neutral-100 rounded-2xl p-4 mb-8 text-left overflow-x-auto shadow-[inset_0_2px_10px_rgb(0,0,0,0.02)]">
      {text && <span className="block text-[10px] font-black text-amber-500 tracking-widest uppercase mb-3">{text}</span>}
      <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap min-w-max pb-1">
        {sequence.map((sym, i) => (
          <div key={i} className={sym !== 'Plus' ? 'bg-white shadow-sm border border-neutral-100 rounded-xl' : ''}>
            <SymbolDisplay type={sym} />
          </div>
        ))}
        <span className="text-xl font-black text-neutral-300 mx-3">=</span>
        <span className="text-3xl font-black text-amber-500">{result}</span>
      </div>
    </div>
  );
};

// ─── MENU SCREEN ──────────────────────────────────────
function MenuScreen({ startGame }: { startGame: (asDev?: boolean) => void }) {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'alltime'>('daily');
  const [scores, setScores] = useState<Leaderboard.ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const personalBest = Leaderboard.getPersonalBest();

  useEffect(() => {
    setLoading(true);
    const fetch = async () => {
      let data: Leaderboard.ScoreEntry[];
      if (tab === 'daily') data = await Leaderboard.getDailyScores();
      else if (tab === 'weekly') data = await Leaderboard.getWeeklyScores();
      else data = await Leaderboard.getAllTimeScores();
      setScores(data);
      setLoading(false);
    };
    fetch();
  }, [tab]);

  const tabLabels = { daily: 'GÜNLÜK', weekly: 'HAFTALIK', alltime: 'TÜM ZAMANLAR' };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center font-sans selection:bg-neutral-200 p-4 md:p-6 relative overflow-y-auto">
      
      <button 
        onClick={() => startGame(true)}
        className="absolute top-3 right-3 px-3 py-1.5 bg-neutral-200 text-neutral-500 rounded-lg font-bold text-[9px] tracking-widest hover:bg-neutral-300 transition-all opacity-40 hover:opacity-100 z-10"
      >
        DEV
      </button>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center w-full max-w-sm mt-8 md:mt-12 mb-6">
        <div className="w-20 h-20 bg-[#1D1D1F] text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 hover:rotate-6 transition-transform">
          <h1 className="text-4xl font-black">Z</h1>
        </div>
        <h1 className="text-5xl font-black tracking-tighter mb-2 text-[#1D1D1F]">ZEKA</h1>
        <p className="text-base text-neutral-400 font-semibold mb-6 tracking-widest uppercase">Zihin Bulmacası</p>
        
        <button 
          onClick={() => startGame(false)}
          className="w-full py-5 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] text-lg shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all"
        >
          BAŞLA
        </button>
      </motion.div>

      {personalBest && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 mb-4"
        >
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase">KİŞİSEL REKOR</span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl font-black">Bölüm {personalBest.level}</span>
                <span className="text-neutral-400 font-bold text-sm">{Leaderboard.formatTime(personalBest.totalTime)}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center">
              <span className="text-xl">🏆</span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden mb-8"
      >
        <div className="flex border-b border-neutral-100">
          {(['daily', 'weekly', 'alltime'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[10px] md:text-xs font-black tracking-widest uppercase transition-all relative ${
                tab === t ? 'text-[#1D1D1F]' : 'text-neutral-300 hover:text-neutral-500'
              }`}
            >
              {tabLabels[t]}
              {tab === t && (
                <motion.div layoutId="tabIndicator" className="absolute bottom-0 inset-x-4 h-[3px] bg-[#1D1D1F] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="p-3 md:p-4 max-h-[280px] overflow-y-auto">
          {scores.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-4xl mb-3 block">🎯</span>
              <p className="text-neutral-400 font-semibold text-sm">Henüz skor yok</p>
              <p className="text-neutral-300 text-xs mt-1">Oynayarak ilk skoru sen kır!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {loading ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="w-8 h-8 border-4 border-neutral-200 border-t-[#1D1D1F] rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">Yükleniyor...</span>
                </div>
              ) : (
                scores.slice(0, 20).map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition ${
                      idx === 0 ? 'bg-amber-50 border border-amber-100' :
                      idx === 1 ? 'bg-neutral-50 border border-neutral-100' :
                      idx === 2 ? 'bg-orange-50/60 border border-orange-100/60' :
                      'hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-white' :
                      idx === 1 ? 'bg-neutral-300 text-white' :
                      idx === 2 ? 'bg-orange-300 text-white' :
                      'bg-neutral-100 text-neutral-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm block truncate">{entry.player_name}</span>
                      <span className="text-[10px] text-neutral-400 font-medium">{Leaderboard.formatDate(entry.created_at)}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-sm block">Blm {entry.level}</span>
                      <span className="text-[10px] text-neutral-400 font-semibold">{Leaderboard.formatTime(entry.total_time)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── GAME OVER SCREEN ──────────────────────────────────────
function GameOverScreen({ level, totalTimeSpent, expected, isDevMode, goToMenu }: {
  level: number; totalTimeSpent: number; expected: number; isDevMode: boolean; goToMenu: () => void;
}) {
  const [playerName, setPlayerName] = useState(Leaderboard.getPlayerName() || '');
  const [saved, setSaved] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  const handleSaveScore = async () => {
    if (isDevMode) { goToMenu(); return; }
    const name = playerName.trim() || 'Anonim';
    Leaderboard.setPlayerName(name);
    await Leaderboard.addScore(name, level, totalTimeSpent);
    const newBest = Leaderboard.updatePersonalBest(level, totalTimeSpent);
    setIsNewBest(newBest);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center font-sans selection:bg-neutral-200 p-4 md:p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-neutral-100 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-3 bg-red-500"></div>
        
        {isNewBest && saved && (
          <motion.div initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }} 
            className="bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-full px-4 py-2 inline-flex items-center gap-2 font-bold text-xs tracking-widest mb-4 mt-4"
          >
            <span className="text-lg">🏆</span> YENİ KİŞİSEL REKOR!
          </motion.div>
        )}

        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 text-red-500 mt-3">OYUN BİTTİ</h1>
        <p className="text-base text-neutral-500 font-medium mb-6 leading-snug">
          Doğru cevap: <strong className="text-black text-xl ml-1">{expected > 0 ? `+${expected}` : expected}</strong>
        </p>

        <div className="flex flex-col gap-2 mb-6 text-left bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 font-bold text-xs tracking-widest">ULAŞILAN BÖLÜM</span>
            <span className="text-2xl font-black">{level}</span>
          </div>
          <div className="border-t border-neutral-200/60 my-1"></div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 font-bold text-xs tracking-widest">TOPLAM SÜRE</span>
            <span className="text-2xl font-black">{isDevMode ? 'N/A' : Leaderboard.formatTime(totalTimeSpent)}</span>
          </div>
        </div>

        {!saved && !isDevMode ? (
          <div className="mb-4">
            <label className="block text-[10px] font-black text-neutral-400 tracking-widest uppercase mb-2 text-left">TAKMA ADIN</label>
            <input 
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Adını gir..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-center text-lg outline-none focus:border-amber-400 focus:bg-white transition"
              onKeyDown={e => { if(e.key === 'Enter') handleSaveScore(); }}
            />
            <button 
              onClick={handleSaveScore}
              className="w-full mt-4 py-4 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] text-sm shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all"
            >
              SKORU KAYDET
            </button>
          </div>
        ) : (
          <button 
            onClick={() => goToMenu()}
            className="w-full py-4 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] text-sm shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all"
          >
            ANA MENÜ
          </button>
        )}
      </motion.div>
    </div>
  );
}

export default function App() {
  const { 
    gameState, level, totalTimeSpent, currentValue, timeLeft, maxTime, coins, previousAnswers, hideIntro, isDevMode,
    startNewLevel, setCurrentValue, tickTimer, addLevelTime, endGame, setHideIntro, startGame, goToMenu, devAdvanceLevel
  } = useGameStore();

  const [sequence, setSequence] = useState<SymbolType[]>([]);
  const [expected, setExpected] = useState<number>(0);
  const [showSolution, setShowSolution] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
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
    endGame(); // Sets Gamestate to GAMEOVER
  };

  const handleLevelComplete = () => {
    playSound('success');
    addLevelTime(Number((maxTime - timeLeft).toFixed(2))); 
    useGameStore.setState(s => ({
      level: s.level + 1,
      coins: s.coins + 5,
      previousAnswers: [expected, s.previousAnswers[0]]
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    return <GameOverScreen level={level} totalTimeSpent={totalTimeSpent} expected={expected} isDevMode={isDevMode} goToMenu={goToMenu} />;
  }

  return (
    <div className="h-[100dvh] w-full bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans selection:bg-neutral-200 overflow-hidden relative">
      
      {/* HEADER */}
      <header className="flex justify-between items-center px-4 py-3 md:p-6 w-full max-w-3xl mx-auto z-10 shrink-0">
        <div className="flex flex-col">
          <span className="text-4xl font-black tracking-tighter flex items-center gap-3">
            BÖLÜM {level}
            {isDevMode && <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full font-bold tracking-widest uppercase">TEST</span>}
          </span>
          <span className="text-sm font-semibold tracking-widest text-neutral-500 mt-1 uppercase">
            Toplam Süre: <span className="text-neutral-900">{isDevMode ? '∞' : `${totalTimeSpent.toFixed(2)}s`}</span>
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
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest shrink-0 bg-amber-50 px-2 py-1 rounded">HIZLI ATLA</span>
              <button onClick={() => devAdvanceLevel(1)} className="px-3 py-1.5 bg-neutral-200 rounded-lg text-[11px] font-bold transition hover:bg-neutral-300 shrink-0">Bölüm 1</button>
              <button onClick={() => devAdvanceLevel(120)} className="px-3 py-1.5 bg-neutral-200 rounded-lg text-[11px] font-bold transition hover:bg-neutral-300 shrink-0">Bölüm 120 (Max)</button>
              <button onClick={() => devAdvanceLevel(500)} className="px-3 py-1.5 bg-amber-200 rounded-lg text-[11px] font-bold shadow-sm transition hover:bg-amber-300 shrink-0">Bölüm 500 (Sonsuz)</button>
              
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
              <button onClick={() => goToMenu()} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-[11px] font-bold transition hover:bg-red-200 shrink-0">DEV ÇIKIŞ</button>
            </div>
          </div>
          
          {/* TUTORIALS BAR */}
          <div className="w-full overflow-x-auto hide-scrollbar pb-1">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest shrink-0 bg-amber-50 px-2 py-1 rounded">MODALLAR</span>
              {[11, 36, 51, 61, 76, 91, 111, 131].map(lvl => (
                <button key={lvl} onClick={() => devAdvanceLevel(lvl)} className="px-2 py-1 bg-white border border-neutral-200 rounded text-[10px] font-bold hover:bg-neutral-50 transition shrink-0 whitespace-nowrap">
                  {TUTORIAL_CONTENT[lvl]?.title.split(':')[0] || `Bölüm ${lvl}`}
                </button>
              ))}
            </div>
          </div>

          <span className="font-semibold text-neutral-500 text-[11px]">Gerçek Cevap (Kopya): <strong className="text-amber-500 text-sm ml-1">{expected}</strong></span>
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
            ONAYLA
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
            <span>{isPaused ? 'DEVAM ET' : 'DURDUR'}</span>
            <span className="text-[8px] md:text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 md:py-1 rounded-full">{isDevMode || isPaused ? 'ÜCRTSZ' : '50C'}</span>
          </button>
          
          <button 
            onClick={() => useGameStore.getState().addTime(10)}
            disabled={isPaused || showTutorialModal || showIntroModal || isDevMode || coins < 10}
            className="flex flex-col md:flex-row items-center justify-center gap-1 p-2 md:p-4 rounded-xl md:rounded-2xl bg-white shadow-sm border border-neutral-100 font-bold text-[9px] md:text-xs tracking-widest hover:bg-neutral-50 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <span>+10 SN</span> 
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
            <span>{showSolution ? 'GİZLE' : 'ÇÖZÜM'}</span>
            <span className="text-[8px] md:text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 md:py-1 rounded-full">{isDevMode ? 'ÜCRTSZ' : '50C'}</span>
          </button>
        </div>
      </footer>

      {/* OVERLAYS */}
      <AnimatePresence>
        
        {/* INTRO MODAL */}
        {showIntroModal && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4 text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-2xl max-w-sm w-full max-h-[90dvh] overflow-y-auto"
            >
              <h2 className="text-xl font-black tracking-tight mb-8 text-[#1D1D1F]">NASIL OYNANIR?</h2>
              <div className="flex justify-center gap-6 mb-8 bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white border border-neutral-200 shadow-sm rounded-full"><SymbolDisplay type="CircleFilled" /></div>
                  <span className="font-bold text-xl text-green-600">+1</span>
                  <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Dolu</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white border border-neutral-200 shadow-sm rounded-full"><SymbolDisplay type="CircleEmpty" /></div>
                  <span className="font-bold text-xl text-red-500">-1</span>
                  <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Boş</span>
                </div>
              </div>
              <p className="text-neutral-500 font-medium leading-relaxed mb-8 text-sm md:text-base">
                Ekranda gördüğün matematiksel dizginin toplam değerini zihninden hesapla. Alt taraftaki dev üçgen oklarıyla kendi cevabını ekrana yaz ve süre bitmeden CONFIRM'e bas!
              </p>
              
              <div className="flex items-center justify-center gap-3 mb-8 bg-neutral-100/50 p-4 rounded-xl cursor-pointer" onClick={() => setIntroCheckbox(!introCheckbox)}>
                <input 
                  type="checkbox" 
                  checked={introCheckbox} 
                  onChange={(e) => setIntroCheckbox(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 accent-[#1D1D1F] cursor-pointer"
                />
                <label className="font-bold tracking-wide text-xs text-neutral-600 cursor-pointer select-none uppercase">Tekrar Gösterme</label>
              </div>

              <button 
                onClick={() => {
                  if (introCheckbox) setHideIntro(true);
                  setShowIntroModal(false);
                  initLevel();
                }}
                className="w-full py-5 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all text-sm"
              >
                ANLADIM, BAŞLA!
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* TUTORIAL MODAL WITH DESCRIPTIONS */}
        {showTutorialModal && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4 text-center overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-5 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl max-w-[95%] sm:max-w-lg w-full flex flex-col items-center my-8"
            >
              <div className="px-4 py-2 bg-amber-100 text-amber-600 rounded-full font-bold tracking-widest text-xs mb-8 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                DİKKAT!
              </div>

              <div className="flex justify-center flex-wrap gap-4 mb-8">
                {getTutorialSymbols(level).map(s => (
                  <div key={s} className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm scale-125 my-2">
                    <SymbolDisplay type={s} />
                  </div>
                ))}
              </div>

              <h2 className="text-xl md:text-2xl font-black text-[#1D1D1F] mb-4 tracking-tighter">
                {TUTORIAL_CONTENT[level]?.title || "YENİ BİR KURAL"}
              </h2>

              <p className="text-neutral-500 font-medium leading-relaxed mb-6 text-[15px] max-w-sm">
                {TUTORIAL_CONTENT[level]?.desc || "Bu yeni kural oyunun matematğini değiştirecek!"}
              </p>

              {TUTORIAL_CONTENT[level]?.exampleSequence && (
                <TutorialExample 
                  text={TUTORIAL_CONTENT[level].exampleText}
                  sequence={TUTORIAL_CONTENT[level].exampleSequence}
                  result={TUTORIAL_CONTENT[level].exampleResult}
                />
              )}

              <button 
                onClick={() => {
                  setShowTutorialModal(false);
                  initLevel();
                }}
                className="w-full py-5 bg-[#1D1D1F] text-white rounded-full font-bold tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all text-sm"
              >
                MEYDAN OKUYORUM
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
            DOĞRU CEVAP: <span className="text-amber-400 ml-1">{expected}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
