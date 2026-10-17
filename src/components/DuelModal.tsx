import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from './Icons';
import { haptic } from '../lib/Haptics';
import { useGameStore } from '../store/useGameStore';
import { Translations } from '../lib/Translations';
import { DuelService, type OpponentInfo } from '../lib/DuelService';

export interface StartDuelPayload {
  opponent: OpponentInfo;
  seed: number;
  isHost: boolean;
  roomCode: string;
}

interface DuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDuel: (payload: StartDuelPayload) => void;
  playSound: (type: 'click' | 'success' | 'fail') => void;
}

export const DuelModal: React.FC<DuelModalProps> = ({
  isOpen,
  onClose,
  onStartDuel,
  playSound,
}) => {
  const { language } = useGameStore();
  const t = Translations[language];
  const [tab, setTab] = useState<'friend' | 'quick'>('quick');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [searchTimer, setSearchTimer] = useState(0);
  const matchStartedRef = useRef(false);

  // Generate clean room code when opened
  useEffect(() => {
    if (isOpen && !roomCode) {
      const code = `ZK-${Math.floor(1000 + Math.random() * 9000)}`;
      setRoomCode(code);
    }
    if (isOpen) {
      matchStartedRef.current = false;
    }
  }, [isOpen, roomCode]);

  // Clean up socket connections when closed without starting match
  useEffect(() => {
    if (!isOpen) {
      if (!matchStartedRef.current) {
        DuelService.cleanup();
      }
      setIsSearching(false);
      setIsJoining(false);
      setJoinError('');
      matchStartedRef.current = false;
    }
  }, [isOpen]);

  // Timer for searching animation
  useEffect(() => {
    let interval: any;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTimer(prev => prev + 1);
      }, 1000);
    } else {
      setSearchTimer(0);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  // Automatically listen as Host when on friend tab
  useEffect(() => {
    if (isOpen && tab === 'friend' && roomCode) {
      DuelService.createFriendRoom(roomCode, {
        onMatchStart: (opp, seed, isHost, rCode) => {
          matchStartedRef.current = true;
          haptic.notification('success');
          playSound('success');
          onStartDuel({ opponent: opp, seed, isHost, roomCode: rCode });
        },
        onOpponentScore: () => {},
        onOpponentEmote: () => {},
        onOpponentQuit: () => {},
      });
    }

    return () => {
      if (!matchStartedRef.current && tab === 'friend') {
        DuelService.cleanup();
      }
    };
  }, [isOpen, tab, roomCode]);

  const handleCopyCode = () => {
    haptic.impact('light');
    playSound('click');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`ZEKA'da bana meydan oku! Oda Kodum: ${roomCode} 👇\nhttps://zeka.arcn.games/duel/${roomCode}`);
    }
  };

  const handleStartSearch = () => {
    haptic.impact('medium');
    playSound('click');
    setIsSearching(true);

    DuelService.startQuickMatch({
      onMatchStart: (opp, seed, isHost, rCode) => {
        matchStartedRef.current = true;
        setIsSearching(false);
        haptic.notification('success');
        playSound('success');
        onStartDuel({ opponent: opp, seed, isHost, roomCode: rCode });
      },
      onOpponentScore: () => {},
      onOpponentEmote: () => {},
      onOpponentQuit: () => {},
    });
  };

  const handleCancelSearch = () => {
    haptic.impact('light');
    playSound('click');
    DuelService.cleanup();
    setIsSearching(false);
  };

  const handleJoinWithCode = () => {
    const formattedCode = joinCode.trim().toUpperCase();
    if (formattedCode.length >= 4) {
      haptic.impact('medium');
      playSound('click');
      setIsJoining(true);
      setJoinError('');

      DuelService.joinFriendRoom(
        formattedCode,
        {
          onMatchStart: (opp, seed, isHost, rCode) => {
            matchStartedRef.current = true;
            setIsJoining(false);
            haptic.notification('success');
            playSound('success');
            onStartDuel({ opponent: opp, seed, isHost, roomCode: rCode });
          },
          onOpponentScore: () => {},
          onOpponentEmote: () => {},
          onOpponentQuit: () => {},
        },
        () => {
          setIsJoining(false);
          setJoinError(t.duel_room_error);
          haptic.notification('error');
          playSound('fail');
        }
      );
    } else {
      haptic.notification('error');
      playSound('fail');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[2rem] p-6 w-full max-w-[360px] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                  <Icons.Swords className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-neutral-900 leading-none">{t.duel_title}</h2>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t.duel_subtitle}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  DuelService.cleanup();
                  onClose();
                }}
                className="w-8 h-8 flex items-center justify-center bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors text-neutral-400 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex p-1 bg-neutral-100 rounded-2xl mb-4 shrink-0">
              <button
                onClick={() => {
                  setTab('quick');
                  setJoinError('');
                }}
                disabled={isSearching || isJoining}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  tab === 'quick' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                }`}
              >
                {t.duel_quick_tab}
              </button>
              <button
                onClick={() => {
                  setTab('friend');
                  setJoinError('');
                }}
                disabled={isSearching || isJoining}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  tab === 'friend' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                }`}
              >
                {t.duel_friend_tab}
              </button>
            </div>

            {/* Tab 1: Quick Match */}
            {tab === 'quick' && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 p-1 mb-4 flex items-center justify-center shadow-lg relative">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-red-500">
                    <Icons.Swords className={`w-8 h-8 ${isSearching ? 'animate-bounce' : ''}`} />
                  </div>
                  {isSearching && (
                    <div className="absolute inset-0 rounded-full border-4 border-amber-400 animate-ping opacity-60"></div>
                  )}
                </div>

                <h3 className="text-sm font-black text-neutral-900 uppercase tracking-tight mb-1">
                  {isSearching ? t.duel_searching : t.mode_duel}
                </h3>
                <p className="text-[11px] text-neutral-500 font-medium px-4 mb-3 leading-relaxed">
                  {isSearching
                    ? `${t.duel_search_desc} (${searchTimer}s)`
                    : t.duel_global_desc}
                </p>

                <div className="flex items-center gap-1.5 mb-5 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200/60 text-[10px] font-black text-amber-700">
                  <span>🪙</span>
                  <span>{t.duel_stake_info || 'Giriş: 25 Coin • Kazanan: +50 Coin'}</span>
                </div>

                {isSearching ? (
                  <button
                    onClick={handleCancelSearch}
                    className="w-full py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-200 transition-colors"
                  >
                    {t.duel_cancel}
                  </button>
                ) : (
                  <button
                    onClick={handleStartSearch}
                    className="w-full py-4 bg-[#1D1D1F] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {t.duel_find_btn}
                  </button>
                )}
              </div>
            )}

            {/* Tab 2: Friend Code */}
            {tab === 'friend' && (
              <div className="flex flex-col gap-3 py-1">
                <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[10px] font-black text-amber-700 text-center">
                  <span>🪙</span>
                  <span>{t.duel_stake_info || 'Giriş: 25 Coin • Kazanan: +50 Coin'}</span>
                </div>

                {/* Your Room Code Box */}
                <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                    {t.duel_your_code}
                  </span>
                  <span className="text-2xl font-black tracking-widest text-neutral-900 font-mono mb-2">
                    {roomCode}
                  </span>

                  <div className="flex items-center gap-1.5 mb-3 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>{t.duel_waiting_friend}</span>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                  >
                    {t.duel_copy_btn}
                  </button>
                </div>

                <div className="flex items-center gap-2 px-2">
                  <div className="h-[1px] bg-neutral-200 flex-1"></div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">{t.duel_or}</span>
                  <div className="h-[1px] bg-neutral-200 flex-1"></div>
                </div>

                {/* Join with Code */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                    {t.duel_enter_code}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ZK-1234"
                      value={joinCode}
                      onChange={(e) => {
                        setJoinCode(e.target.value.toUpperCase());
                        setJoinError('');
                      }}
                      maxLength={7}
                      disabled={isJoining}
                      className="flex-1 px-4 py-3 rounded-2xl border border-neutral-200 text-sm font-black font-mono tracking-wider uppercase focus:outline-none focus:border-neutral-900 text-center"
                    />
                    <button
                      onClick={handleJoinWithCode}
                      disabled={isJoining}
                      className="px-5 bg-amber-400 hover:bg-amber-500 text-neutral-900 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                    >
                      {isJoining ? (
                        <div className="w-4 h-4 border-2 border-neutral-900/20 border-t-neutral-900 rounded-full animate-spin"></div>
                      ) : (
                        t.duel_join_btn
                      )}
                    </button>
                  </div>
                  {joinError && (
                    <span className="text-[10px] text-red-500 font-bold text-center">
                      {joinError}
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
