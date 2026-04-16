import React, { useMemo } from 'react';
import Image from 'next/image';
import { Home } from 'lucide-react';
import { TileType, TileProp, TileType2Image } from '@/lib/types';
import {
  ColorArr,
  WarringStates,
  defaultBgcolor,
  notRevealedFill,
  notOwnedArmyFill,
  notOwnedCityFill,
  MountainFill,
  blankFill,
  selectedStroke,
  revealedStroke,
} from '@/lib/constants';

const myKingGlowColor = 'rgba(250, 204, 21, 0.55)';
const myKingRingColor = 'rgba(250, 204, 21, 0.95)';
const myKingInnerRingColor = 'rgba(254, 249, 195, 0.95)';
const myKingBadgeBackground = 'rgba(120, 53, 15, 0.95)';
const myKingBadgeOutline = 'rgba(255, 255, 255, 0.75)';
const myKingShadowColor = 'rgba(15, 23, 42, 0.72)';

interface MapTileProps {
  zoom?: number;
  imageZoom?: number;
  size: number;
  fontSize?: number;
  tile: TileProp;
  x: number;
  y: number;
  isOwned: boolean;
  _className: string;
  tileHalf: boolean;
  isSelected: boolean;
  isNextPossibleMove: boolean;
  isMyKing: boolean;
  warringStatesMode: boolean;
}

export default React.memo(function MapTile(props: MapTileProps) {
  const {
    zoom,
    imageZoom,
    size,
    fontSize,
    x,
    y,
    tile,
    isOwned,
    _className,
    tileHalf,
    isSelected,
    isNextPossibleMove,
    isMyKing,
    warringStatesMode = false,
  } = props;
  const resolvedZoom = zoom ?? 1;
  const resolvedImageZoom = imageZoom ?? 0.8;
  const resolvedFontSize = fontSize ?? 16;

  const [tileType, color, unitsCount] = tile;
  const image = TileType2Image[tileType];

  const isRevealed = useMemo(() => {
    return unitsCount !== null;
  }, [unitsCount]);

  const stroke = useMemo(() => {
    if (isSelected) {
      return selectedStroke;
    }

    if (isRevealed) {
      return revealedStroke;
    }
  }, [isSelected, isRevealed]);

  const canMove = useMemo(() => {
    return isOwned || isNextPossibleMove;
  }, [isOwned, isNextPossibleMove]);

  const zoomedSize = useMemo(() => size * resolvedZoom, [size, resolvedZoom]);
  const zoomedFontSize = useMemo(
    () => resolvedFontSize * resolvedZoom,
    [resolvedFontSize, resolvedZoom]
  );
  const tileX = useMemo(() => zoomedSize * y, [zoomedSize, y]);
  const tileY = useMemo(() => zoomedSize * x, [zoomedSize, x]);

  const zoomedImageSize = useMemo(
    () => zoomedSize * resolvedImageZoom,
    [zoomedSize, resolvedImageZoom]
  );

  const myKingGlowInset = useMemo(
    () => -Math.max(3, Math.round(zoomedSize * 0.12)),
    [zoomedSize]
  );
  const myKingInnerInset = useMemo(
    () => Math.max(2, Math.round(zoomedSize * 0.08)),
    [zoomedSize]
  );
  const myKingRingWidth = useMemo(
    () => Math.max(2, Math.round(zoomedSize * 0.08)),
    [zoomedSize]
  );
  const myKingBadgeSize = useMemo(
    () => Math.max(14, Math.round(zoomedSize * 0.34)),
    [zoomedSize]
  );
  const myKingBadgeIconSize = useMemo(
    () => Math.max(10, Math.round(myKingBadgeSize * 0.58)),
    [myKingBadgeSize]
  );
  const myKingBadgeOffset = useMemo(
    () => -Math.max(5, Math.round(zoomedSize * 0.14)),
    [zoomedSize]
  );
  const imageXY = useMemo(
    () => (zoomedSize - zoomedImageSize) / 2,
    [zoomedSize, zoomedImageSize]
  );

  const country = useMemo(() => {
    if (color !== null && warringStatesMode) {
      return WarringStates[color];
    }
    return '';
  }, [color, warringStatesMode]);

  const bgcolor = useMemo(() => {
    // 战争迷雾
    if (!isRevealed) {
      return notRevealedFill;
    }
    // 山
    if (tileType === TileType.Mountain) {
      return MountainFill;
    }

    // 玩家单位
    if (color !== null) {
      return ColorArr[color];
    }
    // 中立单位
    if (color === null) {
      if (tileType === TileType.City) {
        return notOwnedCityFill;
      }
      if (unitsCount) {
        return notOwnedArmyFill;
      }
      if (tileType === TileType.Swamp) {
        return notOwnedArmyFill;
      }
    }

    // 空白单位
    return blankFill;
  }, [tileType, color, unitsCount, isRevealed]);

  return (
    <div
      className={_className}
      style={{
        position: 'absolute',
        left: tileX,
        top: tileY,
        width: zoomedSize,
        height: zoomedSize,
        cursor: canMove ? 'pointer' : 'default',
        backgroundColor: defaultBgcolor,
        overflow: 'visible',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: zoomedSize,
          height: zoomedSize,
          backgroundColor: bgcolor,
          border: stroke ? `${stroke} solid 1px` : `${bgcolor} solid 1px`,
          display: 'flex',
          color: 'rgba(0, 0, 0, 0.4)',
          fontSize: zoomedFontSize,
        }}
      >
        {country}
      </div>
      {isMyKing && (
        <>
          <div
            data-highlight='my-king-glow'
            aria-hidden='true'
            style={{
              position: 'absolute',
              inset: myKingGlowInset,
              border: `${myKingRingWidth}px solid ${myKingRingColor}`,
              borderRadius: Math.max(8, Math.round(zoomedSize * 0.18)),
              boxShadow: `0 0 0 2px ${myKingShadowColor}, 0 0 18px 6px ${myKingGlowColor}`,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
          <div
            data-highlight='my-king-ring'
            aria-hidden='true'
            style={{
              position: 'absolute',
              inset: myKingInnerInset,
              border: `${myKingRingWidth}px solid ${myKingInnerRingColor}`,
              borderRadius: Math.max(6, Math.round(zoomedSize * 0.14)),
              boxShadow: `0 0 0 1px ${myKingShadowColor} inset`,
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
          <div
            data-highlight='my-king-badge'
            aria-hidden='true'
            style={{
              position: 'absolute',
              top: myKingBadgeOffset,
              right: myKingBadgeOffset,
              width: myKingBadgeSize,
              height: myKingBadgeSize,
              borderRadius: '9999px',
              backgroundColor: myKingBadgeBackground,
              border: `1px solid ${myKingBadgeOutline}`,
              boxShadow: `0 0 0 2px ${myKingRingColor}, 0 6px 12px rgba(15, 23, 42, 0.32)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <Home
              size={myKingBadgeIconSize}
              strokeWidth={2.4}
              color={myKingInnerRingColor}
            />
          </div>
        </>
      )}
      {image && (
        <Image
          src={image}
          width={zoomedImageSize}
          height={zoomedImageSize}
          style={{
            position: 'absolute',
            left: imageXY,
            top: imageXY,
            opacity: 0.8,
          }}
          alt={`tile-${x}-${y}`}
          draggable={false}
        />
      )}
      {unitsCount && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: zoomedSize,
            height: zoomedSize,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: zoomedFontSize,
            color: '#fff',
            textOverflow: 'ellipsis',
            overflow: 'visible',
            textShadow: '0 0 2px #000',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {/* 50% */}
          {/* {tileHalf ? '50%' : unitsCount} */}

          {tileHalf ? '50%' : unitsCount}
        </div>
      )}

      {/* highlight when select*/}
      {isNextPossibleMove && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: zoomedSize,
            height: zoomedSize,
            backgroundColor: '#000',
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
});
