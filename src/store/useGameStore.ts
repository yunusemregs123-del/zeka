import { create } from "zustand";

export type GameMode = 'CLASSIC' | 'TIME_ATTACK' | 'MEMORY' | 'DUEL';

interface GameState {
  gameState: 'MENU' | 'PLAYING' | 'GAMEOVER';
  gameMode: GameMode;
  level: number;
  totalTimeSpent: number;
  coins: number;
  currentValue: number;
  timeLeft: number;
  maxTime: number;
  previousAnswers: number[]; 
  hideIntro: boolean;
  isDevMode: boolean; // Developer mode toggle
  hasRevivedInCurrentGame: boolean;
  language: 'en' | 'tr' | 'de' | 'ja' | 'pt';
  
  // Modes & Records
  timeAttackScore: number;
  timeAttackBest: number;
  memoryScore: number;
  memoryBest: number;
  
  lastRewardTime: number | null;
  dailyRewardsToday: number;
  medals: string[]; // List of unlocked medal IDs
  claimedMedals: string[]; // List of medal IDs where reward was claimed
  streak: number; // Correct answers in a row
  helpCount: number; // Times Solution revealed
  langsUsed: string[]; // Languages tried
  dailyRewardsTotal: number; // Lifetime daily rewards claimed
  lastLevelTime: number; // Time taken for the last level completed
  checkpointLevel: number; // Saved progress
  checkpointTime: number; // Time when checkpoint was reached
  comboCount: number; // Consecutive fast solves (<5s)
  maxLevelCompleted: number; // Maximum unique level reached for rewards

  // Actions
  setLanguage: (lang: 'en' | 'tr' | 'de' | 'ja' | 'pt') => void;
  setGameMode: (mode: GameMode) => void;
  goToMenu: () => void;
  unlockMedal: (id: string) => void;
  claimMedalReward: (id: string, reward: number) => void;
  startGame: (asDev?: boolean, startLevel?: number, mode?: GameMode) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  useHelp: () => void;
  startNewLevel: (isRetry?: boolean) => void;
  submitAnswer: (answer: number) => void;
  setCurrentValue: (val: number) => void;
  tickTimer: (dt: number) => void;
  pauseGame: () => void;
  addTime: (amount: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => void;
  reviveGame: () => void;
  showSolution: () => void;
  setHideIntro: (hide: boolean) => void;
  addLevelTime: (timeSpent: number) => void;
  endGame: () => void;
  toggleDevMode: () => void;
  devAdvanceLevel: (lvl: number) => void;
  claimDailyReward: () => void;
  incrementModeScore: () => void;
}

const getDailyRewardState = () => {
  const saved = localStorage.getItem('dailyRewardState');
  if (saved) {
    const parsed = JSON.parse(saved);
    // Reset daily count if it's a new day
    const lastDate = new Date(parsed.lastRewardTime || 0).toDateString();
    const today = new Date().toDateString();
    if (lastDate !== today) {
      return { lastRewardTime: parsed.lastRewardTime, dailyRewardsToday: 0 };
    }
    return parsed;
  }
  return { lastRewardTime: null, dailyRewardsToday: 0 };
};

const getInitialLanguage = (): 'en' | 'tr' | 'de' | 'ja' | 'pt' => {
  const saved = localStorage.getItem('zeka_lang') as 'en' | 'tr' | 'de' | 'ja' | 'pt';
  if (saved && ['en', 'tr', 'de', 'ja', 'pt'].includes(saved)) return saved;
  const browserLang = navigator.language.slice(0, 2);
  if (['tr', 'de', 'ja', 'pt'].includes(browserLang)) return browserLang as 'en' | 'tr' | 'de' | 'ja' | 'pt';
  return 'en';
};

export const useGameStore = create<GameState>((set, get) => ({
  gameState: 'MENU',
  gameMode: 'CLASSIC',
  level: 1,
  totalTimeSpent: 0,
  currentValue: 0,
  timeLeft: 20,
  maxTime: 20,
  previousAnswers: [0, 0],
  hideIntro: localStorage.getItem('hideIntro') === 'true',
  isDevMode: false,
  hasRevivedInCurrentGame: false,
  language: getInitialLanguage(),
  timeAttackScore: 0,
  timeAttackBest: Number(localStorage.getItem('zeka_ta_best')) || 0,
  memoryScore: 0,
  memoryBest: Number(localStorage.getItem('zeka_mem_best')) || 0,
  medals: JSON.parse(localStorage.getItem('zeka_medals') || '[]'),
  claimedMedals: JSON.parse(localStorage.getItem('zeka_medals_claimed') || '[]'),
  streak: 0,
  helpCount: Number(localStorage.getItem('zeka_help_count')) || 0,
  langsUsed: JSON.parse(localStorage.getItem('zeka_langs_used') || '[]'),
  dailyRewardsTotal: Number(localStorage.getItem('zeka_daily_total')) || 0,
  lastLevelTime: 0,
  checkpointLevel: Number(localStorage.getItem('zeka_checkpoint')) || 1,
  checkpointTime: Number(localStorage.getItem('zeka_checkpoint_time')) || 0,
  comboCount: 0,
  maxLevelCompleted: Number(localStorage.getItem('zeka_max_level')) || 0,
  ...getDailyRewardState(),
  
  // Starting coins: default 200 if new player
  coins: localStorage.getItem('zeka_coins') !== null ? Number(localStorage.getItem('zeka_coins')) : 200,

  setGameMode: (mode) => set({ gameMode: mode }),

  setLanguage: (lang) => {
    localStorage.setItem('zeka_lang', lang);
    const used = get().langsUsed;
    if (!used.includes(lang)) {
      const newUsed = [...used, lang];
      localStorage.setItem('zeka_langs_used', JSON.stringify(newUsed));
      set({ language: lang, langsUsed: newUsed });
    } else {
      set({ language: lang });
    }
  },

  goToMenu: () => set({ gameState: 'MENU' }),
  
  startGame: (asDev = false, startLevel?: number, mode?: GameMode) => {
    const activeMode = mode || get().gameMode;
    const checkpoint = get().checkpointLevel;
    const initialTime = get().checkpointTime;
    const initialLevel = activeMode === 'CLASSIC' ? (startLevel || (asDev ? 1 : checkpoint)) : 1;
    const startingTime = activeMode === 'TIME_ATTACK' ? 30 : (activeMode === 'MEMORY' ? 15 : (activeMode === 'DUEL' ? 15 : (initialLevel <= 50 ? 20 : Math.max(5, 20 - Math.floor((initialLevel - 50) / 10)))));

    set({ 
      gameState: 'PLAYING',
      gameMode: activeMode,
      level: initialLevel, 
      totalTimeSpent: startLevel ? 0 : (asDev ? 0 : (activeMode === 'CLASSIC' ? initialTime : 0)), 
      previousAnswers: [0,0], 
      isDevMode: asDev,
      hasRevivedInCurrentGame: false,
      streak: 0,
      comboCount: 0,
      timeAttackScore: 0,
      memoryScore: 0,
      timeLeft: startingTime,
      maxTime: startingTime,
    });
    get().startNewLevel(true);
  },

  startNewLevel: (_isRetry = false) => {
    const mode = get().gameMode;
    
    if (mode === 'TIME_ATTACK') {
      if (_isRetry || get().timeLeft <= 0) {
        set({
          currentValue: 0,
          timeLeft: 30,
          maxTime: 30,
        });
      } else {
        set({ currentValue: 0 });
      }
      return;
    }

    const currentMaxTime = mode === 'MEMORY' ? 15 : (mode === 'DUEL' ? 15 : (get().level <= 50 ? 20 : Math.max(5, 20 - Math.floor((get().level - 50) / 10))));
    set({
      currentValue: 0,
      timeLeft: get().isDevMode ? 999 : currentMaxTime,
      maxTime: get().isDevMode ? 999 : currentMaxTime,
    });
  },

  incrementModeScore: () => {
    const mode = get().gameMode;
    if (mode === 'TIME_ATTACK') {
      const newScore = get().timeAttackScore + 1;
      const best = Math.max(newScore, get().timeAttackBest);
      localStorage.setItem('zeka_ta_best', String(best));
      // Bonus time in Time Attack for correct answer (+2s, capped at 60s)
      set((s) => ({
        timeAttackScore: newScore,
        timeAttackBest: best,
        timeLeft: Math.min(60, s.timeLeft + 2.0)
      }));
    } else if (mode === 'MEMORY') {
      const newScore = get().memoryScore + 1;
      const best = Math.max(newScore, get().memoryBest);
      localStorage.setItem('zeka_mem_best', String(best));
      set({ memoryScore: newScore, memoryBest: best });
    }
  },

  submitAnswer: (_answer: number) => {},

  setCurrentValue: (val) => set({ currentValue: Math.max(-9, Math.min(9, val)) }),
  
  tickTimer: (dt) => set((state) => ({ 
    timeLeft: state.isDevMode ? state.timeLeft : Math.max(0, state.timeLeft - dt)
  })),

  pauseGame: () => {
    // We will just use modal/pause overlay in App
  },
  
  addTime: (amount) => set((state) => {
    if (state.coins >= 10) {
      const newCoins = state.coins - 10;
      localStorage.setItem('zeka_coins', String(newCoins));
      return { timeLeft: state.timeLeft + amount, coins: newCoins };
    }
    return state;
  }),

  addCoins: (amount) => set((state) => {
    const newCoins = state.coins + amount;
    localStorage.setItem('zeka_coins', String(newCoins));
    return { coins: newCoins };
  }),

  spendCoins: (amount) => set((state) => {
    const newCoins = Math.max(0, state.coins - amount);
    localStorage.setItem('zeka_coins', String(newCoins));
    return { coins: newCoins };
  }),

  reviveGame: () => set((state) => {
    // Show correct answer by forcing currentValue to expectedVal is confusing,
    // so we will just return to PLAYING and UI will handle visual showing the answer
    return { 
      gameState: 'PLAYING', 
      timeLeft: state.maxTime,
      currentValue: 0,
      hasRevivedInCurrentGame: true
    };
  }),
  
  showSolution: () => set((state) => {
    if (state.coins >= 50) {
      const newCoins = state.coins - 50;
      const newHelpCount = state.helpCount + 1;
      localStorage.setItem('zeka_coins', String(newCoins));
      localStorage.setItem('zeka_help_count', String(newHelpCount));
      return { coins: newCoins, helpCount: newHelpCount };
    }
    return state;
  }),

  setHideIntro: (hide: boolean) => {
    localStorage.setItem('hideIntro', String(hide));
    set({ hideIntro: hide });
  },

  addLevelTime: (timeSpent: number) => set((state) => ({
    totalTimeSpent: state.totalTimeSpent + timeSpent
  })),

  endGame: () => set({ gameState: 'GAMEOVER' }),

  toggleDevMode: () => set((state) => ({ 
    isDevMode: !state.isDevMode, 
    timeLeft: !state.isDevMode ? 999 : state.maxTime 
  })),

  devAdvanceLevel: (lvl) => {
    set({ level: lvl });
    get().startNewLevel();
  },

  claimDailyReward: () => {
    const now = Date.now();
    const total = get().dailyRewardsTotal + 1;
    const newState = { 
      lastRewardTime: now, 
      dailyRewardsToday: get().dailyRewardsToday + 1,
      dailyRewardsTotal: total 
    };
    localStorage.setItem('dailyRewardState', JSON.stringify(newState));
    localStorage.setItem('zeka_daily_total', String(total));
    set(newState);
    get().addCoins(200);
  },

  unlockMedal: (id) => {
    const currentMedals = get().medals;
    if (currentMedals.includes(id)) return;
    
    const newMedals = [...currentMedals, id];
    localStorage.setItem('zeka_medals', JSON.stringify(newMedals));
    set({ medals: newMedals });
  },

  claimMedalReward: (id, reward) => {
    const claimed = get().claimedMedals;
    if (claimed.includes(id)) return;

    const newClaimed = [...claimed, id];
    localStorage.setItem('zeka_medals_claimed', JSON.stringify(newClaimed));
    set({ claimedMedals: newClaimed });
    get().addCoins(reward);
  },

  incrementStreak: () => set(s => ({ streak: s.streak + 1 })),
  resetStreak: () => set({ streak: 0 }),
  incrementCombo: () => set(s => ({ comboCount: s.comboCount + 1 })),
  resetCombo: () => set({ comboCount: 0 }),
  useHelp: () => set(s => ({ helpCount: s.helpCount + 1 }))
}));
