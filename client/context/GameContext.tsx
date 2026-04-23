import {
  LeaderBoardTable,
  MapData,
  MapQueueData,
  Position,
  Room,
  RoomUiStatus,
  SelectedMapTileInfo,
  SnackState,
  TileProp,
  TileType,
  UserData,
  initGameInfo
} from '@/lib/types';
import React, {
  MutableRefObject,
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  mapDataReducer,
  mapQueueDataReducer,
  roomReducer,
  snackStateReducer,
} from './GameReducer';
import usePossibleNextMapPositions from '@/lib/use-possible-next-map-positions';
import { useTranslation } from 'next-i18next';

// userData, game_status, replay_link
type DialogContentData = [[UserData | null], string, string | null];

interface GameContext {
  room: Room;
  socketRef: any;
  mapData: MapData;
  mapQueueData: MapQueueData;
  roomUiStatus: RoomUiStatus;
  myPlayerId: string;
  myUserName: string;
  isSurrendered: boolean;
  team: number;
  turnsCount: number;
  leaderBoardData: LeaderBoardTable | null;
  dialogContent: DialogContentData;
  openOverDialog: boolean;
  snackState: SnackState;
  attackQueueRef: any; // AttackQueue
  selectedMapTileInfo: SelectedMapTileInfo;
  initGameInfo: initGameInfo | null;
}

interface GameDispatch {
  roomDispatch: React.Dispatch<any>;
  mapDataDispatch: React.Dispatch<any>;
  mapQueueDataDispatch: React.Dispatch<any>;
  setRoomUiStatus: React.Dispatch<React.SetStateAction<RoomUiStatus>>;
  setMyPlayerId: React.Dispatch<React.SetStateAction<string>>;
  setMyUserName: React.Dispatch<React.SetStateAction<string>>;
  setIsSurrendered: React.Dispatch<React.SetStateAction<boolean>>;
  setTeam: React.Dispatch<React.SetStateAction<number>>;
  setTurnsCount: React.Dispatch<React.SetStateAction<number>>;
  setLeaderBoardData: React.Dispatch<any>;
  setDialogContent: React.Dispatch<React.SetStateAction<DialogContentData>>;
  setOpenOverDialog: React.Dispatch<React.SetStateAction<boolean>>;
  snackStateDispatch: React.Dispatch<any>;
  setSelectedMapTileInfo: React.Dispatch<
    React.SetStateAction<SelectedMapTileInfo>
  >;
  setInitGameInfo: React.Dispatch<any>;
  attackUp: (info: SelectedMapTileInfo) => void
  attackDown: (info: SelectedMapTileInfo) => void
  attackLeft: (info: SelectedMapTileInfo) => void
  attackRight: (info: SelectedMapTileInfo) => void
  handlePositionChange: (selectPos: SelectedMapTileInfo, newPoint: Position, className: string) => void
  testIfNextPossibleMove: (tileType: TileType, x: number, y: number) => boolean
  testIfBlockedAdjacentMove: (tileType: TileType, x: number, y: number) => boolean
  handleClick: (tile: TileProp, x: number, y: number, myPlayerIndex: number) => void
  halfArmy: (touchHalf: MutableRefObject<boolean>) => void
  clearQueue: () => void
  popQueue: () => void
  selectGeneral: () => void
}

const GameContext = createContext<GameContext | undefined>(undefined);
const GameDispatch = createContext<GameDispatch | undefined>(undefined);

interface GameProviderProp {
  children: React.ReactNode;
}

const GameProvider: React.FC<GameProviderProp> = ({ children }) => {
  const { t } = useTranslation();
  const [room, roomDispatch] = useReducer(roomReducer, new Room(''));
  const [mapData, mapDataDispatch] = useReducer(mapDataReducer, [[]]);
  const [mapQueueData, mapQueueDataDispatch] = useReducer(
    mapQueueDataReducer,
    []
  );
  const socketRef = useRef<any>();
  const attackQueueRef = useRef<any>();
  const blockedMoveFeedbackRef = useRef<{
    tileType: TileType | null;
    timestamp: number;
  }>({
    tileType: null,
    timestamp: 0,
  });
  const [roomUiStatus, setRoomUiStatus] = useState(RoomUiStatus.gameSetting);
  const [snackState, snackStateDispatch] = useReducer(snackStateReducer, {
    open: false,
    title: '',
    message: '',
    status: 'error',
    duration: 3000,
  });
  const [myPlayerId, setMyPlayerId] = useState('');
  const [myUserName, setMyUserName] = useState('');
  const [isSurrendered, setIsSurrendered] = useState<boolean>(false);
  const [team, setTeam] = useState<number>(0);
  const [initGameInfo, setInitGameInfo] = useState<initGameInfo | null>(null);
  const [turnsCount, setTurnsCount] = useState(0);
  const [leaderBoardData, setLeaderBoardData] = useState(null);
  const [dialogContent, setDialogContent] = useState<DialogContentData>([
    [null],
    '',
    null,
  ]);
  const [openOverDialog, setOpenOverDialog] = useState(false);
  const [selectedMapTileInfo, setSelectedMapTileInfo] =
    useState<SelectedMapTileInfo>({
      x: -1,
      y: -1,
      half: false,
      unitsCount: 0,
    });

  const halfArmy = useCallback((touchHalf: MutableRefObject<boolean>) => {
    if (selectedMapTileInfo) {
      let selectPos = selectedMapTileInfo;
      if (selectPos.x === -1 || selectPos.y === -1) return;
      touchHalf.current = !touchHalf.current; // todo: potential bug
      setSelectedMapTileInfo({
        x: selectPos.x,
        y: selectPos.y,
        half: touchHalf.current,
        unitsCount: 0,
      });
      mapQueueDataDispatch({
        type: 'change',
        x: selectPos.x,
        y: selectPos.y,
        className: '',
        half: touchHalf.current,
      });
    }
  }, [mapQueueDataDispatch, selectedMapTileInfo, setSelectedMapTileInfo]);

  const selectGeneral = useCallback(() => {
    if (initGameInfo && selectedMapTileInfo) {
      const { king } = initGameInfo;
      setSelectedMapTileInfo({ ...selectedMapTileInfo, x: king.x, y: king.y });
    }
  }, [initGameInfo, selectedMapTileInfo, setSelectedMapTileInfo]);

  const popQueue = useCallback(() => {
    if (selectedMapTileInfo) {
      let route = attackQueueRef.current.pop_back();
      if (route) {
        setSelectedMapTileInfo({
          ...selectedMapTileInfo,
          x: route.from.x,
          y: route.from.y,
          //  todo: fix half/unitsCount logic
        });
      }
    }
  }, [attackQueueRef, selectedMapTileInfo, setSelectedMapTileInfo]);
  const clearQueue = useCallback(() => {
    if (selectedMapTileInfo) {
      const route = attackQueueRef.current.firstPendingRoute();
      if (!route || !attackQueueRef.current.hasPending()) {
        return;
      }

      attackQueueRef.current.clear();
      socketRef.current?.emit('clear_attack_queue');
      setSelectedMapTileInfo({
        ...selectedMapTileInfo,
        x: route.from.x,
        y: route.from.y,
      });
    }
  }, [attackQueueRef, selectedMapTileInfo, setSelectedMapTileInfo, socketRef]);

  const possibleNextMapPositions = usePossibleNextMapPositions({
    width: initGameInfo ? initGameInfo.mapHeight : room.map ? room.map.width : 0,
    height: initGameInfo ? initGameInfo.mapWidth : room.map ? room.map.height : 0,
    selectedMapTileInfo: selectedMapTileInfo
      ? { x: selectedMapTileInfo.x, y: selectedMapTileInfo.y }
      : undefined,
  });

  const isBlockedTileType = useCallback(
    (tileType: TileType) =>
      tileType === TileType.Mountain || tileType === TileType.Obstacle,
    []
  );

  const isNextPossibleMapPosition = useCallback(
    (point: Position) => {
      return Object.values(possibleNextMapPositions).some((p) => {
        return p && p.x === point.x && p.y === point.y;
      });
    },
    [possibleNextMapPositions]
  );

  const showBlockedMoveFeedback = useCallback(
    (tileType: TileType) => {
      const now = Date.now();
      const { tileType: previousTileType, timestamp } =
        blockedMoveFeedbackRef.current;
      const feedbackDuration =
        tileType === TileType.Mountain ? 1000 : 900;
      const feedbackCooldown =
        tileType === TileType.Mountain ? feedbackDuration : 4000;

      if (previousTileType === tileType && now - timestamp < feedbackCooldown) {
        return;
      }

      blockedMoveFeedbackRef.current = {
        tileType,
        timestamp: now,
      };

      snackStateDispatch({
        type: 'update',
        title: '',
        status: 'info',
        message:
          tileType === TileType.Mountain
            ? t('mountain-blocked')
            : t('movement-blocked'),
        duration: feedbackDuration,
      });
    },
    [snackStateDispatch, t]
  );

  const testIfNextPossibleMove = useCallback(
    (tileType: TileType, x: number, y: number) => {
      return (
        isNextPossibleMapPosition({ x, y }) && !isBlockedTileType(tileType)
      );
    },
    [isBlockedTileType, isNextPossibleMapPosition]
  );

  const testIfBlockedAdjacentMove = useCallback(
    (tileType: TileType, x: number, y: number) => {
      return (
        isNextPossibleMapPosition({ x, y }) && isBlockedTileType(tileType)
      );
    },
    [isBlockedTileType, isNextPossibleMapPosition]
  );

  const withinMap = useCallback(
    (point: Position) => {
      if (!initGameInfo) return false;
      return (
        0 <= point.x &&
        point.x < initGameInfo.mapWidth &&
        0 <= point.y &&
        point.y < initGameInfo.mapHeight
      );
    },
    [initGameInfo]
  );

  const flushAttackQueueToServer = useCallback(() => {
    const socket = socketRef.current;
    const queue = attackQueueRef.current;
    if (!socket?.connected || !queue) {
      return;
    }

    while (!queue.isEmpty()) {
      const item = queue.pop();
      if (!item) {
        break;
      }
      socket.emit('attack', item.from, item.to, item.half, item.requestId);
    }
  }, [attackQueueRef, socketRef]);

  const handlePositionChange = useCallback(
    (selectPos: SelectedMapTileInfo, newPoint: Position, className: string) => {
      if (!withinMap(newPoint)) {
        return;
      }

      if (!isNextPossibleMapPosition(newPoint)) {
        return;
      }

      const nextTile = mapData[newPoint.x]?.[newPoint.y];
      const nextTileType = nextTile?.[0];

      if (nextTileType !== undefined && isBlockedTileType(nextTileType)) {
        showBlockedMoveFeedback(nextTileType);
        return;
      }

      attackQueueRef.current.insert({
        from: selectPos,
        to: newPoint,
        half: selectPos.half,
      });
      setSelectedMapTileInfo({
        x: newPoint.x,
        y: newPoint.y,
        half: false,
        unitsCount: 0,
      });
      mapQueueDataDispatch({
        type: 'change',
        x: selectPos.x,
        y: selectPos.y,
        className: className,
      });
      flushAttackQueueToServer();
    },
    [
      withinMap,
      isNextPossibleMapPosition,
      mapData,
      attackQueueRef,
      mapQueueDataDispatch,
      setSelectedMapTileInfo,
      isBlockedTileType,
      showBlockedMoveFeedback,
      flushAttackQueueToServer,
    ]
  );

  const handleClick = useCallback((tile: TileProp, x: number, y: number, myPlayerIndex: number) => {
    const [tileType, color, unitsCount] = tile;
    const isOwned = color === room.players[myPlayerIndex].color;

    let tileHalf = false;

    if (selectedMapTileInfo.x === x && selectedMapTileInfo.y === y) {
      tileHalf = selectedMapTileInfo.half;
    } else if (mapQueueData.length !== 0 && mapQueueData[x][y].half) {
      tileHalf = true;
    } else {
      tileHalf = false;
    }

    const isAdjacentMove = isNextPossibleMapPosition({ x, y });
    const isNextPossibleMove = isAdjacentMove && !isBlockedTileType(tileType);

    const getPossibleMoveDirection = () => {
      if (isNextPossibleMove) {
        const { bottom, left, right } = possibleNextMapPositions;
        if (bottom && bottom.x === x && bottom.y === y) return 'down';
        if (left && left.x === x && left.y === y) return 'left';
        if (right && right.x === x && right.y === y) return 'right';
        return 'up';
      }
      return '';
    };
    const moveDirection = getPossibleMoveDirection();

    if (isNextPossibleMove) {
      handlePositionChange(selectedMapTileInfo, { x, y }, `queue_${moveDirection}`);
    } else if (isAdjacentMove && isBlockedTileType(tileType)) {
      showBlockedMoveFeedback(tileType);
    } else if (isOwned) {
      if (selectedMapTileInfo.x === x && selectedMapTileInfo.y === y) {
        setSelectedMapTileInfo({
          x,
          y,
          half: !tileHalf,
          unitsCount: unitsCount,
        });
      } else {
        setSelectedMapTileInfo({ x, y, half: false, unitsCount: unitsCount });
      }
    } else {
      setSelectedMapTileInfo({ x: -1, y: -1, half: false, unitsCount: 0 });
      mapQueueDataDispatch({
        type: 'change',
        x: x,
        y: y,
        className: '',
        half: false,
      });
    }
  }, [room.players, selectedMapTileInfo, mapQueueData, possibleNextMapPositions, isNextPossibleMapPosition, isBlockedTileType, handlePositionChange, showBlockedMoveFeedback, setSelectedMapTileInfo, mapQueueDataDispatch]);

  const attackUp = useCallback((selectPos?: SelectedMapTileInfo) => {
    if (selectPos) {
      let newPoint = {
        x: selectPos.x - 1,
        y: selectPos.y,
      };
      handlePositionChange(selectPos, newPoint, 'queue_up');
    }
  }, [handlePositionChange]);
  const attackDown = useCallback((selectPos?: SelectedMapTileInfo) => {
    if (selectPos) {
      let newPoint = {
        x: selectPos.x + 1,
        y: selectPos.y,
      };
      handlePositionChange(selectPos, newPoint, 'queue_down');
    }
  }, [handlePositionChange]);
  const attackLeft = useCallback((selectPos?: SelectedMapTileInfo) => {
    if (selectPos) {
      let newPoint = {
        x: selectPos.x,
        y: selectPos.y - 1,
      };
      handlePositionChange(selectPos, newPoint, 'queue_left');
    }
  }, [handlePositionChange])
  const attackRight = useCallback((selectPos?: SelectedMapTileInfo) => {
    if (selectPos) {
      let newPoint = {
        x: selectPos.x,
        y: selectPos.y + 1,
      };
      handlePositionChange(selectPos, newPoint, 'queue_right');
    }
  }, [handlePositionChange]);


  return (
    <GameContext.Provider
      value={{
        room,
        socketRef,
        mapData,
        mapQueueData,
        roomUiStatus,
        myPlayerId,
        myUserName,
        isSurrendered,
        team,
        turnsCount,
        leaderBoardData,
        dialogContent,
        openOverDialog,
        snackState,
        attackQueueRef,
        selectedMapTileInfo,
        initGameInfo,
      }}
    >
      <GameDispatch.Provider
        value={{
          roomDispatch,
          mapDataDispatch,
          mapQueueDataDispatch,
          setRoomUiStatus,
          setMyPlayerId,
          setMyUserName,
          setIsSurrendered,
          setTeam,
          setTurnsCount,
          setLeaderBoardData,
          setDialogContent,
          setOpenOverDialog,
          snackStateDispatch,
          setSelectedMapTileInfo,
          setInitGameInfo,
          attackUp,
          attackDown,
          attackLeft,
          attackRight,
          handlePositionChange,
          testIfNextPossibleMove,
          testIfBlockedAdjacentMove,
          handleClick,
          halfArmy,
          clearQueue,
          popQueue,
          selectGeneral
        }}
      >
        {children}
      </GameDispatch.Provider>
    </GameContext.Provider>
  );
};

const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

const useGameDispatch = () => {
  const context = useContext(GameDispatch);
  if (context === undefined) {
    throw new Error('useGameDispatch must be used within a GameProvider');
  }
  return context;
};

export { GameProvider, useGame, useGameDispatch };
