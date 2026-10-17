/**
 * ZEKA: Mind Puzzle - 100% Cloudflare 1v1 Real-Time Multiplayer Service
 * Powered exclusively by Cloudflare Edge Worker & Cloudflare D1
 */

import { getDeviceId, getPlayerName, getCachedCountry } from './Leaderboard';

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
}

export interface GameCallbacks {
  onOpponentScore?: (score: number) => void;
  onOpponentEmote?: (emoji: string) => void;
  onOpponentQuit?: () => void;
}

let activeRoomCode = '';
let isHostPlayer = false;
let syncInterval: any = null;
let matchmakingInterval: any = null;
let simulatedBotInterval: any = null;
let botScoreTracker = 0;
let currentScore = 0;
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

    const myId = getDeviceId();
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

      // Start high-speed edge sync polling (every 600ms)
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
              callbacks.onMatchStart(data.guest, data.seed, true, roomCode);
            }

            // Sync opponent score
            if (typeof data.opponentScore === 'number') {
              callbacks.onOpponentScore(data.opponentScore);
              activeGameCallbacks.onOpponentScore?.(data.opponentScore);
            }

            // Sync opponent emote
            if (data.opponentEmote && data.opponentEmote !== lastSeenEmote) {
              lastSeenEmote = data.opponentEmote;
              callbacks.onOpponentEmote(data.opponentEmote);
              activeGameCallbacks.onOpponentEmote?.(data.opponentEmote);
            }

            // Opponent quit / forfeit
            if (data.status === 'FORFEIT' && data.winnerId === myId) {
              callbacks.onOpponentQuit();
              activeGameCallbacks.onOpponentQuit?.();
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
  async joinFriendRoom(roomCode: string, callbacks: DuelCallbacks, onNotFound?: () => void) {
    this.cleanup();
    activeRoomCode = roomCode;
    isHostPlayer = false;
    currentScore = 0;

    const myId = getDeviceId();
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
        if (onNotFound) onNotFound();
        return;
      }

      const data = await res.json();
      callbacks.onMatchStart(data.host, data.seed, false, roomCode);

      // Start high-speed edge sync polling
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
            const sData = await syncRes.json();

            // Sync opponent score
            if (typeof sData.opponentScore === 'number') {
              callbacks.onOpponentScore(sData.opponentScore);
              activeGameCallbacks.onOpponentScore?.(sData.opponentScore);
            }

            // Sync opponent emote
            if (sData.opponentEmote && sData.opponentEmote !== lastSeenEmote) {
              lastSeenEmote = sData.opponentEmote;
              callbacks.onOpponentEmote(sData.opponentEmote);
              activeGameCallbacks.onOpponentEmote?.(sData.opponentEmote);
            }

            // Opponent quit
            if (sData.status === 'FORFEIT' && sData.winnerId === myId) {
              callbacks.onOpponentQuit();
              activeGameCallbacks.onOpponentQuit?.();
            }
          }
        } catch (e) {
          // ignore
        }
      }, 600);
    } catch (err) {
      if (onNotFound) onNotFound();
    }
  },

  /**
   * QUICK MATCH: Match with a live player in Cloudflare D1 Queue or smart challenger
   */
  async startQuickMatch(callbacks: DuelCallbacks) {
    this.cleanup();
    const myId = getDeviceId();
    const myName = getPlayerName() || 'Oyuncu';

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

          botScoreTracker = 0;
          simulatedBotInterval = setInterval(() => {
            if (Math.random() < 0.72) {
              botScoreTracker += 1;
              callbacks.onOpponentScore(botScoreTracker);
              activeGameCallbacks.onOpponentScore?.(botScoreTracker);
              if (botScoreTracker >= 10) {
                clearInterval(simulatedBotInterval);
              }
            }
          }, 4200);

          callbacks.onMatchStart(randomBot, botSeed, true, botRoom);
        }
      }, 800);
    } catch (err) {
      console.error('Cloudflare matchmaking error:', err);
    }
  },

  startRoomSync(roomCode: string, myId: string, callbacks: DuelCallbacks) {
    currentScore = 0;
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
          if (typeof data.opponentScore === 'number') {
            callbacks.onOpponentScore(data.opponentScore);
            activeGameCallbacks.onOpponentScore?.(data.opponentScore);
          }
          if (data.opponentEmote && data.opponentEmote !== lastSeenEmote) {
            lastSeenEmote = data.opponentEmote;
            callbacks.onOpponentEmote(data.opponentEmote);
            activeGameCallbacks.onOpponentEmote?.(data.opponentEmote);
          }
          if (data.status === 'FORFEIT' && data.winnerId === myId) {
            callbacks.onOpponentQuit();
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
    currentScore = newScore;
    const myId = getDeviceId();
    if (activeRoomCode) {
      fetch(`${CF_WORKER_URL}/api/duel/room/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: activeRoomCode,
          player_id: myId,
          score: newScore,
        }),
      }).catch(() => {});
    }
  },

  sendEmote(emoji: string) {
    pendingEmote = emoji;
    const myId = getDeviceId();
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

  async cancelMatchmaking(playerId: string) {
    try {
      await fetch(`${CF_WORKER_URL}/api/duel/matchmaking/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });
    } catch (e) {}
  },

  cleanup() {
    clearInterval(syncInterval);
    clearInterval(matchmakingInterval);
    clearInterval(simulatedBotInterval);
    syncInterval = null;
    matchmakingInterval = null;
    simulatedBotInterval = null;

    if (activeRoomCode) {
      const myId = getDeviceId();
      fetch(`${CF_WORKER_URL}/api/duel/room/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: activeRoomCode, player_id: myId }),
      }).catch(() => {});
      activeRoomCode = '';
    }
  },
};
