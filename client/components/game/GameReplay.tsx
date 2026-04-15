import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useReducer,
} from 'react';
import { useRouter } from 'next/router';

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { mapDataReducer } from '@/context/GameReducer';
import CustomMapTile from '@/components/game/CustomMapTile';
import { ReplaySpeedOptions } from '@/lib/constants';
import {
  LeaderBoardTable,
  Message,
  UserData,
  TileProp,
  TileType,
} from '@/lib/types';
import TurnsCount from './TurnsCount';
import LeaderBoard from './LeaderBoard';
import { useTranslation } from 'next-i18next';
import GameLoading from '@/components/GameLoading';
import GameRecord from '@/lib/game-record';
import ChatBox from '@/components/ChatBox';
import useMap from '@/hooks/useMap';

export default function GameReplay() {
  const [gameRecord, setGameRecord] = useState<GameRecord | null>(null);
  const [mapWidth, setMapWidth] = useState(10);
  const [mapHeight, setMapHeight] = useState(10);
  const [playSpeed, setPlaySpeed] = useState(4);
  const [turnsCount, setTurnsCount] = useState(1);
  const [maxTurn, setMaxTurn] = useState(1);
  const [leaderBoardData, setLeaderBoardData] =
    useState<LeaderBoardTable | null>(null);
  const [isPlay, setIsPlay] = useState(false);
  const [mapData, mapDataDispatch] = useReducer(mapDataReducer, [[]]);
  const [limitedView, setLimitedView] = useState<TileProp[][]>([[]]);
  const [checkedPlayers, setCheckedPlayers] = useState<UserData[]>([]);
  const { t } = useTranslation();
  const [notFoundError, setNotFoundError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const intervalId = useRef<any>(undefined);

  const {
    tileSize,
    position,
    mapRef,
    mapPixelWidth,
    mapPixelHeight,
    zoom,
    handleZoomOption,
  } = useMap({ mapWidth, mapHeight });

  const router = useRouter();
  const replayId = router.query.replayId as string;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      handleZoomOption(event.key);
      switch (event.key) {
        case ' ':
          setIsPlay((value) => !value);
          break;
        default:
          break;
      }
    },
    [handleZoomOption]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    async function fetchReplayData() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_API}/get_replay/${replayId}`
        );
        if (response.status === 404) {
          throw new Error('Replay not found');
        }
        const gameRecordValue = (await response.json()) as GameRecord;
        setGameRecord(gameRecordValue);
        setMapHeight(gameRecordValue.mapHeight);
        setMapWidth(gameRecordValue.mapWidth);
        setMaxTurn(gameRecordValue.gameRecordTurns.length);

        mapDataDispatch({
          type: 'init',
          mapWidth: gameRecordValue.mapWidth,
          mapHeight: gameRecordValue.mapHeight,
        });

        const { data, lead } = gameRecordValue.gameRecordTurns[0];
        mapDataDispatch({ type: 'update', mapDiff: data });
        setLeaderBoardData(lead);
      } catch (error) {
        console.error(error);
        setNotFoundError('Replay not found');
      }
    }

    fetchReplayData();
  }, [replayId]);

  useEffect(() => {
    if (gameRecord) {
      let tmpTurn = turnsCount || 1;

      const updateTurn = () => {
        if (tmpTurn > gameRecord.gameRecordTurns.length) {
          clearInterval(intervalId.current);
          setIsPlay(false);
          return;
        }
        const { data, lead } = gameRecord.gameRecordTurns[tmpTurn - 1];
        mapDataDispatch({ type: 'update', mapDiff: data });
        setLeaderBoardData(lead);
        setTurnsCount(tmpTurn);
        setMessages(
          gameRecord.messagesRecord.filter((message) => {
            if (message.turn) return message.turn <= tmpTurn;
            return true;
          })
        );

        tmpTurn++;
      };
      if (isPlay) {
        intervalId.current = setInterval(updateTurn, 500 / playSpeed);
      } else {
        clearInterval(intervalId.current);
      }
    }
  }, [gameRecord, isPlay, playSpeed]);

  useEffect(() => {
    if (checkedPlayers && checkedPlayers.length > 0) {
      const directions = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [0, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ];
      const colors = checkedPlayers.map((player) => player.color);
      const nextLimitedView = Array.from(Array(mapWidth), () =>
        Array(mapHeight).fill([TileType.Fog, null, null])
      );
      for (let i = 0; i < mapWidth; ++i) {
        for (let j = 0; j < mapHeight; ++j) {
          if (
            mapData[i][j][0] === TileType.City ||
            mapData[i][j][0] === TileType.Mountain
          ) {
            nextLimitedView[i][j] = [TileType.Obstacle, null, null];
          }
        }
      }
      for (let i = 0; i < mapWidth; ++i) {
        for (let j = 0; j < mapHeight; ++j) {
          if (mapData[i][j][1] && colors.includes(mapData[i][j][1] as number)) {
            for (const dir of directions) {
              const newX = i + dir[0];
              const newY = j + dir[1];
              if (newX < 0 || newX >= mapWidth) continue;
              if (newY < 0 || newY >= mapHeight) continue;
              nextLimitedView[newX][newY] = mapData[newX][newY];
            }
          }
        }
      }
      setLimitedView(nextLimitedView);
    } else {
      setLimitedView(mapData);
    }
  }, [mapData, checkedPlayers, mapWidth, mapHeight]);

  const changeTurn = (currentTurn: number) => {
    if (gameRecord) {
      if (currentTurn >= maxTurn) currentTurn = maxTurn;

      setIsPlay(false);
      clearInterval(intervalId.current);

      setTurnsCount(currentTurn);

      setMessages(
        gameRecord.messagesRecord.filter((message) => {
          if (message.turn) return message.turn <= currentTurn;
          return true;
        })
      );

      mapDataDispatch({
        type: 'jump-to-turn',
        gameRecordTurns: gameRecord.gameRecordTurns,
        jumpToTurn: currentTurn - 1,
      });

      const { lead } = gameRecord.gameRecordTurns[currentTurn - 1];
      setLeaderBoardData(lead);
    }
  };

  if (notFoundError) {
    return (
      <div className='center-layout'>
        <div className='bw-panel-hard px-6 py-5'>
          <h1 className='bw-title text-3xl'>{t('Replay not found')}</h1>
        </div>
      </div>
    );
  }

  if (!gameRecord) {
    return (
      <div className='center-layout'>
        <GameLoading />
      </div>
    );
  }

  return (
    <div className='app-container'>
      <div className='Game'>
        <div className='menu-container absolute bottom-[5px] left-1/2 z-[1002] flex w-[min(92vw,520px)] -translate-x-1/2 flex-col gap-3 px-4 py-3 md:bottom-5'>
          <div className='flex items-center justify-between gap-2'>
            <button
              type='button'
              className='grid size-11 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-50 disabled:opacity-40'
              disabled={turnsCount === 1}
              onClick={() => changeTurn(turnsCount > 1 ? turnsCount - 1 : 1)}
            >
              <SkipBack size={18} strokeWidth={2.5} />
            </button>
            <button
              type='button'
              className='grid size-12 place-items-center border border-zinc-100 bg-zinc-100 text-zinc-950 shadow-[4px_4px_0_#000]'
              onClick={() => setIsPlay((value) => !value)}
            >
              {isPlay ? (
                <Pause size={18} strokeWidth={2.5} />
              ) : (
                <Play size={18} strokeWidth={2.5} />
              )}
            </button>
            <button
              type='button'
              className='grid size-11 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-50 disabled:opacity-40'
              disabled={turnsCount === maxTurn}
              onClick={() =>
                changeTurn(turnsCount < maxTurn ? turnsCount + 1 : maxTurn)
              }
            >
              <SkipForward size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500'>
              <span>Turn</span>
              <span className='text-yellow-300'>
                {turnsCount}/{maxTurn}
              </span>
            </div>
            <input
              type='range'
              min={1}
              step={1}
              max={maxTurn}
              value={turnsCount}
              onChange={(event) => changeTurn(Number(event.target.value))}
              className='h-2 w-full cursor-pointer appearance-none bg-zinc-800 accent-yellow-300'
            />
          </div>

          <div className='flex flex-wrap justify-center gap-2'>
            {ReplaySpeedOptions.map((value) => (
              <button
                key={value}
                type='button'
                className={`bw-button min-h-10 px-3 text-xs ${
                  playSpeed === value ? 'bw-button-primary' : 'bw-button-secondary'
                }`}
                onClick={() => {
                  setIsPlay(false);
                  setPlaySpeed(value);
                }}
              >
                {`${value}x`}
              </button>
            ))}
          </div>
        </div>

        <TurnsCount
          count={turnsCount}
          handleReturnClick={() => {
            router.push('/');
          }}
        />

        <LeaderBoard
          leaderBoardTable={leaderBoardData}
          players={gameRecord.players}
          checkedPlayers={checkedPlayers}
          setCheckedPlayers={setCheckedPlayers}
        />
        <ChatBox socket={null} messages={messages} />
        <div
          ref={mapRef}
          tabIndex={0}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
            width: mapPixelHeight,
            height: mapPixelWidth,
          }}
        >
          {limitedView.map((tiles, x) => {
            return tiles.map((tile, y) => {
              return (
                <CustomMapTile
                  key={`${x}/${y}`}
                  zoom={zoom}
                  size={tileSize}
                  x={x}
                  y={y}
                  tile={[...tile, false, 0]}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
