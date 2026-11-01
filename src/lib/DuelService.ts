/**
 * ZEKA: Mind Puzzle - 15-Year Scalable Real-Time 1v1 Multiplayer Service
 * Powered exclusively by Cloudflare Edge Worker & Cloudflare D1
 * - Round-isolated synchronization (immune to score leakage)
 * - Sequenced repeat emotes support
 * - Smart adaptive polling backoff (850ms during match, 2500ms during GameOver, 45s auto-stop)
 * - Atomic two-phase rematch handshake
 */

import { getDuelPlayerId, getPlayerName, getCachedCountry, generateGuestName } from './Leaderboard';
import { haptic } from './Haptics';

import { AppConfig } from '../config/AppConfig';

const CF_WORKER_URL = (import.meta.env.VITE_CF_WORKER_URL || AppConfig.api.workerUrl).replace(/\/$/, '');

export interface OpponentInfo {
  id: string;
  name: string;
  country: string;
  isBot?: boolean;
}

export interface DuelCallbacks {
  onMatchStart: (opponent: OpponentInfo, seed: number, isHost: boolean, roomCode: string) => void;
  onOpponentScore: (score: number) => void;
  onOpponentEmote: (emoji: string) => void;
  onOpponentQuit: () => void;
  onStatusChange?: (status: string) => void;
  onMatchFinish?: (winnerId: string, isWinner: boolean, finalOpponentScore: number) => void;
  onRematchInvite?: () => void;
  onRematchStart?: (newSeed: number) => void;
}

export interface GameCallbacks {
  onOpponentScore?: (score: number) => void;
  onOpponentEmote?: (emoji: string) => void;
  onOpponentQuit?: () => void;
  onMatchFinish?: (winnerId: string, isWinner: boolean, finalOpponentScore: number) => void;
  onRematchInvite?: () => void;
  onRematchStart?: (newSeed: number) => void;
}

let activeRoomCode = '';
let isHostPlayer = false;
let currentActiveSeed = 0;
let currentRoomRound = 1;
let isMatchFinishedReported = false;
let hasReportedRematchInvite = false;
let isBotMatch = false;
let activeBotOpponent: OpponentInfo | null = null;
let syncInterval: any = null;
let matchmakingInterval: any = null;
let gameOverInactivityTimeout: any = null;
let simulatedBotTimeout: any = null;
let botRematchTimeout: any = null;
let botWantsRematch = false;
let botTargetDeathScore = 0;
let botScoreTracker = 0;
let currentScore = 0;
let lastReportedOpponentScore = -1;
let pendingEmote: string | null = null;
let lastSeenEmoteSeq = 0;
let activeGameCallbacks: GameCallbacks = {};

const BOT_ROSTER: OpponentInfo[] = [
  // Turkish realistic usernames
  { id: 'bot-1', name: 'alperen_06', country: 'TR', isBot: true },
  { id: 'bot-2', name: 'berkay.k', country: 'TR', isBot: true },
  { id: 'bot-3', name: 'selin_d', country: 'TR', isBot: true },
  { id: 'bot-4', name: 'mert_yilmaz', country: 'TR', isBot: true },
  { id: 'bot-5', name: 'kaan_arslan', country: 'TR', isBot: true },
  { id: 'bot-6', name: 'zeynep.t', country: 'TR', isBot: true },
  { id: 'bot-7', name: 'caner_k', country: 'TR', isBot: true },
  { id: 'bot-8', name: 'aylin.x', country: 'TR', isBot: true },
  { id: 'bot-9', name: 'yigit_34', country: 'TR', isBot: true },
  { id: 'bot-10', name: 'deniz_g', country: 'TR', isBot: true },
  { id: 'bot-11', name: 'tolga_b', country: 'TR', isBot: true },
  { id: 'bot-12', name: 'melis_a', country: 'TR', isBot: true },
  { id: 'bot-13', name: 'eren.k', country: 'TR', isBot: true },
  { id: 'bot-14', name: 'furkan.d', country: 'TR', isBot: true },
  { id: 'bot-15', name: 'cemre_s', country: 'TR', isBot: true },
  { id: 'bot-16', name: 'baris_y', country: 'TR', isBot: true },
  { id: 'bot-17', name: 'oguzhan_k', country: 'TR', isBot: true },
  { id: 'bot-18', name: 'ece.n', country: 'TR', isBot: true },
  { id: 'bot-19', name: 'umut_c', country: 'TR', isBot: true },
  { id: 'bot-20', name: 'burak_oz', country: 'TR', isBot: true },
  { id: 'bot-21', name: 'damla.k', country: 'TR', isBot: true },
  { id: 'bot-22', name: 'kerem_v', country: 'TR', isBot: true },
  { id: 'bot-23', name: 'buse_99', country: 'TR', isBot: true },
  { id: 'bot-24', name: 'arda.bjk', country: 'TR', isBot: true },
  { id: 'bot-25', name: 'emre_fb', country: 'TR', isBot: true },
  { id: 'bot-26', name: 'defne_kaya', country: 'TR', isBot: true },
  { id: 'bot-27', name: 'batuhan_y', country: 'TR', isBot: true },
  { id: 'bot-28', name: 'idil_su', country: 'TR', isBot: true },
  { id: 'bot-29', name: 'koray.t', country: 'TR', isBot: true },
  { id: 'bot-30', name: 'selim.aydin', country: 'TR', isBot: true },
  { id: 'bot-31', name: 'kadir_35', country: 'TR', isBot: true },
  { id: 'bot-32', name: 'yagmur_k', country: 'TR', isBot: true },
  { id: 'bot-33', name: 'onur.kaya', country: 'TR', isBot: true },
  { id: 'bot-34', name: 'sinem_a', country: 'TR', isBot: true },
  // Competitive / Gamer handles
  { id: 'bot-35', name: 'ShadowMind', country: 'TR', isBot: true },
  { id: 'bot-36', name: 'BrainMaster', country: 'US', isBot: true },
  { id: 'bot-37', name: 'Vortex_TR', country: 'TR', isBot: true },
  { id: 'bot-38', name: 'Atlas.01', country: 'TR', isBot: true },
  { id: 'bot-39', name: 'EchoPilot', country: 'GB', isBot: true },
  { id: 'bot-40', name: 'Matematikci', country: 'TR', isBot: true },
  { id: 'bot-41', name: 'Zenith_99', country: 'DE', isBot: true },
  { id: 'bot-42', name: 'Kuzey_Bey', country: 'TR', isBot: true },
  { id: 'bot-43', name: 'NovaMath', country: 'US', isBot: true },
  // International handles
  { id: 'bot-44', name: 'alex_m92', country: 'DE', isBot: true },
  { id: 'bot-45', name: 'lukas_s', country: 'DE', isBot: true },
  { id: 'bot-46', name: 'sophie_b', country: 'FR', isBot: true },
  { id: 'bot-47', name: 'lucas_br', country: 'BR', isBot: true },
  { id: 'bot-48', name: 'mateo_r', country: 'ES', isBot: true },
  { id: 'bot-49', name: 'elena_s', country: 'ES', isBot: true },
  { id: 'bot-50', name: 'sora_k', country: 'JP', isBot: true },
  { id: 'bot-51', name: 'kenji_sato', country: 'JP', isBot: true },
  { id: 'bot-52', name: 'emily_w', country: 'GB', isBot: true },
  { id: 'bot-53', name: 'oliver_ox', country: 'GB', isBot: true },
  { id: 'bot-54', name: 'noah_d', country: 'NL', isBot: true },
  { id: 'bot-55', name: 'samir_az', country: 'AZ', isBot: true },
  { id: 'bot-56', name: 'farhad_baku', country: 'AZ', isBot: true },
  { id: 'bot-57', name: 'liam_k', country: 'US', isBot: true },
  { id: 'bot-58', name: 'jessica.m', country: 'US', isBot: true },
];

export function getRealisticBotOpponent(): OpponentInfo {
  // ~38% chance: Authentic Guest player (e.g. Zeka_XXXXXX)
  if (Math.random() < 0.38) {
    const guestCountries = ['TR', 'TR', 'TR', 'TR', 'DE', 'AZ', 'US', 'GB', 'NL', 'FR'];
    const country = guestCountries[Math.floor(Math.random() * guestCountries.length)];
    const guestName = generateGuestName();
    return {
      id: `bot-${guestName.toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`,
      name: guestName,
      country,
      isBot: true,
    };
  }

  // 62% chance: Registered / gamer handles
  const bot = BOT_ROSTER[Math.floor(Math.random() * BOT_ROSTER.length)];
  return {
    ...bot,
    id: `${bot.id}-${Math.random().toString(36).substring(2, 6)}`,
  };
}

function clearBotSimulation() {
  if (simulatedBotTimeout) {
    clearTimeout(simulatedBotTimeout);
    simulatedBotTimeout = null;
  }
  if (botRematchTimeout) {
    clearTimeout(botRematchTimeout);
    botRematchTimeout = null;
  }
  botWantsRematch = false;
}

function scheduleBotRematchInvite() {
  if (botRematchTimeout) {
    clearTimeout(botRematchTimeout);
    botRematchTimeout = null;
  }
  // ~35% chance the bot proactively asks for rematch after 2.8s - 4.8s
  if (Math.random() < 0.35) {
    botRematchTimeout = setTimeout(() => {
      if (isBotMatch && !hasReportedRematchInvite) {
        botWantsRematch = true;
        hasReportedRematchInvite = true;
        activeGameCallbacks.onRematchInvite?.();
      }
    }, Math.floor(2800 + Math.random() * 2000));
  }
}

function startBotSimulation(myId: string, initialCallback?: (score: number) => void) {
  clearBotSimulation();

  // Balanced target death score distribution:
  // - 35% casual players (die at score 6 - 12)
  // - 45% standard players (die at score 13 - 22)
  // - 16% skilled players (die at score 23 - 32)
  // - 4% master players (die at score 33 - 42)
  const roll = Math.random();
  if (roll < 0.35) {
    botTargetDeathScore = 6 + Math.floor(Math.random() * 7);
  } else if (roll < 0.80) {
    botTargetDeathScore = 13 + Math.floor(Math.random() * 10);
  } else if (roll < 0.96) {
    botTargetDeathScore = 23 + Math.floor(Math.random() * 10);
  } else {
    botTargetDeathScore = 33 + Math.floor(Math.random() * 10);
  }

  botScoreTracker = 0;

  function scheduleNextStep(isFirstStep = false) {
    if (isMatchFinishedReported) return;

    let delay = 3600;

    if (isFirstStep) {
      // Duel has a 3-second countdown (3.. 2.. 1.. GO!).
      // Human needs ~3.5-5.5s to read and solve puzzle 1.
      // Bot's first solve arrives at 4.8s - 6.6s after match starts.
      delay = 4800 + Math.random() * 1800;
    } else {
      // Human-paced solve times (each puzzle gives 15s max)
      if (botScoreTracker < 6) {
        // Early simple arithmetic: 3.5s - 5.2s (avg ~4.3s)
        delay = 3500 + Math.random() * 1700;
      } else if (botScoreTracker < 15) {
        // Intermediate sequences: 4.2s - 6.4s (avg ~5.3s)
        delay = 4200 + Math.random() * 2200;
      } else if (botScoreTracker < 25) {
        // Prev1, negative symbols, more items: 5.2s - 7.8s (avg ~6.5s)
        delay = 5200 + Math.random() * 2600;
      } else if (botScoreTracker < 35) {
        // Complex symbols (InvertAll, ReverseNext): 6.2s - 9.2s (avg ~7.7s)
        delay = 6200 + Math.random() * 3000;
      } else {
        // Advanced symbols (Prev2, Heart, Star): 7.2s - 10.8s (avg ~9.0s)
        delay = 7200 + Math.random() * 3600;
      }

      // Natural human hesitation / recalculation pause (22% chance: adds 1.5s - 3.2s)
      if (Math.random() < 0.22) {
        delay += 1500 + Math.random() * 1700;
      }
    }

    simulatedBotTimeout = setTimeout(() => {
      if (isMatchFinishedReported) return;

      // 1. Natural blunder / mistake chance under pressure
      if (botScoreTracker >= 6) {
        const blunderChance = botScoreTracker < 12 ? 0.04 : (botScoreTracker < 22 ? 0.07 : 0.12);
        if (Math.random() < blunderChance) {
          isMatchFinishedReported = true;
          activeGameCallbacks.onMatchFinish?.(myId, true, botScoreTracker);
          scheduleBotRematchInvite();
          return;
        }
      }

      // 2. Target death score reached
      if (botScoreTracker >= botTargetDeathScore) {
        isMatchFinishedReported = true;
        activeGameCallbacks.onMatchFinish?.(myId, true, botScoreTracker);
        scheduleBotRematchInvite();
        return;
      }

      botScoreTracker += 1;
      if (activeGameCallbacks.onOpponentScore) {
        activeGameCallbacks.onOpponentScore(botScoreTracker);
      } else if (initialCallback) {
        initialCallback(botScoreTracker);
      }

      // Context-aware dynamic emotes
      if (Math.random() < 0.28) {
        let emojis = ['🔥', '⚡', '🧠', '😎', '👏'];
        if (currentScore > botScoreTracker) {
          // Player is leading! Bot looks pressured/sweating
          emojis = ['😅', '🤯', '👀', '👏', '🔥'];
        } else if (botScoreTracker - currentScore >= 2) {
          // Bot is ahead
          emojis = ['😎', '⚡', '💪', '🔥'];
        }
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        activeGameCallbacks.onOpponentEmote?.(emoji);
      }

      scheduleNextStep(false);
    }, Math.round(delay));
  }

  // Start with the first step
  scheduleNextStep(true);
}

export const DuelService = {
  /**
   * HOST: Create friend room on Cloudflare Worker & D1
   */
  async createFriendRoom(roomCode: string, callbacks: DuelCallbacks) {
    this.cleanup();
    activeRoomCode = roomCode;
    isHostPlayer = true;
    currentScore = 0;
    currentRoomRound = 1;
    isBotMatch = false;
    isMatchFinishedReported = false;
    lastSeenEmoteSeq = 0;

    const myId = getDuelPlayerId();
    const myName = getPlayerName() || 'Oyuncu';
    const myCountry = getCachedCountry() || 'TR';

    try {
      const res = await fetch(`${CF_WORKER_URL}/api/duel/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode,
          host_id: myId,
          host_name: myName,
          host_country: myCountry,
        }),
      });

      if (!res.ok) throw new Error('Oda oluşturulamadı');
      callbacks.onStatusChange?.('WAITING_FOR_FRIEND');

      let hasMatchStarted = false;

      // Start waiting for guest & edge sync
      clearInterval(syncInterval);
      syncInterval = setInterval(async () => {
        try {
          const syncRes = await fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_code: roomCode,
              player_id: myId,
              round: currentRoomRound,
              score: currentScore,
              emote: pendingEmote,
            }),
          });
          pendingEmote = null;

          if (syncRes.ok) {
            const data = await syncRes.json();

            // When guest connects
            if (data.status === 'ACTIVE' && data.guest && !hasMatchStarted) {
              hasMatchStarted = true;
              currentActiveSeed = data.seed;
              currentRoomRound = data.round || 1;
              isMatchFinishedReported = false;
              callbacks.onMatchStart(data.guest, data.seed, true, roomCode);
              this.startRoomSync(roomCode, myId, callbacks);
              return;
            }
          }
        } catch (e) {
          // ignore transient poll drops
        }
      }, 700);
    } catch (err) {
      console.error('Cloudflare createFriendRoom error:', err);
    }
  },

  /**
   * GUEST: Join friend room on Cloudflare Worker & D1
   */
  async joinFriendRoom(roomCode: string, callbacks: DuelCallbacks, onNotFound?: (errorMessage?: string) => void) {
    this.cleanup();
    activeRoomCode = roomCode;
    isHostPlayer = false;
    currentScore = 0;
    currentRoomRound = 1;
    isBotMatch = false;
    isMatchFinishedReported = false;
    lastSeenEmoteSeq = 0;

    const myId = getDuelPlayerId();
    const myName = getPlayerName() || 'Oyuncu';
    const myCountry = getCachedCountry() || 'TR';

    try {
      const res = await fetch(`${CF_WORKER_URL}/api/duel/room/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode,
          guest_id: myId,
          guest_name: myName,
          guest_country: myCountry,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (onNotFound) onNotFound(errData.error);
        return;
      }

      const data = await res.json();
      currentActiveSeed = data.seed;
      currentRoomRound = data.round || 1;
      isMatchFinishedReported = false;
      lastReportedOpponentScore = -1;
      lastSeenEmoteSeq = 0;
      callbacks.onMatchStart(data.host, data.seed, false, roomCode);
      this.startRoomSync(roomCode, myId, callbacks);
    } catch {
      if (onNotFound) onNotFound();
    }
  },

  /**
   * QUICK MATCH: Match with a live player in Cloudflare D1 Queue or smart challenger
   */
  async startQuickMatch(callbacks: DuelCallbacks) {
    this.cleanup();
    const myId = getDuelPlayerId();
    const myName = getPlayerName() || 'Oyuncu';
    isBotMatch = false;
    isMatchFinishedReported = false;
    lastSeenEmoteSeq = 0;

    try {
      const joinRes = await fetch(`${CF_WORKER_URL}/api/duel/matchmaking/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: myId, player_name: myName }),
      });

      if (joinRes.ok) {
        const joinData = await joinRes.json();

        // Instant match!
        if (joinData.status === 'MATCHED') {
          activeRoomCode = joinData.room_code;
          isHostPlayer = false;
          currentActiveSeed = joinData.seed;
          currentRoomRound = joinData.round || 1;
          isMatchFinishedReported = false;
          callbacks.onMatchStart(joinData.opponent, joinData.seed, false, joinData.room_code);
          this.startRoomSync(joinData.room_code, myId, callbacks);
          return;
        }
      }

      callbacks.onStatusChange?.('SEARCHING');

      let searchElapsed = 0;
      matchmakingInterval = setInterval(async () => {
        searchElapsed += 800;

        try {
          const pollRes = await fetch(`${CF_WORKER_URL}/api/duel/matchmaking/poll?playerId=${encodeURIComponent(myId)}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === 'MATCHED') {
              clearInterval(matchmakingInterval);
              activeRoomCode = pollData.room_code;
              isHostPlayer = pollData.isHost;
              currentActiveSeed = pollData.seed;
              currentRoomRound = pollData.round || 1;
              isMatchFinishedReported = false;
              callbacks.onMatchStart(pollData.opponent, pollData.seed, pollData.isHost, pollData.room_code);
              this.startRoomSync(pollData.room_code, myId, callbacks);
              return;
            }
          }
        } catch (e) {
          // ignore
        }

        // Fallback to intelligent challenger bot after 7.2s
        if (searchElapsed >= 7200) {
          clearInterval(matchmakingInterval);
          this.cancelMatchmaking(myId);

          const randomBot = getRealisticBotOpponent();
          const botRoom = `ZK-${Math.floor(10000 + Math.random() * 90000)}`;
          const botSeed = Math.floor(Math.random() * 900000) + 100000;
          activeRoomCode = botRoom;
          isBotMatch = true;
          activeBotOpponent = randomBot;
          currentActiveSeed = botSeed;
          currentRoomRound = 1;
          isMatchFinishedReported = false;

          startBotSimulation(myId, (score) => callbacks.onOpponentScore(score));
          callbacks.onMatchStart(randomBot, botSeed, true, botRoom);
        }
      }, 800);
    } catch (err) {
      console.error('Cloudflare matchmaking error:', err);
    }
  },

  startRoomSync(roomCode: string, myId: string, callbacks?: DuelCallbacks) {
    currentScore = 0;
    isMatchFinishedReported = false;
    lastReportedOpponentScore = -1;
    lastSeenEmoteSeq = 0;

    if (gameOverInactivityTimeout) {
      clearTimeout(gameOverInactivityTimeout);
      gameOverInactivityTimeout = null;
    }

    const runSyncTick = async () => {
      try {
        const syncRes = await fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_code: roomCode,
            player_id: myId,
            round: currentRoomRound,
            score: currentScore,
            emote: pendingEmote,
          }),
        });
        pendingEmote = null;

        if (syncRes.ok) {
          const data = await syncRes.json();

          // 1. Rematch Start detected with Round Isolation
          const isNewRound = typeof data.round === 'number' && data.round > currentRoomRound;
          const isNewSeed = typeof data.seed === 'number' && currentActiveSeed !== 0 && data.seed !== currentActiveSeed;

          if (data.status === 'ACTIVE' && (isNewRound || isNewSeed)) {
            currentActiveSeed = data.seed;
            currentRoomRound = data.round || (currentRoomRound + 1);
            currentScore = 0;
            isMatchFinishedReported = false;
            hasReportedRematchInvite = false;
            lastReportedOpponentScore = -1;
            lastSeenEmoteSeq = 0;

            if (gameOverInactivityTimeout) {
              clearTimeout(gameOverInactivityTimeout);
              gameOverInactivityTimeout = null;
            }

            // Resume fast sync (900ms)
            restartSyncInterval(900);
            activeGameCallbacks.onRematchStart?.(data.seed);
            return;
          }

          // 2. Match Finished (immediate simultaneous screen transition)
          if ((data.status === 'FINISHED' || data.status === 'FORFEIT') && data.winnerId && !isMatchFinishedReported) {
            isMatchFinishedReported = true;
            haptic.cancel();
            const isWinner = data.winnerId === myId;
            const finalOppScore = typeof data.opponentScore === 'number' ? data.opponentScore : 0;
            activeGameCallbacks.onMatchFinish?.(data.winnerId, isWinner, finalOppScore);

            // If opponent surrendered/quit during game
            if (data.status === 'FORFEIT' && isWinner) {
              callbacks?.onOpponentQuit?.();
              activeGameCallbacks.onOpponentQuit?.();
            }

            // Slow down polling during GameOver (2400ms) to conserve D1 quota
            restartSyncInterval(2400);

            // Inactivity auto-stop after 45 seconds to stop query spamming
            if (gameOverInactivityTimeout) clearTimeout(gameOverInactivityTimeout);
            gameOverInactivityTimeout = setTimeout(() => {
              clearInterval(syncInterval);
              syncInterval = null;
            }, 45000);
          }

          // 2b. Opponent Left / Room Closed
          if (data.status === 'CLOSED') {
            callbacks?.onOpponentQuit?.();
            activeGameCallbacks.onOpponentQuit?.();
            clearInterval(syncInterval);
            syncInterval = null;
            return;
          }

          // 3. Rematch Requested by Opponent (single-fire latch)
          if (data.opponentWantsRematch) {
            if (!hasReportedRematchInvite) {
              hasReportedRematchInvite = true;
              activeGameCallbacks.onRematchInvite?.();
            }
          } else {
            hasReportedRematchInvite = false;
          }

          // 4. Opponent Score Update
          if (typeof data.opponentScore === 'number' && data.opponentScore !== lastReportedOpponentScore) {
            lastReportedOpponentScore = data.opponentScore;
            callbacks?.onOpponentScore(data.opponentScore);
            activeGameCallbacks.onOpponentScore?.(data.opponentScore);
          }

          // 4b. Opponent Emote Update (Sequenced to allow duplicate emojis)
          if (data.opponentEmote && typeof data.opponentEmoteSeq === 'number' && data.opponentEmoteSeq > lastSeenEmoteSeq) {
            lastSeenEmoteSeq = data.opponentEmoteSeq;
            callbacks?.onOpponentEmote(data.opponentEmote);
            activeGameCallbacks.onOpponentEmote?.(data.opponentEmote);
          }
        }
      } catch {
        // ignore transient network drops
      }
    };

    const restartSyncInterval = (ms: number) => {
      clearInterval(syncInterval);
      syncInterval = setInterval(runSyncTick, ms);
    };

    // Initial fast interval for active gameplay (900ms)
    restartSyncInterval(900);
  },

  setGameCallbacks(callbacks: GameCallbacks) {
    activeGameCallbacks = callbacks;
  },

  sendScore(newScore: number) {
    if (isMatchFinishedReported || !activeRoomCode) return;
    currentScore = newScore;
    const myId = getDuelPlayerId();

    if (isBotMatch) {
      return;
    }

    fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_code: activeRoomCode,
        player_id: myId,
        round: currentRoomRound,
        score: newScore,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (typeof data.opponentScore === 'number' && data.opponentScore !== lastReportedOpponentScore) {
            lastReportedOpponentScore = data.opponentScore;
            activeGameCallbacks.onOpponentScore?.(data.opponentScore);
          }
          if ((data.status === 'FINISHED' || data.status === 'FORFEIT') && data.winnerId && !isMatchFinishedReported) {
            isMatchFinishedReported = true;
            haptic.cancel();
            const isWinner = data.winnerId === myId;
            const finalOppScore = typeof data.opponentScore === 'number' ? data.opponentScore : 0;
            activeGameCallbacks.onMatchFinish?.(data.winnerId, isWinner, finalOppScore);
          }
        }
      })
      .catch(() => {});
  },

  reportForfeit() {
    if (!activeRoomCode || isMatchFinishedReported) return;
    isMatchFinishedReported = true;
    const myId = getDuelPlayerId();
    if (isBotMatch) {
      clearBotSimulation();
      activeGameCallbacks.onMatchFinish?.('bot', false, botScoreTracker);
      scheduleBotRematchInvite();
      return;
    }
    fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_code: activeRoomCode,
        player_id: myId,
        round: currentRoomRound,
        score: currentScore,
        forfeit: true,
      }),
    }).catch(() => {});
  },

  isFinished(): boolean {
    return isMatchFinishedReported;
  },

  async requestRematch(): Promise<{ success: boolean; started: boolean; seed?: number }> {
    if (!activeRoomCode) return { success: false, started: false };

    // Bot rematch simulation
    if (isBotMatch) {
      if (botRematchTimeout) {
        clearTimeout(botRematchTimeout);
        botRematchTimeout = null;
      }

      // If bot had already proactively invited user to rematch, accept smoothly (~800ms)
      if (botWantsRematch) {
        botWantsRematch = false;
        hasReportedRematchInvite = false;
        const newSeed = Math.floor(Math.random() * 900000) + 100000;
        currentActiveSeed = newSeed;
        currentScore = 0;
        currentRoomRound += 1;
        isMatchFinishedReported = false;
        lastReportedOpponentScore = -1;
        lastSeenEmoteSeq = 0;

        botRematchTimeout = setTimeout(() => {
          startBotSimulation(getDuelPlayerId());
          activeGameCallbacks.onRematchStart?.(newSeed);
        }, 800);

        return { success: true, started: false };
      }

      // Small chance (~18%) that the bot declines / quits the room!
      const doesDecline = Math.random() < 0.18;
      if (doesDecline) {
        // Natural hesitation before leaving (1.8s - 3.2s)
        const leaveDelay = 1800 + Math.random() * 1400;
        botRematchTimeout = setTimeout(() => {
          activeGameCallbacks.onOpponentQuit?.();
        }, Math.round(leaveDelay));

        return { success: true, started: false };
      }

      // Bot accepts! Simulate realistic human reaction time (2.2s - 3.8s)
      const acceptDelay = 2200 + Math.random() * 1600;
      const newSeed = Math.floor(Math.random() * 900000) + 100000;
      currentActiveSeed = newSeed;
      currentScore = 0;
      currentRoomRound += 1;
      isMatchFinishedReported = false;
      hasReportedRematchInvite = false;
      lastReportedOpponentScore = -1;
      lastSeenEmoteSeq = 0;

      botRematchTimeout = setTimeout(() => {
        startBotSimulation(getDuelPlayerId());
        activeGameCallbacks.onRematchStart?.(newSeed);
      }, Math.round(acceptDelay));

      return { success: true, started: false };
    }

    const myId = getDuelPlayerId();
    try {
      const res = await fetch(`${CF_WORKER_URL}/api/duel/room/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: activeRoomCode, player_id: myId, round: currentRoomRound }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'REMATCH_START') {
          currentActiveSeed = data.seed;
          currentRoomRound = data.round || (currentRoomRound + 1);
          currentScore = 0;
          isMatchFinishedReported = false;
          hasReportedRematchInvite = false;
          lastReportedOpponentScore = -1;
          lastSeenEmoteSeq = 0;

          if (gameOverInactivityTimeout) {
            clearTimeout(gameOverInactivityTimeout);
            gameOverInactivityTimeout = null;
          }

          activeGameCallbacks.onRematchStart?.(data.seed);
          return { success: true, started: true, seed: data.seed };
        }
        return { success: true, started: false };
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.opponentLeft) {
          activeGameCallbacks.onOpponentQuit?.();
        }
      }
    } catch (e) {}
    return { success: false, started: false };
  },

  sendEmote(emoji: string) {
    pendingEmote = emoji;
    const myId = getDuelPlayerId();
    if (activeRoomCode) {
      fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: activeRoomCode,
          player_id: myId,
          round: currentRoomRound,
          emote: emoji,
        }),
      }).catch(() => {});
    }
  },

  isHost(): boolean {
    return isHostPlayer;
  },

  getActiveRoomCode(): string {
    return activeRoomCode;
  },

  async cancelMatchmaking(playerId: string) {
    try {
      await fetch(`${CF_WORKER_URL}/api/duel/matchmaking/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });
    } catch (e) {}
  },

  getActiveBotOpponent(): OpponentInfo | null {
    return activeBotOpponent;
  },

  cleanup() {
    clearInterval(syncInterval);
    clearInterval(matchmakingInterval);
    if (gameOverInactivityTimeout) {
      clearTimeout(gameOverInactivityTimeout);
      gameOverInactivityTimeout = null;
    }
    clearBotSimulation();
    syncInterval = null;
    matchmakingInterval = null;
    currentActiveSeed = 0;
    currentRoomRound = 1;
    isMatchFinishedReported = false;
    hasReportedRematchInvite = false;
    isBotMatch = false;
    activeBotOpponent = null;
    activeGameCallbacks = {};
    lastReportedOpponentScore = -1;
    lastSeenEmoteSeq = 0;
    haptic.cancel();

    if (activeRoomCode) {
      const myId = getDuelPlayerId();
      fetch(`${CF_WORKER_URL}/api/duel/room/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: activeRoomCode, player_id: myId }),
      }).catch(() => {});
      activeRoomCode = '';
    }
  },
};
