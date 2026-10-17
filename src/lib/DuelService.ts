/**
 * ZEKA: Mind Puzzle - 100% Cloudflare 1v1 Real-Time Multiplayer Service
 * Powered exclusively by Cloudflare Edge Worker & Cloudflare D1
 */

import { getDuelPlayerId, getPlayerName, getCachedCountry } from './Leaderboard';
import { haptic } from './Haptics';

const CF_WORKER_URL = (import.meta.env.VITE_CF_WORKER_URL || 'https://zeka-edge-api.zekagame.workers.dev').replace(/\/$/, '');

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
let isMatchFinishedReported = false;
let hasReportedRematchInvite = false;
let isBotMatch = false;
let activeBotOpponent: OpponentInfo | null = null;
let syncInterval: any = null;
let matchmakingInterval: any = null;
let simulatedBotTimeout: any = null;
let botTargetDeathScore = 0;
let botScoreTracker = 0;
let currentScore = 0;
let lastReportedOpponentScore = -1;
let pendingEmote: string | null = null;
let lastSeenEmote: string | null = null;
let activeGameCallbacks: GameCallbacks = {};

const BOT_ROSTER: OpponentInfo[] = [
  { id: 'bot-1', name: 'alperen_06', country: 'TR', isBot: true },
  { id: 'bot-2', name: 'berkay.k', country: 'TR', isBot: true },
  { id: 'bot-3', name: 'selin_d', country: 'TR', isBot: true },
  { id: 'bot-4', name: 'mert_yılmaz', country: 'TR', isBot: true },
  { id: 'bot-5', name: 'kaan_arslan', country: 'TR', isBot: true },
  { id: 'bot-6', name: 'zeynep_t', country: 'TR', isBot: true },
  { id: 'bot-7', name: 'caner_k', country: 'TR', isBot: true },
  { id: 'bot-8', name: 'aylin_x', country: 'TR', isBot: true },
  { id: 'bot-9', name: 'yigit_34', country: 'TR', isBot: true },
  { id: 'bot-10', name: 'deniz_g', country: 'TR', isBot: true },
  { id: 'bot-11', name: 'tolga_b', country: 'TR', isBot: true },
  { id: 'bot-12', name: 'melis_a', country: 'TR', isBot: true },
  { id: 'bot-13', name: 'eren_k', country: 'TR', isBot: true },
  { id: 'bot-14', name: 'furkan.d', country: 'TR', isBot: true },
  { id: 'bot-15', name: 'cemre_s', country: 'TR', isBot: true },
  { id: 'bot-16', name: 'baris_y', country: 'TR', isBot: true },
  { id: 'bot-17', name: 'oguzhan_k', country: 'TR', isBot: true },
  { id: 'bot-18', name: 'ece_n', country: 'TR', isBot: true },
  { id: 'bot-19', name: 'umut_c', country: 'TR', isBot: true },
  { id: 'bot-20', name: 'burak_o', country: 'TR', isBot: true },
  { id: 'bot-21', name: 'damla_k', country: 'TR', isBot: true },
  { id: 'bot-22', name: 'kerem_v', country: 'TR', isBot: true },
  { id: 'bot-23', name: 'alex_m', country: 'DE', isBot: true },
  { id: 'bot-24', name: 'lucas_br', country: 'BR', isBot: true },
  { id: 'bot-25', name: 'elena_s', country: 'ES', isBot: true },
  { id: 'bot-26', name: 'sora_k', country: 'JP', isBot: true },
  { id: 'bot-27', name: 'emily_w', country: 'GB', isBot: true },
  { id: 'bot-28', name: 'noah_d', country: 'NL', isBot: true },
];

function clearBotSimulation() {
  if (simulatedBotTimeout) {
    clearTimeout(simulatedBotTimeout);
    simulatedBotTimeout = null;
  }
}

function startBotSimulation(myId: string, initialCallback?: (score: number) => void) {
  clearBotSimulation();

  // Intelligent bot: randomly eliminated between levels 15 and 100
  botTargetDeathScore = Math.floor(Math.random() * (100 - 15 + 1)) + 15;
  botScoreTracker = 0;

  function scheduleNextStep() {
    if (isMatchFinishedReported) return;

    // Dynamic, natural human-like reaction time depending on depth
    let delay = 2200;
    if (botScoreTracker < 10) {
      delay = 1800 + Math.random() * 800; // 1.8s - 2.6s
    } else if (botScoreTracker < 25) {
      delay = 2100 + Math.random() * 1000; // 2.1s - 3.1s
    } else if (botScoreTracker < 50) {
      delay = 2400 + Math.random() * 1200; // 2.4s - 3.6s
    } else {
      delay = 2700 + Math.random() * 1400; // 2.7s - 4.1s
    }

    simulatedBotTimeout = setTimeout(() => {
      if (isMatchFinishedReported) return;

      // Check if bot reached its elimination threshold
      if (botScoreTracker >= botTargetDeathScore) {
        isMatchFinishedReported = true;
        activeGameCallbacks.onMatchFinish?.(myId, true, botScoreTracker);
        return;
      }

      botScoreTracker += 1;
      initialCallback?.(botScoreTracker);
      activeGameCallbacks.onOpponentScore?.(botScoreTracker);

      // Occasional lively emote
      if (botScoreTracker % 7 === 0 && Math.random() < 0.35) {
        const emojis = ['🔥', '⚡', '🧠', '😎', '👏'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        activeGameCallbacks.onOpponentEmote?.(emoji);
      }

      scheduleNextStep();
    }, Math.round(delay));
  }

  // Natural pause before answering the first level
  simulatedBotTimeout = setTimeout(() => {
    scheduleNextStep();
  }, 2200);
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
    isBotMatch = false;
    isMatchFinishedReported = false;

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
              isMatchFinishedReported = false;
              callbacks.onMatchStart(data.guest, data.seed, true, roomCode);
              this.startRoomSync(roomCode, myId, callbacks);
              return;
            }
          }
        } catch (e) {
          // ignore transient poll drops
        }
      }, 600);
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
    isBotMatch = false;
    isMatchFinishedReported = false;

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
      isMatchFinishedReported = false;
      lastReportedOpponentScore = -1;
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
              isMatchFinishedReported = false;
              callbacks.onMatchStart(pollData.opponent, pollData.seed, pollData.isHost, pollData.room_code);
              this.startRoomSync(pollData.room_code, myId, callbacks);
              return;
            }
          }
        } catch (e) {
          // ignore
        }

        // After minimum 7s (7200ms = 9 polling attempts), fallback to intelligent challenger bot
        if (searchElapsed >= 7200) {
          clearInterval(matchmakingInterval);
          this.cancelMatchmaking(myId);

          const randomBot = BOT_ROSTER[Math.floor(Math.random() * BOT_ROSTER.length)];
          const botRoom = `ZK-${Math.floor(1000 + Math.random() * 9000)}`;
          const botSeed = Math.floor(Math.random() * 900000) + 100000;
          activeRoomCode = botRoom;
          isBotMatch = true;
          activeBotOpponent = randomBot;
          currentActiveSeed = botSeed;
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
    clearInterval(syncInterval);
    syncInterval = setInterval(async () => {
      try {
        const syncRes = await fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_code: roomCode,
            player_id: myId,
            score: currentScore,
            emote: pendingEmote,
          }),
        });
        pendingEmote = null;

        if (syncRes.ok) {
          const data = await syncRes.json();

          // 1. Rematch Start detected
          if (data.status === 'ACTIVE' && typeof data.seed === 'number' && currentActiveSeed !== 0 && data.seed !== currentActiveSeed) {
            currentActiveSeed = data.seed;
            currentScore = 0;
            isMatchFinishedReported = false;
            hasReportedRematchInvite = false;
            lastReportedOpponentScore = -1;
            activeGameCallbacks.onRematchStart?.(data.seed);
          }

          // 2. Match Finished (immediate simultaneous screen transition)
          if ((data.status === 'FINISHED' || data.status === 'FORFEIT') && data.winnerId && !isMatchFinishedReported) {
            isMatchFinishedReported = true;
            haptic.cancel();
            const isWinner = data.winnerId === myId;
            const finalOppScore = typeof data.opponentScore === 'number' ? data.opponentScore : 0;
            activeGameCallbacks.onMatchFinish?.(data.winnerId, isWinner, finalOppScore);
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

          // 4b. Opponent Emote Update
          if (data.opponentEmote && data.opponentEmote !== lastSeenEmote) {
            lastSeenEmote = data.opponentEmote;
            callbacks?.onOpponentEmote(data.opponentEmote);
            activeGameCallbacks.onOpponentEmote?.(data.opponentEmote);
          }

          // 5. Opponent Forfeit / Left
          if (data.status === 'FORFEIT' && data.winnerId === myId && !isMatchFinishedReported) {
            isMatchFinishedReported = true;
            callbacks?.onOpponentQuit();
            activeGameCallbacks.onOpponentQuit?.();
          }
        }
      } catch {
        // ignore
      }
    }, 850);
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
      return;
    }
    fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_code: activeRoomCode,
        player_id: myId,
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
      const newSeed = Math.floor(Math.random() * 900000) + 100000;
      currentActiveSeed = newSeed;
      currentScore = 0;
      isMatchFinishedReported = false;
      hasReportedRematchInvite = false;
      lastReportedOpponentScore = -1;

      startBotSimulation(getDuelPlayerId());

      setTimeout(() => {
        activeGameCallbacks.onRematchStart?.(newSeed);
      }, 900);

      return { success: true, started: true, seed: newSeed };
    }

    const myId = getDuelPlayerId();
    try {
      const res = await fetch(`${CF_WORKER_URL}/api/duel/room/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: activeRoomCode, player_id: myId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'REMATCH_START') {
          currentActiveSeed = data.seed;
          currentScore = 0;
          isMatchFinishedReported = false;
          hasReportedRematchInvite = false;
          lastReportedOpponentScore = -1;
          activeGameCallbacks.onRematchStart?.(data.seed);
          return { success: true, started: true, seed: data.seed };
        }
        return { success: true, started: false };
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
    clearBotSimulation();
    syncInterval = null;
    matchmakingInterval = null;
    currentActiveSeed = 0;
    isMatchFinishedReported = false;
    hasReportedRematchInvite = false;
    isBotMatch = false;
    activeBotOpponent = null;
    activeGameCallbacks = {};
    lastReportedOpponentScore = -1;
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
