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
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { mapDataReducer } from '@/context/GameReducer';
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
import MapTile from './MapTile';
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
    mapBasePixelWidth,
    mapBasePixelHeight,
    zoom,
    zoomIn,
    zoomOut,
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
        <div className='menu-container absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-1/2 z-[1004] flex w-[min(96vw,540px)] -translate-x-1/2 flex-col gap-2 px-2.5 py-2 md:bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] md:w-[min(72vw,520px)]'>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              className='bw-button bw-button-secondary grid size-10 min-h-0 place-items-center px-0 disabled:opacity-40'
              disabled={turnsCount === 1}
              onClick={() => changeTurn(turnsCount > 1 ? turnsCount - 1 : 1)}
              title='Previous turn'
              aria-label='Previous turn'
            >
              <SkipBack size={18} strokeWidth={2.5} />
            </button>
            <button
              type='button'
              className='bw-button bw-button-primary size-11 min-h-0 px-0'
              onClick={() => setIsPlay((value) => !value)}
              title={isPlay ? 'Pause replay' : 'Play replay'}
              aria-label={isPlay ? 'Pause replay' : 'Play replay'}
            >
              {isPlay ? (
                <Pause size={18} strokeWidth={2.5} />
              ) : (
                <Play size={18} strokeWidth={2.5} fill='currentColor' />
              )}
            </button>
            <button
              type='button'
              className='bw-button bw-button-secondary grid size-10 min-h-0 place-items-center px-0 disabled:opacity-40'
              disabled={turnsCount === maxTurn}
              onClick={() =>
                changeTurn(turnsCount < maxTurn ? turnsCount + 1 : maxTurn)
              }
              title='Next turn'
              aria-label='Next turn'
            >
              <SkipForward size={18} strokeWidth={2.5} />
            </button>
            <div className='ml-auto flex items-center gap-1.5'>
              <div className='hidden text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 sm:block'>
                {t('turn')}
              </div>
              <div className='rounded-none border border-zinc-700/80 bg-zinc-950/80 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-yellow-300'>
                {turnsCount}/{maxTurn}
              </div>
            </div>
            <button
              type='button'
              className='bw-button bw-button-secondary size-10 min-h-0 px-0'
              onClick={zoomOut}
              title='Zoom out'
              aria-label='Zoom out'
            >
              <ZoomOut size={16} strokeWidth={2.5} />
            </button>
            <button
              type='button'
              className='bw-button bw-button-secondary size-10 min-h-0 px-0'
              onClick={zoomIn}
              title='Zoom in'
              aria-label='Zoom in'
            >
              <ZoomIn size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className='space-y-1.5'>
            <input
              type='range'
              min={1}
              step={1}
              max={maxTurn}
              value={turnsCount}
              onChange={(event) => changeTurn(Number(event.target.value))}
              className='h-1.5 w-full cursor-pointer appearance-none bg-zinc-800 accent-yellow-300'
            />
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500'>
                {t('game-speed')}
              </div>
              <div className='flex flex-wrap justify-end gap-1.5'>
                {ReplaySpeedOptions.map((value) => (
                  <button
                    key={value}
                    type='button'
                    className={`bw-button min-h-8 px-2.5 text-[11px] tracking-[0.14em] ${
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
        <ChatBox socket={null} messages={messages} defaultExpanded={false} />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
            width: mapBasePixelHeight,
            height: mapBasePixelWidth,
          }}
        >
          <div
            ref={mapRef}
            tabIndex={0}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              willChange: 'transform',
              contain: 'layout paint style',
              outline: 'none',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {limitedView.map((tiles: TileProp[], x: number) => {
              return tiles.map((tile: TileProp, y: number) => {
                return (
                  <MapTile
                    key={`${x}/${y}`}
                    size={tileSize}
                    x={x}
                    y={y}
                    tile={tile}
                    isOwned={false}
                    _className=''
                    tileHalf={false}
                    isSelected={false}
                    isNextPossibleMove={false}
                    isBlockedMoveTarget={false}
                    showMyKingHighlight={false}
                    warringStatesMode={false}
                  />
                );
              });
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
