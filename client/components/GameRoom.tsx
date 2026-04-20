import { useState, useEffect, useRef, useMemo } from 'react';
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
  Route,
  Position,
  RoomUiStatus,
  initGameInfo,
} from '@/lib/types';
import Game from '@/components/game/Game';
import { useGame, useGameDispatch } from '@/context/GameContext';
import GameSetting from '@/components/GameSetting';
import GameLoading from '@/components/GameLoading';
import { soundEffects } from '@/lib/sound-effects';

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

function GamingRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const myPlayerIdRef = useRef<string>(''); // fix useEffect don't get newest myPlayerId

  const router = useRouter();
  const roomId = router.query.roomId as string;

  const { t } = useTranslation();

  const {
    room,
    roomUiStatus,
    socketRef,
    myPlayerId,
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

  useEffect(() => {
    let tmp: string | null = localStorage.getItem('username');
    if (!tmp) {
      router.push('/');
    } else {
      setMyUserName(tmp);
      const tmpId = localStorage.getItem('playerId') || '';
      setMyPlayerId(tmpId);
      myPlayerIdRef.current = tmpId;
    }
  }, [setMyPlayerId, setMyUserName, router]);

  useEffect(() => {
    // Game Logic Init
    if (!roomId) return;
    if (!myUserName) return;
    soundEffects.init();

    class AttackQueue {
      public items: Route[];
      public lastItem: Route | undefined;
      public allowAttackThisTurn: boolean;

      constructor() {
        this.items = new Array<Route>();
        this.lastItem = undefined;
        this.allowAttackThisTurn = false;
      }

      insert(item: Route): void {
        debugLog('Item queued: ', item.to.x, item.to.y);
        this.items.push(item);
      }

      clearFromMap(route: Route): void {
        mapQueueDataDispatch({
          type: 'change',
          x: route.from.x,
          y: route.from.y,
          className: '',
        });
      }

      pop(): Route | undefined {
        let item = this.items.shift();
        if (this.lastItem) {
          this.clearFromMap(this.lastItem);
          this.lastItem = undefined;
        }
        this.lastItem = item;
        return item;
      }

      pop_back(): Route | undefined {
        let item = this.items.pop();
        if (item) {
          this.clearFromMap(item);
          return item;
        }
      }

      front(): Route {
        return this.items[0];
      }

      end(): Route {
        return this.items[this.items.length - 1];
      }

      isEmpty(): boolean {
        return this.items.length == 0;
      }

      size(): number {
        return this.items.length;
      }

      clear(): void {
        this.items.forEach((item) => {
          this.clearFromMap(item);
        });
        this.items.length = 0;
        this.clearLastItem();
      }

      clearLastItem(): void {
        if (this.lastItem) {
          this.clearFromMap(this.lastItem);
          this.lastItem = undefined;
        }
      }
    }

    attackQueueRef.current = new AttackQueue();

    // myPlayerId could be null for first connect
    socketRef.current = io(process.env.NEXT_PUBLIC_SERVER_API, {
      query: {
        roomId: roomId,
        username: myUserName,
        myPlayerId: myPlayerIdRef.current,
      },
    });
    let socket = socketRef.current;
    socket.emit('get_room_info');

    // set up socket event listeners
    socket.on('connect', () => {
      debugLog(`socket client connect to server: ${socket.id}`);
    });
    // get player id when first connect
    socket.on('set_player_id', (playerId: string) => {
      debugLog(`set_player_id: ${playerId}`);
      setMyPlayerId(playerId);
      myPlayerIdRef.current = playerId;
      localStorage.setItem('playerId', playerId);
    });
    socket.on('game_started', (initGameInfo: initGameInfo) => {
      debugLog('Game started:', initGameInfo);
      soundEffects.play('gameStart');
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
      // if my player id  equal to room's one of player ,setSpectating from room player
      if (myPlayerIdRef.current && room.players) {
        let player = room.players.find(
          (player) => player.id === myPlayerIdRef.current
        );
        if (player) {
          setTeam(player.team);
          debugLog('set team', player.team);
        }
      }
      roomDispatch({ type: 'update', payload: room });
    });

    socket.on('error', (title: string, message: string) => {
      snackStateDispatch({
        type: 'update',
        title: title,
        message: message,
        duration: 3000,
      });
    });

    socket.on('room_message', (player: UserData | null, content: string) => {
      setMessages((messages: any) => [...messages, new Message(player, content)]);
    });
    socket.on('captured', (player1: UserData, player2: UserData) => {
      if (player2.id !== myPlayerIdRef.current) {
        soundEffects.play('capture');
      }
      setMessages((messages: any) => [
        ...messages,
        new Message(player1, t('captured'), player2),
      ]);
    });
    socket.on('host_modification', (player1: UserData, player2: UserData) => {
      setMessages((messages: any) => [
        ...messages,
        new Message(player1, t('transfer-host-to'), player2),
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
      (from: Position, to: Position, turn: number) => {
        debugLog('attach success: ', from, to, turn);
      }
    );

    socket.on(
      'game_update',
      (
        mapDiff: MapDiffData,
        turnsCount: number,
        leaderBoardData: LeaderBoardTable
      ) => {
        // console.log(`game_update: ${turnsCount}`, new Date().toISOString());
        debugLog(`game_update: ${turnsCount}`);

        attackQueueRef.current.allowAttackThisTurn = true;
        setRoomUiStatus(RoomUiStatus.gameRealStarted);
        mapDataDispatch({ type: 'update', mapDiff });
        setTurnsCount(turnsCount);
        setLeaderBoardData(leaderBoardData);

        if (!attackQueueRef.current.isEmpty()) {
          let item = attackQueueRef.current.pop();
          socket.emit('attack', item.from, item.to, item.half);
          attackQueueRef.current.allowAttackThisTurn = false;
          debugLog(
            `emit attack: `,
            item.from,
            item.to,
            item.half,
            turnsCount
          );
        } else if (attackQueueRef.current.lastItem) {
          attackQueueRef.current.clearLastItem();
        }
      }
    );

    socket.on(
      'attack_failure',
      (from: Position, to: Position, message: string) => {
        debugLog('attack_failure: ', from, to, message);
        attackQueueRef.current.clearLastItem();
        while (!attackQueueRef.current.isEmpty()) {
          let route = attackQueueRef.current.front();
          if (route.from.x === to.x && route.from.y === to.y) {
            attackQueueRef.current.pop();
            to = route.to;
          } else {
            break;
          }
        }
      }
    );

    socket.on('reject_join', (message: string) => {
      snackStateDispatch({
        type: 'update',
        title: t('reject-join'),
        status: 'error',
        message: 'Please choose another room.',
        duration: null,
      });
      // router.push(`/`);
    });

    socket.on('kicked', () => {
      localStorage.removeItem('playerId');
      socket.disconnect();
      snackStateDispatch({
        type: 'update',
        title: t('kicked-title'),
        status: 'warning',
        message: t('kicked-message'),
        duration: 4000,
      });
      router.push('/');
    });

    socket.on('connect_error', (error: Error) => {
      debugLog('\nConnection Failed: ' + error);
      socket.disconnect();

      snackStateDispatch({
        type: 'update',
        title: 'Connect Error',
        status: 'error',
        message: 'Please refresh the App.',
        duration: null,
      });
    });

    socket.on('disconnect', () => {
      debugLog('Disconnected from server.');

      snackStateDispatch({
        type: 'update',
        title: 'Reconnecting...',
        status: 'error',
        message: 'Disconnected from the server',
        duration: null,
      });
    });

    socket.on('reconnect', () => {
      debugLog('Reconnected to server.');
      if (room.gameStarted && myPlayerIdRef.current) {
        socket.emit('reconnect', myPlayerIdRef.current);
      } else {
        socket.emit('get_room_info');
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, myUserName]);

  useEffect(() => {
    if (room.gameStarted && roomUiStatus === RoomUiStatus.gameSetting) {
      setRoomUiStatus(RoomUiStatus.loading);
    }
  }, [room, roomUiStatus, setRoomUiStatus]);

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
      {roomUiStatus === RoomUiStatus.gameSetting && (
        <div>
          <Navbar />
          <div className='flex min-h-dvh w-full flex-col items-center justify-start px-3 pb-16 pt-16 sm:px-4 sm:pb-20 sm:pt-20 lg:px-6 lg:pb-10 lg:pt-10'>
            <GameSetting />
          </div>
        </div>
      )}
      {roomUiStatus === RoomUiStatus.loading && (
        <div className='center-layout'>
          <GameLoading />
        </div>
      )}
      {(roomUiStatus === RoomUiStatus.gameRealStarted ||
        roomUiStatus === RoomUiStatus.gameOverConfirm) && <Game />}
      <ChatBox socket={socketRef.current} messages={messages} />
    </div>
  );
}

export default GamingRoom;
