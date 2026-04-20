import { useGame, useGameDispatch } from '@/context/GameContext';
import useMap from '@/hooks/useMap';
import { Position, SelectedMapTileInfo, TileProp, TileType } from '@/lib/types';
import usePossibleNextMapPositions from '@/lib/use-possible-next-map-positions';
import { getPlayerIndex } from '@/lib/utils';
import useMediaQuery from '@/hooks/useMediaQuery';
import { useTranslation } from 'next-i18next';
import {
  MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Home,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import MapTile from './MapTile';

const myKingStartHighlightDurationMs = 4500;

function MapControlButton({
  title,
  onClick,
  children,
  className = '',
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type='button'
      className={`attack-button grid size-10 place-items-center ${className}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function GameMap() {
  const {
    attackQueueRef,
    socketRef,
    room,
    mapData,
    myPlayerId,
    mapQueueData,
    selectedMapTileInfo,
    initGameInfo,
    turnsCount,
  } = useGame();

  const { t } = useTranslation();

  const isSmallScreen = useMediaQuery('(max-width:600px)');

  const touchAttacking = useRef(false);
  const lastTouchPosition = useRef({ x: -1, y: -1 });

  const touchDragging = useRef(false);
  const touchStartPosition = useRef({ x: 0, y: 0 });
  const initialDistance = useRef(0);
  const lastTouchTime = useRef(0);
  const touchHalf = useRef(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showMyKingStartHighlight, setShowMyKingStartHighlight] = useState(false);

  const toggleDirections = () => {
    setShowDirections(!showDirections);
  };

  const { setSelectedMapTileInfo, halfArmy, clearQueue, popQueue, selectGeneral,

    handlePositionChange, testIfNextPossibleMove,
    handleClick,
    attackUp, attackDown, attackLeft, attackRight } = useGameDispatch();

  const {
    tileSize,
    position,
    mapRef,
    mapBasePixelWidth,
    mapBasePixelHeight,
    mapPixelWidth,
    mapPixelHeight,
    zoom,
    setZoom,
    handleZoomOption,
    setPosition,
  } = useMap({
    mapWidth: initGameInfo ? initGameInfo.mapWidth : 0,
    mapHeight: initGameInfo ? initGameInfo.mapHeight : 0,
    listenTouch: false, // implement touch later
  });

  const centerGeneral = useCallback(() => {
    if (initGameInfo) {
      const { king } = initGameInfo;
      const pixel_x = Math.floor(mapPixelWidth / 2 - king.x * zoom * tileSize);
      const pixel_y = Math.floor(mapPixelHeight / 2 - king.y * zoom * tileSize);
      setPosition({ x: pixel_y, y: pixel_x });
    }
  }, [
    initGameInfo,
    mapPixelHeight,
    mapPixelWidth,
    zoom,
    tileSize,
    setPosition,
  ]);

  // useEffect(() => {
  //   if (isSmallScreen) {
  //     centerGeneral();
  //   }
  // }, [isSmallScreen, centerGeneral]);

  useEffect(() => {
    if (!initGameInfo || !room.gameStarted) {
      setShowMyKingStartHighlight(false);
      return;
    }

    setShowMyKingStartHighlight(true);
    const timeoutId = window.setTimeout(() => {
      setShowMyKingStartHighlight(false);
    }, myKingStartHighlightDurationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initGameInfo, room.gameStarted]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      handleZoomOption(event.key);
      switch (event.key) {
        case 'z':
          halfArmy(touchHalf);
          break;
        case 'e':
          popQueue();
          break;
        case 'q':
          clearQueue();
          break;
        case 'g':
          event.preventDefault();
          selectGeneral();
          centerGeneral();
          break;
        case 'c':
          setPosition({ x: 0, y: 0 });
          break;
        case 'h': // home
          centerGeneral();
          break;
        case 'a':
        case 'ArrowLeft': // 37 Left
          event.preventDefault();
          attackLeft(selectedMapTileInfo);
          break;
        case 'w':
        case 'ArrowUp': // 38 Up
          event.preventDefault();
          attackUp(selectedMapTileInfo);
          break;
        case 'd':
        case 'ArrowRight': // 39 Right
          event.preventDefault();
          attackRight(selectedMapTileInfo);
          break;
        case 's':
        case 'ArrowDown': // 40 Down
          event.preventDefault();
          attackDown(selectedMapTileInfo);
          break;
      }
    },
    [attackDown, attackLeft, attackRight, attackUp, centerGeneral, clearQueue, halfArmy, handleZoomOption, popQueue, selectGeneral, selectedMapTileInfo, setPosition]
  );

  const myPlayerIndex = useMemo(() => {
    return getPlayerIndex(room, myPlayerId);
  }, [room, myPlayerId]);
  const myPlayerColor =
    myPlayerIndex >= 0 ? room.players[myPlayerIndex]?.color ?? null : null;

  const queueEmpty = mapQueueData.length === 0;

  const displayMapData = useMemo(() => {
    return mapData.map((tiles, x) => {
      return tiles.map((tile, y) => {
        const [, color] = tile;
        const queueItem = queueEmpty ? undefined : mapQueueData[x]?.[y];
        const isOwned = myPlayerColor !== null && color === myPlayerColor;
        const isMyKing = isOwned && tile[0] === TileType.King;
        const isSelected =
          !!selectedMapTileInfo &&
          x === selectedMapTileInfo.x &&
          y === selectedMapTileInfo.y;
        const tileHalf = isSelected
          ? selectedMapTileInfo.half
          : !!queueItem?.half;

        return {
          tile,
          isOwned,
          _className: queueItem?.className ?? '',
          tileHalf,
          isSelected,
          showMyKingHighlight: isMyKing && showMyKingStartHighlight,
          isNextPossibleMove: testIfNextPossibleMove(tile[0], x, y),
        };
      });
    });
  }, [
    mapData,
    mapQueueData,
    myPlayerColor,
    queueEmpty,
    selectedMapTileInfo,
    showMyKingStartHighlight,
    testIfNextPossibleMove,
  ]);

  const handleMapClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (myPlayerIndex < 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scaledTileSize = tileSize * zoom;
    if (scaledTileSize <= 0) return;

    const y = Math.floor((event.clientX - rect.left) / scaledTileSize);
    const x = Math.floor((event.clientY - rect.top) / scaledTileSize);
    const tile = mapData[x]?.[y];
    if (!tile) return;

    handleClick(tile, x, y, myPlayerIndex);
  }, [handleClick, mapData, myPlayerIndex, tileSize, zoom]);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1) {
        // touch drag or touch attack
        if (mapRef.current) {
          const touch = event.touches[0];
          const rect = mapRef.current.getBoundingClientRect();
          const y = Math.floor((touch.clientX - rect.left) / (tileSize * zoom));
          const x = Math.floor((touch.clientY - rect.top) / (tileSize * zoom));
          const tile = mapData[x]?.[y];
          if (!tile) return;
          const [tileType, color] = tile;
          const isOwned = myPlayerColor !== null && color === myPlayerColor;
          const currentTime = new Date().getTime();
          if (!isOwned) {
            touchDragging.current = true;
            touchStartPosition.current = {
              x: event.touches[0].clientX - position.x,
              y: event.touches[0].clientY - position.y,
            };
            // console.log('touch drag at ', x, y);
          } else {
            touchAttacking.current = true;
            if (
              lastTouchPosition.current.x === x &&
              lastTouchPosition.current.y === y &&
              currentTime - lastTouchTime.current <= 400 // quick double touch 400ms
            ) {
              touchHalf.current = !touchHalf.current;
            }
            setSelectedMapTileInfo({
              x,
              y,
              half: touchHalf.current,
              unitsCount: 0,
            });
            lastTouchPosition.current = { x, y };
            lastTouchTime.current = currentTime;
          }
        }
      } else if (event.touches.length === 2) {
        touchAttacking.current = false;
        touchDragging.current = false;
        // zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch1.clientX - touch2.clientX, 2) +
          Math.pow(touch1.clientY - touch2.clientY, 2)
        );
        initialDistance.current = distance;
      }
    },
    [mapRef, tileSize, zoom, mapData, myPlayerColor, position.x, position.y, setSelectedMapTileInfo]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1) {
        if (touchDragging.current) {
          const updatePosition = () => {
            setPosition({
              x: event.touches[0].clientX - touchStartPosition.current.x,
              y: event.touches[0].clientY - touchStartPosition.current.y,
            });
          };
          requestAnimationFrame(updatePosition);
        }

        if (touchAttacking.current && mapRef.current) {
          const touch = event.touches[0];
          const rect = mapRef.current.getBoundingClientRect();
          const y = Math.floor((touch.clientX - rect.left) / (tileSize * zoom));
          const x = Math.floor((touch.clientY - rect.top) / (tileSize * zoom));

          const dx = x - selectedMapTileInfo.x;
          const dy = y - selectedMapTileInfo.y;
          // check if newPosition is valid
          if (
            (dx === 0 && dy === 0) ||
            (x === lastTouchPosition.current.x &&
              y === lastTouchPosition.current.y)
          ) {
            return;
          }
          if (!mapData) return;
          if (mapData.length === 0) return;
          const tile = mapData[x]?.[y];
          if (!tile) return;
          const [tileType] = tile;
          // check tileType
          if (
            tileType === TileType.Mountain ||
            tileType === TileType.Obstacle
          ) {
            return;
          }
          // check neighbor
          let direction = '';
          if (dy === 1 && dx === 0) {
            direction = 'right';
          } else if (dy === -1 && dx === 0) {
            direction = 'left';
          } else if (dy === 0 && dx === 1) {
            direction = 'down';
          } else if (dy === 0 && dx === -1) {
            direction = 'up';
          } else {
            // Ignore diagonal or skipped tiles and wait for the next valid adjacent move.
            return;
          }
          // console.log('valid touch move attack', x, y, className);
          touchHalf.current = false;
          const newPoint = { x, y };
          handlePositionChange(selectedMapTileInfo, newPoint, `queue_${direction}`);
          lastTouchPosition.current = newPoint;
        }
      } else if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch1.clientX - touch2.clientX, 2) +
          Math.pow(touch1.clientY - touch2.clientY, 2)
        );
        const delta = distance - initialDistance.current;
        initialDistance.current = distance;
        setZoom((currentZoom: number) =>
          Math.min(Math.max(currentZoom + delta * 0.0002, 0.2), 4.0)
        );
      }
    },
    [mapRef, setPosition, tileSize, zoom, selectedMapTileInfo, mapData, handlePositionChange, setZoom]
  );

  const handleTouchEnd = useCallback(() => {
    touchAttacking.current = false;
    touchDragging.current = false;
    initialDistance.current = 0;
  }, []);

  useEffect(() => {
    const mapNode = mapRef.current;
    if (mapNode) {
      mapNode.addEventListener('keydown', handleKeyDown);
      return () => {
        mapNode.removeEventListener('keydown', handleKeyDown);
      };
    }
    return () => { };
  }, [handleKeyDown, mapRef]);

  useEffect(() => {
    const mapNode = mapRef.current;
    if (mapNode) {
      mapNode.focus(); // 只在地图初始化的时候自动 focus 一次
    }
    return () => { };
  }, []);

  useEffect(() => {
    const mapNode = mapRef.current;
    if (mapNode) {
      mapNode.addEventListener('touchstart', handleTouchStart, {
        passive: false,
      });
      mapNode.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      mapNode.addEventListener('touchend', handleTouchEnd);
      mapNode.addEventListener('touchcancel', handleTouchEnd);
      return () => {
        mapNode.removeEventListener('touchstart', handleTouchStart);
        mapNode.removeEventListener('touchmove', handleTouchMove);
        mapNode.removeEventListener('touchend', handleTouchEnd);
        mapNode.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
    return () => { };
  }, [mapRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div>
      <div
        onBlur={() => {
          // TODO: inifite re-render loop. 
          // when surrender or game over dialog is shown. onBlur will execute, it set SelectedMapTile so a re-render is triggered. in the next render, onBlur execute again
          // setSelectedMapTileInfo({ x: -1, y: -1, half: false, unitsCount: 0 });
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
          width: mapBasePixelHeight, // game's width and height are swapped
          height: mapBasePixelWidth,
        }}
      >
        <div
          ref={mapRef}
          tabIndex={0}
          onClick={handleMapClick}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            willChange: 'transform',
            contain: 'layout paint style',
          }}
        >
          {displayMapData.map((tiles, x) => {
            return tiles.map((tile, y) => {
              return (
                <MapTile
                  key={`${x}/${y}`}
                  size={tileSize}
                  x={x}
                  y={y}
                  {...tile}
                  warringStatesMode={room.warringStatesMode}
                />
              );
            });
          })}
        </div>
      </div>
      {isSmallScreen && (
        <div className='menu-container absolute left-[5px] bottom-[65px] z-[1000] flex flex-col items-center justify-between gap-1 p-1 md:bottom-20'>
          <MapControlButton title={t('howToPlay.centerGeneral')} onClick={centerGeneral}>
            <Home size={18} strokeWidth={2.5} />
          </MapControlButton>
          <MapControlButton title={t('howToPlay.undoMove')} onClick={popQueue}>
            <RotateCcw size={18} strokeWidth={2.5} />
          </MapControlButton>
          <MapControlButton title={t('howToPlay.clearQueuedMoves')} onClick={clearQueue}>
            <Trash2 size={18} strokeWidth={2.5} />
          </MapControlButton>
          <MapControlButton title={t('howToPlay.toggle50')} onClick={() => halfArmy(touchHalf)}>
            <span className='text-xs font-black'>50%</span>
          </MapControlButton>
          <MapControlButton
            title='Zoom in'
            onClick={() => {
              setZoom((currentZoom: number) => Math.min(currentZoom + 0.2, 4));
            }}
          >
            <ZoomIn size={18} strokeWidth={2.5} />
          </MapControlButton>
          <MapControlButton
            title='Zoom out'
            onClick={() => {
              setZoom((currentZoom: number) =>
                Math.max(currentZoom - 0.2, 0.2)
              );
            }}
          >
            <ZoomOut size={18} strokeWidth={2.5} />
          </MapControlButton>
          <MapControlButton title={t('expandWSAD')} onClick={toggleDirections}>
            {showDirections ? (
              <ChevronLeft size={18} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={18} strokeWidth={2.5} />
            )}
          </MapControlButton>
        </div>
      )}
      {showDirections && (
        <div className='absolute right-2.5 bottom-[65px] z-[1000] flex flex-col p-1 md:bottom-20'>
          <div className='flex flex-col items-center'>
            <MapControlButton title='Attack up' onClick={() => attackUp(selectedMapTileInfo)}>
              <ArrowUp size={18} strokeWidth={2.5} />
            </MapControlButton>
            <div className='flex w-[40vw] flex-row items-center justify-between md:w-[20vw]'>
              <MapControlButton title='Attack left' onClick={() => attackLeft(selectedMapTileInfo)}>
                <ArrowLeft size={18} strokeWidth={2.5} />
              </MapControlButton>
              <MapControlButton title='Attack right' onClick={() => attackRight(selectedMapTileInfo)}>
                <ArrowRight size={18} strokeWidth={2.5} />
              </MapControlButton>
            </div>
            <MapControlButton title='Attack down' onClick={() => attackDown(selectedMapTileInfo)}>
              <ArrowDown size={18} strokeWidth={2.5} />
            </MapControlButton>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameMap;
