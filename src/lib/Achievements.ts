export interface Achievement {
  id: string;
  key: string; // for translations
  reward: number;
  condition: (stats: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: '1', key: 'med_level_1', reward: 10, condition: (s) => s.level >= 1 },
  { id: '2', key: 'med_level_10', reward: 30, condition: (s) => s.level >= 10 },
  { id: '3', key: 'med_level_25', reward: 75, condition: (s) => s.level >= 25 },
  { id: '4', key: 'med_level_50', reward: 200, condition: (s) => s.level >= 50 },
  { id: '5', key: 'med_level_100', reward: 500, condition: (s) => s.level >= 100 },
  { id: '6', key: 'med_level_200', reward: 1500, condition: (s) => s.level >= 200 },
  { id: '7', key: 'med_speed_2s', reward: 50, condition: (s) => s.lastTime < 2 && s.level >= 5 },
  { id: '8', key: 'med_speed_30_45s', reward: 250, condition: (s) => s.level >= 30 && s.totalTimeSpent < 45 },
  { id: '9', key: 'med_streak_10', reward: 100, condition: (s) => s.streak >= 10 },
  { id: '10', key: 'med_streak_30', reward: 400, condition: (s) => s.streak >= 30 },
  { id: '11', key: 'med_coins_1000', reward: 150, condition: (s) => s.coins >= 1000 },
  { id: '12', key: 'med_coins_5000', reward: 500, condition: (s) => s.coins >= 5000 },
  { id: '13', key: 'med_help_used', reward: 20, condition: (s) => s.helpCount >= 1 },
  { id: '14', key: 'med_time_clutch', reward: 50, condition: (s) => s.timeAddedAtLessThen2s && s.level >= 10 },
  { id: '15', key: 'med_daily_5', reward: 200, condition: (s) => s.dailyRewardsTotal >= 5 },
  { id: '16', key: 'med_loyal_3', reward: 300, condition: (s) => s.consecutiveDays >= 3 },
  { id: '17', key: 'med_polyglot', reward: 100, condition: (s) => s.langsUsed >= 3 },
  { id: '18', key: 'med_hard_mode', reward: 250, condition: (s) => s.level >= 60 },
  { id: '19', key: 'med_veteran', reward: 750, condition: (s) => s.level >= 150 },
  { id: '20', key: 'med_mastery', reward: 2500, condition: (s) => s.achievementsCount >= 19 }
];
