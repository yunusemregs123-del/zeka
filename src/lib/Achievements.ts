export interface Achievement {
  id: string;
  key: string; // for translations
  reward: number;
  condition: (stats: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: '1', key: 'med_level_10', reward: 10, condition: (s) => s.level >= 10 },
  { id: '2', key: 'med_level_25', reward: 25, condition: (s) => s.level >= 25 },
  { id: '3', key: 'med_level_50', reward: 50, condition: (s) => s.level >= 50 },
  { id: '4', key: 'med_level_100', reward: 100, condition: (s) => s.level >= 100 },
  { id: '5', key: 'med_speed_2s', reward: 25, condition: (s) => s.lastTime < 2 && s.level >= 5 },
  { id: '6', key: 'med_streak_10', reward: 30, condition: (s) => s.streak >= 10 },
  { id: '7', key: 'med_streak_30', reward: 100, condition: (s) => s.streak >= 30 },
  { id: '8', key: 'med_coins_1000', reward: 50, condition: (s) => s.coins >= 1000 },
  { id: '9', key: 'med_help_used', reward: 10, condition: (s) => s.helpCount >= 5 },
  { id: '10', key: 'med_hard_mode', reward: 50, condition: (s) => s.level >= 60 },
  { id: '11', key: 'med_veteran', reward: 150, condition: (s) => s.level >= 150 },
  { id: '12', key: 'med_loyal_3', reward: 75, condition: (s) => s.dailyRewardsTotal >= 3 }
];
