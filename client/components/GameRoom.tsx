import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { useTranslation } from 'next-i18next';
import ChatBox from '@/components/ChatBox';
import Navbar from '@/components/Navbar';
import Toast from '@/components/ui/Toast';

import {
  Room,
  Message,
  UserData,
  MapDiffData,
  LeaderBoardTable,
  Position,
  RoomUiStatus,
  initGameInfo,
} from '@/lib/types';
import { AttackQueue } from '@/lib/attack-queue';
import Game from '@/components/game/Game';
import { useGame, useGameDispatch } from '@/context/GameContext';
import GameLoading from '@/components/GameLoading';
import GameSetting from '@/components/GameSetting';
import RoomSessionGate from '@/components/RoomSessionGate';
import { soundEffects } from '@/lib/sound-effects';
import {
  clearReconnectToken,
  getStoredReconnectToken,
  resolveRoomIdentity,
  storeReconnectToken,
} from '@/lib/room-identity';
import { ensurePlayerSession } from '@/lib/session';

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

const JOINING_GATE_DELAY_MS = 350;

type RoomSessionPhase =
  | 'joining'
  | 'joined'
  | 'reconnecting'
  | 'leaving'
  | 'rejected';

function GamingRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionToken, setSessionToken] = useState('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'reconnecting'
  >('connecting');
  const [roomSessionPhase, setRoomSessionPhase] =
    useState<RoomSessionPhase>('joining');
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectDelayMs, setReconnectDelayMs] = useState<number | null>(null);
  const [joinRejectionMessage, setJoinRejectionMessage] = useState('');
  const [showJoiningGate, setShowJoiningGate] = useState(false);
  const myPlayerIdRef = useRef<string>('');
  const wasRoomHostRef = useRef(false);
  const hasResolvedRoomHostRef = useRef(false);
  const hasJoinedRoomRef = useRef(false);
  const intentionalDisconnectRef = useRef(false);

  const router = useRouter();
  const push = router.push;
  const roomId = typeof router.query.roomId === 'string' ? router.query.roomId : '';

  const { t } = useTranslation();

  const {
    room,
    roomUiStatus,
    socketRef,
    attackQueueRef,
    myUserName,
    snackState,
  } = useGame();
  const {
    roomDispatch,
    mapDataDispatch,
    setRoomUiStatus,
    setMyPlayerId,
    setTurnsCount,
    setLeaderBoardData,
    setDialogContent,
    setOpenOverDialog,
    snackStateDispatch,
    mapQueueDataDispatch,
    setSelectedMapTileInfo,
    setInitGameInfo,
    setIsSurrendered,
    setTeam,
    setMyUserName,
  } = useGameDispatch();

  const returnToLobby = useCallback(() => {
    intentionalDisconnectRef.current = true;
    if (roomId) {
      clearReconnectToken(roomId);
    }
    socketRef.current?.disconnect();
    void push('/');
  }, [push, roomId, socketRef]);

  const confirmRoomJoin = useCallback(
    (nextRoom: Room) => {
      if (intentionalDisconnectRef.current) {
        return;
      }

      if (!hasJoinedRoomRef.current) {
        hasJoinedRoomRef.current = true;
        setHasJoinedRoom(true);
      }

      if (myPlayerIdRef.current && nextRoom.players) {
        const player = nextRoom.players.find(
          (roomPlayer) => roomPlayer.id === myPlayerIdRef.current
        );
        if (player) {
          setTeam(player.team);
          debugLog('set team', player.team);

          if (
            hasResolvedRoomHostRef.current &&
            player.isRoomHost &&
            !wasRoomHostRef.current
          ) {
            snackStateDispatch({
              type: 'update',
              title: t('room-host-promoted-title'),
              status: 'success',
              message: t('room-host-promoted-message'),
              duration: 3000,
            });
          }

          wasRoomHostRef.current = player.isRoomHost;
          hasResolvedRoomHostRef.current = true;
        } else {
          wasRoomHostRef.current = false;
        }
      } else {
        wasRoomHostRef.current = false;
      }

      setReconnectAttempt(0);
      setReconnectDelayMs(null);
      setRoomSessionPhase('joined');
    },
    [setTeam, snackStateDispatch, t]
  );

  const handleLeaveRoom = useCallback(() => {
    intentionalDisconnectRef.current = true;
    setRoomSessionPhase('leaving');
    if (roomId) {
      clearReconnectToken(roomId);
    }
    socketRef.current?.emit('leave_room');

    window.setTimeout(() => {
      socketRef.current?.disconnect();
      void push('/');
    }, 120);
  }, [push, roomId, socketRef]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const { username, requiresUsername } = resolveRoomIdentity(
      localStorage.getItem('username')
    );

    if (requiresUsername) {
      void push(`/?redirect=${encodeURIComponent(`/rooms/${roomId}`)}`);
      return;
    }

    setMyUserName(username);
    setSessionToken('');
    setMyPlayerId('');
    myPlayerIdRef.current = '';
    wasRoomHostRef.current = false;
    hasResolvedRoomHostRef.current = false;
    hasJoinedRoomRef.current = false;
    intentionalDisconnectRef.current = false;
    setHasJoinedRoom(false);
    setReconnectAttempt(0);
    setReconnectDelayMs(null);
    setJoinRejectionMessage('');
    setShowJoiningGate(false);
    setMessages([]);
    setLatencyMs(null);
    setConnectionState('connecting');
    setRoomSessionPhase('joining');
    roomDispatch({ type: 'update', payload: new Room(roomId) });
    setRoomUiStatus(RoomUiStatus.gameSetting);

    let cancelled = false;

    void ensurePlayerSession(username)
      .then((token) => {
        if (!cancelled) {
          setSessionToken(token);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize room session', error);
        if (!cancelled) {
          setJoinRejectionMessage('Unable to initialize player session.');
          setRoomSessionPhase('rejected');
          snackStateDispatch({
            type: 'update',
            title: 'Connect Error',
            status: 'error',
            message: 'Please refresh the App.',
            duration: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    push,
    roomDispatch,
    roomId,
    setMyPlayerId,
    setMyUserName,
    setRoomUiStatus,
    snackStateDispatch,
    t,
  ]);

  useEffect(() => {
    if (!roomId || !myUserName || !sessionToken) {
      return;
    }

    soundEffects.init();

    attackQueueRef.current = new AttackQueue((route) => {
      mapQueueDataDispatch({
        type: 'change',
        x: route.from.x,
        y: route.from.y,
        className: '',
      });
    });

    const reconnectToken = getStoredReconnectToken(roomId);
    setConnectionState('connecting');
    setLatencyMs(null);
    setRoomSessionPhase(hasJoinedRoomRef.current ? 'reconnecting' : 'joining');

    socketRef.current = io(process.env.NEXT_PUBLIC_SERVER_API, {
      query: {
        roomId,
        sessionToken,
        reconnectToken,
      },
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnectionState('connected');
      if (!hasJoinedRoomRef.current) {
        setRoomSessionPhase('joining');
      }
      debugLog(`socket client connect to server: ${socket.id}`);
    });

    socket.on('reconnect_attempt', (attempt: number, delay: number) => {
      setConnectionState('reconnecting');
      setReconnectAttempt(attempt);
      setReconnectDelayMs(delay);
      setRoomSessionPhase(hasJoinedRoomRef.current ? 'reconnecting' : 'joining');
    });

    socket.on('latency', (nextLatency: number | null) => {
      setLatencyMs(nextLatency);
      if (nextLatency !== null) {
        socket.emit('report_latency', nextLatency);
      }
    });

    socket.on('player_latency', (playerId: string, nextLatency: number | null) => {
      roomDispatch({
        type: 'update_player_latency',
        payload: {
          playerId,
          latencyMs: nextLatency,
        },
      });
    });

    socket.on(
      'set_player_id',
      (playerId: string, nextReconnectToken?: string | null) => {
        debugLog(`set_player_id: ${playerId}`);
        setMyPlayerId(playerId);
        myPlayerIdRef.current = playerId;

        const normalizedReconnectToken = (nextReconnectToken ?? '').trim();
        if (roomId) {
          storeReconnectToken(roomId, normalizedReconnectToken);
        }
        socket.updateQuery({
          reconnectToken: normalizedReconnectToken,
        });
      }
    );

    socket.on('game_started', (initGameInfo: initGameInfo) => {
      debugLog('Game started:', initGameInfo);
      soundEffects.play('gameStart');
      setRoomUiStatus(RoomUiStatus.loading);
      setInitGameInfo(initGameInfo);
      setIsSurrendered(false);
      setDialogContent([[null], '', null]);
      setOpenOverDialog(false);

      setSelectedMapTileInfo({
        x: initGameInfo.king.x,
        y: initGameInfo.king.y,
        half: false,
        unitsCount: 0,
      });

      mapDataDispatch({
        type: 'init',
        mapWidth: initGameInfo.mapWidth,
        mapHeight: initGameInfo.mapHeight,
      });

      mapQueueDataDispatch({
        type: 'init',
        mapWidth: initGameInfo.mapWidth,
        mapHeight: initGameInfo.mapHeight,
      });
    });

    socket.on('update_room', (room: Room) => {
      debugLog('update_room');
      debugLog(room);
      debugLog(myPlayerIdRef.current);
      confirmRoomJoin(room);
      roomDispatch({ type: 'update', payload: room });
    });

    socket.on('error', (title: string, message: string) => {
      snackStateDispatch({
        type: 'update',
        title,
        message,
        duration: 3000,
      });
    });

    socket.on('room_message', (player: UserData | null, content: string) => {
      setMessages((messages: Message[]) => [
        ...messages,
        new Message(player, content),
      ]);
    });

    socket.on('auto_surrendered', () => {
      setIsSurrendered(true);
      snackStateDispatch({
        type: 'update',
        title: '',
        status: 'warning',
        message: t('auto-surrendered-inactive'),
        duration: 3500,
      });
    });

    socket.on('captured', (player1: UserData, player2: UserData) => {
      if (player2.id !== myPlayerIdRef.current) {
        soundEffects.play('capture');
      }
      setMessages((messages: Message[]) => [
        ...messages,
        new Message(player1, t('captured'), player2),
      ]);
    });

    socket.on('host_modification', (player1: UserData, player2: UserData) => {
      setMessages((messages: Message[]) => [
        ...messages,
        new Message(player1, t('transfer-host-to'), player2),
      ]);
    });

    socket.on('host_reassigned', (player1: UserData, player2: UserData) => {
      setMessages((messages: Message[]) => [
        ...messages,
        new Message(
          null,
          t('host-reassigned-message', {
            from: player1.username,
            to: player2.username,
          })
        ),
      ]);
    });

    socket.on('game_over', (capturedBy: UserData) => {
      debugLog(`game_over: ${capturedBy.username}`);
      soundEffects.play('defeat');
      setOpenOverDialog(true);
      setRoomUiStatus(RoomUiStatus.gameOverConfirm);
      setDialogContent([[capturedBy], 'game_over', null]);
    });

    socket.on('game_ended', (winner: [UserData], replayLink: string | null) => {
      debugLog(`game_ended: ${winner.map((x) => x.username)} ${replayLink}`);
      if (winner.some((player) => player.id === myPlayerIdRef.current)) {
        soundEffects.play('victory');
      }
      setDialogContent([winner, 'game_ended', replayLink]);
      setOpenOverDialog(true);
      setRoomUiStatus(RoomUiStatus.gameOverConfirm);
    });

    socket.on(
      'attack_success',
      (from: Position, to: Position, turn: number, requestId?: string | null) => {
        debugLog('attach success: ', from, to, turn, requestId);
        attackQueueRef.current.resolveSuccess(requestId, from, to);
      }
    );

    socket.on(
      'game_update',
      (
        mapDiff: MapDiffData,
        turnsCount: number,
        leaderBoardData: LeaderBoardTable
      ) => {
        debugLog(`game_update: ${turnsCount}`);

        attackQueueRef.current.allowAttackThisTurn = true;
        setRoomUiStatus(RoomUiStatus.gameRealStarted);
        mapDataDispatch({ type: 'update', mapDiff });
        setTurnsCount(turnsCount);
        setLeaderBoardData(leaderBoardData);

        if (
          !attackQueueRef.current.hasInFlight() &&
          !attackQueueRef.current.isEmpty()
        ) {
          const item = attackQueueRef.current.pop();
          if (!item) {
            return;
          }
          socket.emit('attack', item.from, item.to, item.half, item.requestId);
          attackQueueRef.current.allowAttackThisTurn = false;
          debugLog(
            'emit attack: ',
            item.from,
            item.to,
            item.half,
            item.requestId,
            turnsCount
          );
        } else if (
          !attackQueueRef.current.hasInFlight() &&
          attackQueueRef.current.lastItem
        ) {
          attackQueueRef.current.clearLastItem();
        }
      }
    );

    socket.on(
      'attack_failure',
      (from: Position, to: Position, message: string, requestId?: string | null) => {
        debugLog('attack_failure: ', from, to, message, requestId);
        attackQueueRef.current.resolveFailure(requestId, from, to);
      }
    );

    socket.on('reject_join', (message: string) => {
      intentionalDisconnectRef.current = true;
      if (roomId) {
        clearReconnectToken(roomId);
      }
      setJoinRejectionMessage(message);
      setRoomSessionPhase('rejected');
      socket.disconnect();

      snackStateDispatch({
        type: 'update',
        title: t('reject-join'),
        status: 'error',
        message:
          message === 'The room is full.'
            ? t('roomSession.roomFullCopy')
            : t('roomSession.joinRejectedCopy'),
        duration: null,
      });
    });

    socket.on('kicked', () => {
      intentionalDisconnectRef.current = true;
      if (roomId) {
        clearReconnectToken(roomId);
      }
      socket.disconnect();
      snackStateDispatch({
        type: 'update',
        title: t('kicked-title'),
        status: 'warning',
        message: t('kicked-message'),
        duration: 4000,
      });
      void push('/');
    });

    socket.on('connect_error', (error: Error) => {
      debugLog('\nConnection Failed: ' + error);
      if (intentionalDisconnectRef.current) {
        return;
      }

      setConnectionState('reconnecting');
      setLatencyMs(null);
      setRoomSessionPhase(hasJoinedRoomRef.current ? 'reconnecting' : 'joining');
    });

    socket.on('disconnect', (reason?: string) => {
      debugLog('Disconnected from server.');
      if (intentionalDisconnectRef.current || reason === 'io client disconnect') {
        return;
      }

      setConnectionState('reconnecting');
      setLatencyMs(null);
      setRoomSessionPhase(hasJoinedRoomRef.current ? 'reconnecting' : 'joining');
    });

    socket.on('reconnect', () => {
      debugLog('Reconnected to server.');
      setConnectionState('connected');
      setRoomSessionPhase(hasJoinedRoomRef.current ? 'reconnecting' : 'joining');
    });

    return () => {
      intentionalDisconnectRef.current = true;
      socketRef.current?.disconnect?.();
    };
  }, [
    attackQueueRef,
    confirmRoomJoin,
    mapDataDispatch,
    mapQueueDataDispatch,
    myUserName,
    roomDispatch,
    roomId,
    sessionToken,
    setDialogContent,
    setInitGameInfo,
    setIsSurrendered,
    setLeaderBoardData,
    setMyPlayerId,
    setOpenOverDialog,
    setRoomUiStatus,
    setSelectedMapTileInfo,
    setTurnsCount,
    snackStateDispatch,
    socketRef,
    t,
    push,
  ]);

  useEffect(() => {
    if (room.gameStarted && roomUiStatus === RoomUiStatus.gameSetting) {
      setRoomUiStatus(RoomUiStatus.loading);
    }
  }, [room.gameStarted, roomUiStatus, setRoomUiStatus]);

  useEffect(() => {
    if (roomSessionPhase !== 'joining') {
      setShowJoiningGate(roomSessionPhase !== 'joined');
      return;
    }

    setShowJoiningGate(false);
    const timer = window.setTimeout(() => {
      setShowJoiningGate(true);
    }, JOINING_GATE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [roomSessionPhase]);

  const gateDetail = useMemo(() => {
    if (roomSessionPhase !== 'reconnecting') {
      return undefined;
    }

    const detailParts: string[] = [];

    if (reconnectAttempt > 0) {
      detailParts.push(t('roomSession.attempt', { count: reconnectAttempt }));
    }

    if (reconnectDelayMs !== null) {
      detailParts.push(
        t('roomSession.retryingIn', {
          seconds: Math.max(1, Math.ceil(reconnectDelayMs / 1000)),
        })
      );
    }

    return detailParts.join(' / ') || t('roomSession.connectErrorCopy');
  }, [reconnectAttempt, reconnectDelayMs, roomSessionPhase, t]);

  const gateConfig = useMemo(() => {
    switch (roomSessionPhase) {
      case 'leaving':
        return {
          tone: 'ember' as const,
          label: t('roomSession.leavingLabel'),
          title: t('roomSession.leavingTitle'),
          description: t('roomSession.leavingCopy'),
          roomId: undefined,
          detail: undefined,
          action: undefined,
        };
      case 'reconnecting':
        return {
          tone: 'sky' as const,
          label: t('roomSession.reconnectingLabel'),
          title: t('roomSession.reconnectingTitle'),
          description: t('roomSession.reconnectingCopy'),
          roomId: undefined,
          detail: gateDetail,
          action: (
            <button
              type='button'
              className='bw-button bw-button-secondary min-h-10 px-4 text-xs'
              onClick={returnToLobby}
            >
              {t('roomSession.returnLobby')}
            </button>
          ),
        };
      case 'rejected': {
        const roomIsFull = joinRejectionMessage === 'The room is full.';

        return {
          tone: 'rose' as const,
          label: t('reject-join'),
          title: roomIsFull
            ? t('roomSession.roomFullTitle')
            : t('roomSession.joinRejectedTitle'),
          description: roomIsFull
            ? t('roomSession.roomFullCopy')
            : t('roomSession.joinRejectedCopy'),
          roomId,
          detail: joinRejectionMessage || undefined,
          action: (
            <button
              type='button'
              className='bw-button bw-button-primary min-h-10 px-4 text-xs'
              onClick={returnToLobby}
            >
              {t('roomSession.returnLobby')}
            </button>
          ),
        };
      }
      case 'joined':
        return null;
      case 'joining':
      default:
        return {
          tone: 'ember' as const,
          label: t('roomSession.joiningLabel'),
          title: t('roomSession.joiningTitle'),
          description: t('roomSession.joiningCopy'),
          roomId: undefined,
          detail: undefined,
          action: undefined,
        };
    }
  }, [gateDetail, joinRejectionMessage, returnToLobby, roomId, roomSessionPhase, t]);

  const showRoomShell = hasJoinedRoom && roomSessionPhase !== 'rejected';
  const showGate =
    gateConfig !== null &&
    (roomSessionPhase !== 'joining' || showJoiningGate);

  return (
    <div className='app-container'>
      <Toast
        open={snackState.open}
        duration={snackState.duration}
        status={snackState.status}
        title={snackState.title}
        message={snackState.message}
        onClose={() => {
          snackStateDispatch({ type: 'toggle' });
        }}
      />
      {showRoomShell ? (
        <>
          {roomUiStatus === RoomUiStatus.gameSetting && (
            <div>
              <Navbar />
              <div className='flex min-h-dvh w-full flex-col items-center justify-start px-3 pb-20 pt-[5.75rem] sm:px-4 sm:pb-24 sm:pt-24 lg:justify-center lg:px-6 lg:pb-20 lg:pt-24'>
                <GameSetting onLeaveRoom={handleLeaveRoom} />
              </div>
            </div>
          )}
          {roomUiStatus === RoomUiStatus.loading && (
            <div className='center-layout'>
              <GameLoading />
            </div>
          )}
          {(roomUiStatus === RoomUiStatus.gameRealStarted ||
            roomUiStatus === RoomUiStatus.gameOverConfirm) && (
            <Game latencyMs={latencyMs} connectionState={connectionState} />
          )}
          <ChatBox
            socket={socketRef.current}
            messages={messages}
            defaultExpanded={
              roomUiStatus === RoomUiStatus.gameSetting ? false : undefined
            }
          />
        </>
      ) : null}

      {showGate && gateConfig ? (
        <RoomSessionGate
          variant={showRoomShell ? 'overlay' : 'page'}
          tone={gateConfig.tone}
          label={gateConfig.label}
          title={gateConfig.title}
          description={gateConfig.description}
          roomId={gateConfig.roomId}
          detail={gateConfig.detail}
          action={gateConfig.action}
        />
      ) : null}
    </div>
  );
}

export default GamingRoom;
