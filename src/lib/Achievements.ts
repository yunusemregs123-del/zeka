export interface Achievement {
  id: string;
  key: string; // for translations
  reward: number;
  condition: (stats: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: '1', key: 'med_level_25', reward: 100, condition: (s) => s.level >= 25 },
  { id: '2', key: 'med_level_50', reward: 200, condition: (s) => s.level >= 50 },
  { id: '3', key: 'med_level_100', reward: 400, condition: (s) => s.level >= 100 },
  { id: '4', key: 'med_level_200', reward: 1500, condition: (s) => s.level >= 200 },
  { id: '5', key: 'med_speed_100_10m', reward: 500, condition: (s) => s.level >= 100 && s.totalTimeSpent < 600 },
  { id: '6', key: 'med_speed_2s', reward: 100, condition: (s) => s.lastTime < 2 && s.level >= 15 },
  { id: '7', key: 'med_coins_2000', reward: 500, condition: (s) => s.coins >= 500 },
  { id: '8', key: 'med_loyal_5', reward: 500, condition: (s) => s.dailyRewardsTotal >= 5 },
  { id: '9', key: 'med_hard_60', reward: 300, condition: (s) => s.level >= 60 },
  { id: '10', key: 'med_veteran_150', reward: 750, condition: (s) => s.level >= 150 },
  { id: '11', key: 'med_help_10', reward: 500, condition: (s) => s.helpCount >= 10 },
  { id: '12', key: 'med_mastery', reward: 2500, condition: (s) => s.achievementsCount >= 11 }
];
