/**
 * ZEKA: Mind Puzzle - 100% Cloudflare Edge Worker & D1 API
 * Fully serverless, 0ms cold starts, global edge replication.
 * - High-speed Edge Leaderboard with 30s cache
 * - Anti-cheat verified score recording + Auto Geo-IP detection
 * - Real-time 1v1 Live Duel Rooms (Host, Join, Sync, Forfeit)
 * - Global Matchmaking Queue in D1
 */

export interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, status = 200, cacheSeconds = 0): Response {
  const headers = new Headers({
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
  });

  if (cacheSeconds > 0) {
    headers.set('Cache-Control', `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`);
  } else {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const cf = (request as any).cf;
    const detectedCountry = cf?.country ? String(cf.country).toUpperCase() : 'TR';

    try {
      // 1. HEALTH & GEO PING
      if (path === '/api/health') {
        return json({
          status: 'online',
          country: detectedCountry,
          city: cf?.city || 'Unknown',
          colo: cf?.colo || 'EDGE',
          timestamp: Date.now(),
        });
      }

      // 2. CHECK IF PLAYER NAME IS TAKEN
      if (request.method === 'GET' && path === '/api/check-name') {
        const name = (url.searchParams.get('name') || '').trim();
        if (!name) return json({ taken: false });

        const row = await env.DB.prepare(
          'SELECT id FROM scores WHERE LOWER(player_name) = LOWER(?) LIMIT 1'
        ).bind(name).first();

        return json({ taken: !!row });
      }

      // 3. GET LEADERBOARD (Edge Cached for 30s)
      if (request.method === 'GET' && path === '/api/leaderboard') {
        const period = url.searchParams.get('period') || 'daily';
        let timeFilter = "created_at >= datetime('now', '-1 day')";

        if (period === 'weekly') {
          timeFilter = "created_at >= datetime('now', '-7 days')";
        } else if (period === 'alltime') {
          timeFilter = "1=1";
        }

        const query = `
          SELECT 
            MIN(id) as id,
            player_name, 
            MAX(level) as level, 
            MIN(total_time) as total_time,
            country,
            MAX(created_at) as created_at
          FROM scores
          WHERE ${timeFilter}
          GROUP BY player_name
          ORDER BY level DESC, total_time ASC
          LIMIT 50;
        `;

        const { results } = await env.DB.prepare(query).all();
        return json(results || [], 200, 30);
      }

      // 4. GET PERSONAL RANK & SCORE
      if (request.method === 'GET' && path === '/api/rank') {
        const name = (url.searchParams.get('name') || '').trim();
        const deviceId = (url.searchParams.get('deviceId') || '').trim();
        const period = url.searchParams.get('period') || 'daily';

        if (!name && !deviceId) return json({ rank: null, row: null });

        let timeFilter = "created_at >= datetime('now', '-1 day')";
        if (period === 'weekly') timeFilter = "created_at >= datetime('now', '-7 days')";
        else if (period === 'alltime') timeFilter = "1=1";

        const myRow = await env.DB.prepare(`
          SELECT * FROM scores 
          WHERE (device_id = ? OR LOWER(player_name) = LOWER(?)) AND ${timeFilter}
          ORDER BY level DESC, total_time ASC 
          LIMIT 1
        `).bind(deviceId, name).first<any>();

        if (!myRow) return json({ rank: null, row: null });

        const countRow = await env.DB.prepare(`
          SELECT COUNT(DISTINCT player_name) as higher_count
          FROM scores
          WHERE ${timeFilter} AND (level > ? OR (level = ? AND total_time < ?))
        `).bind(myRow.level, myRow.level, myRow.total_time).first<{ higher_count: number }>();

        const rank = (countRow?.higher_count || 0) + 1;
        return json({ rank, row: myRow });
      }

      // 5. SUBMIT SCORE (Anti-cheat & Auto Geo-Country)
      if (request.method === 'POST' && path === '/api/score') {
        const body = (await request.json()) as {
          player_name: string;
          device_id?: string;
          level: number;
          total_time: number;
        };

        const name = (body.player_name || '').trim().substring(0, 15);
        const deviceId = (body.device_id || '').trim();
        const level = Number(body.level);
        const totalTime = Number(body.total_time);

        if (!name || name.length < 2) {
          return json({ error: 'Geçersiz oyuncu adı' }, 400);
        }

        if (isNaN(level) || level < 1 || level > 500) {
          return json({ error: 'Geçersiz seviye' }, 400);
        }

        // Anti-cheat speed check
        if (isNaN(totalTime) || totalTime < level * 0.35) {
          return json({ error: 'Fiziksel olarak imkansız reaksiyon süresi' }, 400);
        }

        // Check player's best in D1
        const existing = await env.DB.prepare(`
          SELECT id, level, total_time FROM scores 
          WHERE device_id = ? OR LOWER(player_name) = LOWER(?)
          ORDER BY level DESC, total_time ASC LIMIT 1
        `).bind(deviceId, name).first<{ id: number; level: number; total_time: number }>();

        let isBetter = false;
        if (!existing) {
          isBetter = true;
          await env.DB.prepare(
            'INSERT INTO scores (player_name, device_id, level, total_time, country) VALUES (?, ?, ?, ?, ?)'
          ).bind(name, deviceId, level, totalTime, detectedCountry).run();
        } else if (level > existing.level || (level === existing.level && totalTime < existing.total_time)) {
          isBetter = true;
          await env.DB.prepare(`
            UPDATE scores 
            SET player_name = ?, level = ?, total_time = ?, country = ?, created_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(name, level, totalTime, detectedCountry, existing.id).run();
        }

        return json({ success: true, saved: isBetter, country: detectedCountry });
      }

      // ─── 1V1 REAL-TIME DUEL ENDPOINTS ───────────────────

      // 6. CREATE DUEL ROOM (Host)
      if (request.method === 'POST' && path === '/api/duel/room/create') {
        const body = await request.json() as {
          room_code: string;
          host_id: string;
          host_name: string;
          host_country?: string;
        };

        const roomCode = body.room_code.trim().toUpperCase();
        const seed = Math.floor(Math.random() * 900000) + 100000;
        const country = body.host_country || detectedCountry;

        await env.DB.prepare(`
          INSERT INTO duel_rooms (room_code, host_id, host_name, host_country, seed, status, updated_at)
          VALUES (?, ?, ?, ?, ?, 'WAITING', CURRENT_TIMESTAMP)
          ON CONFLICT(room_code) DO UPDATE SET
            host_id = excluded.host_id,
            host_name = excluded.host_name,
            host_country = excluded.host_country,
            seed = excluded.seed,
            host_score = 0,
            guest_score = 0,
            guest_id = NULL,
            guest_name = NULL,
            status = 'WAITING',
            winner_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        `).bind(roomCode, body.host_id, body.host_name, country, seed).run();

        return json({ success: true, room_code: roomCode, seed });
      }

      // 7. JOIN DUEL ROOM (Guest)
      if (request.method === 'POST' && path === '/api/duel/room/join') {
        const body = await request.json() as {
          room_code: string;
          guest_id: string;
          guest_name: string;
          guest_country?: string;
        };

        const roomCode = body.room_code.trim().toUpperCase();
        const country = body.guest_country || detectedCountry;

        const room = await env.DB.prepare(
          'SELECT * FROM duel_rooms WHERE room_code = ?'
        ).bind(roomCode).first<any>();

        if (!room) {
          return json({ error: 'Oda bulunamadı' }, 404);
        }

        if (room.status === 'ACTIVE' && room.guest_id && room.guest_id !== body.guest_id) {
          return json({ error: 'Oda şu an dolu' }, 400);
        }

        await env.DB.prepare(`
          UPDATE duel_rooms
          SET guest_id = ?, guest_name = ?, guest_country = ?, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
          WHERE room_code = ?
        `).bind(body.guest_id, body.guest_name, country, roomCode).run();

        return json({
          success: true,
          seed: room.seed,
          host: { id: room.host_id, name: room.host_name, country: room.host_country },
        });
      }

      // 8. DUEL ROOM SYNC (Poll & Update Scores / Emotes)
      if (request.method === 'POST' && path === '/api/duel/room/sync') {
        const body = await request.json() as {
          room_code: string;
          player_id: string;
          score?: number;
          emote?: string;
        };

        const roomCode = body.room_code.trim().toUpperCase();
        const room = await env.DB.prepare(
          'SELECT * FROM duel_rooms WHERE room_code = ?'
        ).bind(roomCode).first<any>();

        if (!room) return json({ error: 'Oda bulunamadı' }, 404);

        const isHost = room.host_id === body.player_id;
        const myScore = typeof body.score === 'number' ? body.score : (isHost ? room.host_score : room.guest_score);
        let winnerId = room.winner_id;
        let newStatus = room.status;

        if (myScore >= 10 && !winnerId) {
          winnerId = body.player_id;
          newStatus = 'FINISHED';
        }

        if (isHost) {
          await env.DB.prepare(`
            UPDATE duel_rooms
            SET host_score = ?, host_emote = COALESCE(?, host_emote), status = ?, winner_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE room_code = ?
          `).bind(myScore, body.emote || null, newStatus, winnerId, roomCode).run();
        } else {
          await env.DB.prepare(`
            UPDATE duel_rooms
            SET guest_score = ?, guest_emote = COALESCE(?, guest_emote), status = ?, winner_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE room_code = ?
          `).bind(myScore, body.emote || null, newStatus, winnerId, roomCode).run();
        }

        // Fetch fresh state to guarantee latest opponent score
        const updated = await env.DB.prepare(
          'SELECT * FROM duel_rooms WHERE room_code = ?'
        ).bind(roomCode).first<any>() || room;

        return json({
          status: updated.status,
          seed: updated.seed,
          isHost,
          host: { id: updated.host_id, name: updated.host_name, country: updated.host_country, score: updated.host_score, emote: updated.host_emote },
          guest: updated.guest_id ? { id: updated.guest_id, name: updated.guest_name, country: updated.guest_country, score: updated.guest_score, emote: updated.guest_emote } : null,
          opponentScore: isHost ? updated.guest_score : updated.host_score,
          opponentEmote: isHost ? updated.guest_emote : updated.host_emote,
          opponentInfo: isHost ? (updated.guest_id ? { id: updated.guest_id, name: updated.guest_name, country: updated.guest_country } : null) : { id: updated.host_id, name: updated.host_name, country: updated.host_country },
          winnerId: updated.winner_id,
        });
      }

      // 9. DUEL ROOM LEAVE / FORFEIT
      if (request.method === 'POST' && path === '/api/duel/room/leave') {
        const body = await request.json() as { room_code: string; player_id: string };
        const roomCode = body.room_code.trim().toUpperCase();

        const room = await env.DB.prepare('SELECT * FROM duel_rooms WHERE room_code = ?').bind(roomCode).first<any>();
        if (room) {
          const isHost = room.host_id === body.player_id;
          const otherPlayerId = isHost ? room.guest_id : room.host_id;

          await env.DB.prepare(`
            UPDATE duel_rooms
            SET status = 'FORFEIT', winner_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE room_code = ?
          `).bind(otherPlayerId, roomCode).run();
        }

        return json({ success: true });
      }

      // 10. GLOBAL MATCHMAKING: JOIN QUEUE
      if (request.method === 'POST' && path === '/api/duel/matchmaking/join') {
        const body = await request.json() as { player_id: string; player_name: string };
        const myId = body.player_id;
        const myName = body.player_name || 'Oyuncu';
        const country = detectedCountry;

        // Clean stale queue entries older than 20 seconds
        await env.DB.prepare("DELETE FROM duel_queue WHERE created_at < datetime('now', '-20 seconds')").run();

        // Check if there is already another waiting player in the queue
        const waitingOpponent = await env.DB.prepare(`
          SELECT * FROM duel_queue 
          WHERE player_id != ? AND status = 'SEARCHING'
          ORDER BY created_at ASC LIMIT 1
        `).bind(myId).first<any>();

        if (waitingOpponent) {
          // Pair them!
          const sharedRoom = `ZK-${Math.floor(1000 + Math.random() * 9000)}`;
          const sharedSeed = Math.floor(Math.random() * 900000) + 100000;

          // Create active room
          await env.DB.prepare(`
            INSERT INTO duel_rooms (room_code, host_id, host_name, host_country, guest_id, guest_name, guest_country, seed, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)
          `).bind(
            sharedRoom,
            waitingOpponent.player_id,
            waitingOpponent.player_name,
            waitingOpponent.player_country,
            myId,
            myName,
            country,
            sharedSeed
          ).run();

          // Mark opponent as matched
          await env.DB.prepare(`
            UPDATE duel_queue SET status = 'MATCHED', matched_room_code = ? WHERE player_id = ?
          `).bind(sharedRoom, waitingOpponent.player_id).run();

          return json({
            status: 'MATCHED',
            room_code: sharedRoom,
            seed: sharedSeed,
            isHost: false,
            opponent: { id: waitingOpponent.player_id, name: waitingOpponent.player_name, country: waitingOpponent.player_country },
          });
        }

        // Otherwise put self in queue
        await env.DB.prepare(`
          INSERT INTO duel_queue (player_id, player_name, player_country, status, created_at)
          VALUES (?, ?, ?, 'SEARCHING', CURRENT_TIMESTAMP)
          ON CONFLICT(player_id) DO UPDATE SET
            status = 'SEARCHING',
            matched_room_code = NULL,
            created_at = CURRENT_TIMESTAMP
        `).bind(myId, myName, country).run();

        return json({ status: 'SEARCHING' });
      }

      // 11. GLOBAL MATCHMAKING: POLL QUEUE STATUS
      if (request.method === 'GET' && path === '/api/duel/matchmaking/poll') {
        const myId = url.searchParams.get('playerId') || '';

        const queueEntry = await env.DB.prepare(
          'SELECT * FROM duel_queue WHERE player_id = ?'
        ).bind(myId).first<any>();

        if (!queueEntry) return json({ status: 'IDLE' });

        if (queueEntry.status === 'MATCHED' && queueEntry.matched_room_code) {
          const room = await env.DB.prepare(
            'SELECT * FROM duel_rooms WHERE room_code = ?'
          ).bind(queueEntry.matched_room_code).first<any>();

          // Clean up from queue
          await env.DB.prepare('DELETE FROM duel_queue WHERE player_id = ?').bind(myId).run();

          if (room) {
            const isHost = room.host_id === myId;
            const opp = isHost
              ? { id: room.guest_id, name: room.guest_name, country: room.guest_country }
              : { id: room.host_id, name: room.host_name, country: room.host_country };

            return json({
              status: 'MATCHED',
              room_code: room.room_code,
              seed: room.seed,
              isHost,
              opponent: opp,
            });
          }
        }

        return json({ status: 'SEARCHING' });
      }

      // 12. CANCEL MATCHMAKING
      if (request.method === 'POST' && path === '/api/duel/matchmaking/cancel') {
        const body = await request.json() as { player_id: string };
        await env.DB.prepare('DELETE FROM duel_queue WHERE player_id = ?').bind(body.player_id).run();
        return json({ success: true });
      }

      return json({ error: 'Endpoint bulunamadı' }, 404);
    } catch (err: any) {
      return json({ error: err?.message || 'Cloudflare Edge Worker hatası' }, 500);
    }
  },
};
