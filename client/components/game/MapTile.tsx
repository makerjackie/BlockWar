import React, { useMemo } from 'react';
import Image from 'next/image';
import { Home } from 'lucide-react';
import { TileProp, TileType, TileType2Image } from '@/lib/types';
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

const myKingOutlineColor = 'rgba(250, 204, 21, 0.85)';
const myKingHaloColor = 'rgba(250, 204, 21, 0.22)';
const myKingBadgeBackground = 'rgba(24, 24, 27, 0.92)';
const myKingBadgeBorder = 'rgba(250, 204, 21, 0.55)';
const myKingBadgeIconColor = 'rgba(254, 249, 195, 0.95)';
const moveHintFill = 'rgba(250, 204, 21, 0.16)';
const moveHintBorder = 'rgba(250, 204, 21, 0.78)';
const blockedHintFill = 'rgba(239, 68, 68, 0.14)';
const blockedHintBorder = 'rgba(248, 113, 113, 0.85)';

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
  isBlockedMoveTarget: boolean;
  showMyKingHighlight: boolean;
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
    isBlockedMoveTarget,
    showMyKingHighlight,
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

  const myKingOutlineInset = useMemo(
    () => Math.max(1, Math.round(zoomedSize * 0.06)),
    [zoomedSize]
  );
  const myKingOutlineWidth = useMemo(
    () => Math.max(2, Math.round(zoomedSize * 0.05)),
    [zoomedSize]
  );
  const myKingBadgeSize = useMemo(
    () => Math.max(10, Math.round(zoomedSize * 0.22)),
    [zoomedSize]
  );
  const myKingBadgeIconSize = useMemo(
    () => Math.max(8, Math.round(myKingBadgeSize * 0.56)),
    [myKingBadgeSize]
  );
  const myKingBadgeInset = useMemo(
    () => Math.max(2, Math.round(zoomedSize * 0.08)),
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
    if (!isRevealed) {
      return notRevealedFill;
    }
    if (tileType === TileType.Mountain) {
      return MountainFill;
    }

    if (color !== null) {
      return ColorArr[color];
    }
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
        cursor: isBlockedMoveTarget ? 'not-allowed' : canMove ? 'pointer' : 'default',
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
      {(isNextPossibleMove || isBlockedMoveTarget) && (
        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            inset: 0,
            border: `2px solid ${
              isBlockedMoveTarget ? blockedHintBorder : moveHintBorder
            }`,
            background: isBlockedMoveTarget
              ? `repeating-linear-gradient(135deg, ${blockedHintFill}, ${blockedHintFill} 5px, transparent 5px, transparent 10px)`
              : moveHintFill,
            boxShadow: `inset 0 0 0 1px ${
              isBlockedMoveTarget ? 'rgba(127, 29, 29, 0.35)' : 'rgba(24, 24, 27, 0.28)'
            }`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
      {showMyKingHighlight && (
        <>
          <div
            data-highlight='my-king-outline'
            aria-hidden='true'
            style={{
              position: 'absolute',
              inset: myKingOutlineInset,
              border: `${myKingOutlineWidth}px solid ${myKingOutlineColor}`,
              borderRadius: Math.max(4, Math.round(zoomedSize * 0.12)),
              boxShadow: `0 0 0 2px ${myKingHaloColor}`,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
          <div
            data-highlight='my-king-badge'
            aria-hidden='true'
            style={{
              position: 'absolute',
              top: myKingBadgeInset,
              right: myKingBadgeInset,
              width: myKingBadgeSize,
              height: myKingBadgeSize,
              borderRadius: '9999px',
              backgroundColor: myKingBadgeBackground,
              border: `1px solid ${myKingBadgeBorder}`,
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
              color={myKingBadgeIconColor}
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
            zIndex: 2,
          }}
        >
          {tileHalf ? '50%' : unitsCount}
        </div>
      )}
    </div>
  );
});
