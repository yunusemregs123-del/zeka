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
let simulatedBotInterval: any = null;
let botScoreTracker = 0;
let currentScore = 0;
let lastReportedOpponentScore = -1;
let pendingEmote: string | null = null;
let lastSeenEmote: string | null = null;
let activeGameCallbacks: GameCallbacks = {};

const BOT_ROSTER: OpponentInfo[] = [
  { id: 'bot-1', name: 'Alex (Berlin)', country: 'DE', isBot: true },
  { id: 'bot-2', name: 'Sora (Tokyo)', country: 'JP', isBot: true },
  { id: 'bot-3', name: 'Lucas (São Paulo)', country: 'BR', isBot: true },
  { id: 'bot-4', name: 'Elena (Madrid)', country: 'ES', isBot: true },
  { id: 'bot-5', name: 'Emma (London)', country: 'GB', isBot: true },
  { id: 'bot-6', name: 'Can (Istanbul)', country: 'TR', isBot: true },
];

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

        // After 6s, fallback to high-octane competitive bot
        if (searchElapsed >= 6000) {
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

          botScoreTracker = 0;
          simulatedBotInterval = setInterval(() => {
            const botErrorChance = botScoreTracker < 5 ? 0.08 : (botScoreTracker < 10 ? 0.16 : 0.25);
            const isBotMistake = Math.random() < botErrorChance;

            if (isBotMistake) {
              clearInterval(simulatedBotInterval);
              if (!isMatchFinishedReported) {
                isMatchFinishedReported = true;
                activeGameCallbacks.onMatchFinish?.(myId, true, botScoreTracker);
              }
            } else {
              botScoreTracker += 1;
              callbacks.onOpponentScore(botScoreTracker);
              activeGameCallbacks.onOpponentScore?.(botScoreTracker);
            }
          }, 3800);

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
            activeGameCallbacks.onRematchStart?.(data.seed);
          }

          // 2. Match Finished (immediate simultaneous screen transition)
          if ((data.status === 'FINISHED' || data.status === 'FORFEIT') && data.winnerId && !isMatchFinishedReported) {
            isMatchFinishedReported = true;
            clearInterval(syncInterval);
            syncInterval = null;
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

          // 4. Opponent Score Update (ONLY notify if score actually increased!)
          if (typeof data.opponentScore === 'number' && data.opponentScore > lastReportedOpponentScore) {
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
      } catch (e) {
        // ignore
      }
    }, 600);
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
          if (typeof data.opponentScore === 'number' && data.opponentScore > lastReportedOpponentScore) {
            lastReportedOpponentScore = data.opponentScore;
            activeGameCallbacks.onOpponentScore?.(data.opponentScore);
          }
          if ((data.status === 'FINISHED' || data.status === 'FORFEIT') && data.winnerId && !isMatchFinishedReported) {
            isMatchFinishedReported = true;
            clearInterval(syncInterval);
            syncInterval = null;
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
      clearInterval(simulatedBotInterval);
      activeGameCallbacks.onMatchFinish?.('bot', false, botScoreTracker);
      return;
    }
    fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_code: activeRoomCode,
        player_id: myId,
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
      botScoreTracker = 0;
      isMatchFinishedReported = false;

      clearInterval(simulatedBotInterval);
      simulatedBotInterval = setInterval(() => {
        const botErrorChance = botScoreTracker < 5 ? 0.08 : (botScoreTracker < 10 ? 0.16 : 0.25);
        const isBotMistake = Math.random() < botErrorChance;

        if (isBotMistake) {
          clearInterval(simulatedBotInterval);
          if (!isMatchFinishedReported) {
            isMatchFinishedReported = true;
            activeGameCallbacks.onMatchFinish?.(getDuelPlayerId(), true, botScoreTracker);
          }
        } else {
          botScoreTracker += 1;
          activeGameCallbacks.onOpponentScore?.(botScoreTracker);
        }
      }, 3800);

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
    clearInterval(simulatedBotInterval);
    syncInterval = null;
    matchmakingInterval = null;
    simulatedBotInterval = null;
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
