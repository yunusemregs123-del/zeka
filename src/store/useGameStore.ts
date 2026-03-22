import { create } from "zustand";

interface GameState {
  gameState: 'MENU' | 'PLAYING' | 'GAMEOVER';
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
  
  lastRewardTime: number | null;
  dailyRewardsToday: number;
  medals: string[]; // List of unlocked medal IDs
  streak: number; // Correct answers in a row
  helpCount: number; // Times Solution revealed
  langsUsed: string[]; // Languages tried
  lastLevelTime: number; // Time taken for the last level completed

  // Actions
  setLanguage: (lang: 'en' | 'tr' | 'de' | 'ja' | 'pt') => void;
  goToMenu: () => void;
  unlockMedal: (id: string, reward: number) => void;
  startGame: (asDev?: boolean) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  useHelp: () => void;
  startNewLevel: (isRetry?: boolean) => void;
  submitAnswer: (answer: number) => void;
  setCurrentValue: (val: number) => void;
  tickTimer: (dt: number) => void;
  pauseGame: () => void;
  addTime: (amount: number) => void;
  addCoins: (amount: number) => void;
  reviveGame: () => void;
  showSolution: () => void;
  setHideIntro: (hide: boolean) => void;
  addLevelTime: (timeSpent: number) => void;
  endGame: () => void;
  toggleDevMode: () => void;
  devAdvanceLevel: (lvl: number) => void;
  claimDailyReward: () => void;
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
  level: 1,
  totalTimeSpent: 0,
  coins: Number(localStorage.getItem('zeka_coins')) || 0,
  currentValue: 0,
  timeLeft: 20,
  maxTime: 20,
  previousAnswers: [0, 0],
  hideIntro: localStorage.getItem('hideIntro') === 'true',
  isDevMode: false,
  hasRevivedInCurrentGame: false,
  language: getInitialLanguage(),
  medals: JSON.parse(localStorage.getItem('zeka_medals') || '[]'),
  streak: 0,
  helpCount: Number(localStorage.getItem('zeka_help_count')) || 0,
  langsUsed: JSON.parse(localStorage.getItem('zeka_langs_used') || '[]'),
  lastLevelTime: 0,
  ...getDailyRewardState(),

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
  
  startGame: (asDev = false) => {
    set({ 
      level: 1, 
      totalTimeSpent: 0, 
      previousAnswers: [0,0], 
      gameState: 'PLAYING',
      isDevMode: asDev,
      hasRevivedInCurrentGame: false,
      streak: 0, // Reset session streak
    });
    get().startNewLevel(true);
  },

  startNewLevel: (_isRetry = false) => {
    const currentMaxTime = get().level <= 50 ? 20 : Math.max(5, 20 - Math.floor((get().level - 50) / 10));
    set({
      currentValue: 0,
      timeLeft: get().isDevMode ? 999 : currentMaxTime,
      maxTime: get().isDevMode ? 999 : currentMaxTime,
    });
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
    const newState = { lastRewardTime: now, dailyRewardsToday: get().dailyRewardsToday + 1 };
    localStorage.setItem('dailyRewardState', JSON.stringify(newState));
    set(newState);
    get().addCoins(100);
  },

  unlockMedal: (id, reward) => {
    const currentMedals = get().medals;
    if (currentMedals.includes(id)) return;
    
    const newMedals = [...currentMedals, id];
    localStorage.setItem('zeka_medals', JSON.stringify(newMedals));
    set({ medals: newMedals });
    get().addCoins(reward);
  },

  incrementStreak: () => set(s => ({ streak: s.streak + 1 })),
  resetStreak: () => set({ streak: 0 }),
  useHelp: () => set(s => ({ helpCount: s.helpCount + 1 }))
}));
