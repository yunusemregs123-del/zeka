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
  
  // Actions
  goToMenu: () => void;
  startGame: (asDev?: boolean) => void;
  startNewLevel: (isRetry?: boolean) => void;
  submitAnswer: (answer: number) => void;
  setCurrentValue: (val: number) => void;
  tickTimer: (dt: number) => void;
  pauseGame: () => void;
  addTime: (amount: number) => void;
  showSolution: () => void;
  setHideIntro: (hide: boolean) => void;
  addLevelTime: (timeSpent: number) => void;
  endGame: () => void;
  toggleDevMode: () => void;
  devAdvanceLevel: (lvl: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gameState: 'MENU',
  level: 1,
  totalTimeSpent: 0,
  coins: 0,
  currentValue: 0,
  timeLeft: 20,
  maxTime: 20,
  previousAnswers: [0, 0],
  hideIntro: localStorage.getItem('hideIntro') === 'true',
  isDevMode: false,

  goToMenu: () => set({ gameState: 'MENU' }),
  
  startGame: (asDev = false) => {
    set({ 
      level: 1, 
      totalTimeSpent: 0, 
      coins: 0, 
      previousAnswers: [0,0], 
      gameState: 'PLAYING',
      isDevMode: asDev
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
      return { timeLeft: state.timeLeft + amount, coins: state.coins - 10 };
    }
    return state;
  }),
  
  showSolution: () => set((state) => {
    if (state.coins >= 50) {
      return { coins: state.coins - 50 };
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
  }
}));
