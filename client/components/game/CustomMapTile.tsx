import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  TileType,
  DisplayCustomMapTileData,
  TileType2Image,
} from '@/lib/types';
import { ColorArr } from '@/lib/constants';
import { Lightbulb } from 'lucide-react';
import {
  defaultBgcolor,
  notRevealedFill,
  notOwnedArmyFill,
  notOwnedCityFill,
  MountainFill,
  blankFill,
} from '@/lib/constants';

interface CustomMapTileProps {
  zoom?: number;
  size: number;
  tile: DisplayCustomMapTileData;
  x: number;
  y: number;
  handleClick?: any;
  imageZoom?: number;
  fontSize?: number;
}

export default React.memo(function CustomMapTile(props: CustomMapTileProps) {
  const {
    zoom,
    size,
    x,
    y,
    tile,
    imageZoom,
    fontSize,
    handleClick,
  } = props;
  const resolvedZoom = zoom ?? 1;
  const resolvedImageZoom = imageZoom ?? 0.8;
  const resolvedFontSize = fontSize ?? 16;

  const [tileType, color, unitsCount, isAlwaysRevealed, priority] = tile;
  const image = TileType2Image[tileType];

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

  const imageXY = useMemo(
    () => (zoomedSize - zoomedImageSize) / 2,
    [zoomedSize, zoomedImageSize]
  );
  const imageFrameSize = useMemo(
    () => Math.min(zoomedSize - 2, zoomedImageSize + Math.max(4, zoomedSize * 0.22)),
    [zoomedImageSize, zoomedSize]
  );
  const imageFrameXY = useMemo(
    () => (zoomedSize - imageFrameSize) / 2,
    [imageFrameSize, zoomedSize]
  );

  const bgcolor = useMemo(() => {
    //
    if (tileType === TileType.Fog || tileType === TileType.Obstacle) {
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
  }, [tileType, color, unitsCount]);

  return (
    <div
      style={{
        position: 'absolute',
        left: tileX,
        top: tileY,
        width: zoomedSize,
        height: zoomedSize,
        backgroundColor: defaultBgcolor,
        cursor: handleClick ? 'pointer' : 'default',
      }}
      onClick={handleClick}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: zoomedSize,
          height: zoomedSize,
          backgroundColor: bgcolor,
          border: '1px solid var(--bw-map-tile-border)',
        }}
      />
      {image && (
        <div
          style={{
            position: 'absolute',
            left: imageFrameXY,
            top: imageFrameXY,
            width: imageFrameSize,
            height: imageFrameSize,
            borderRadius: 9999,
            background: 'var(--bw-map-icon-backdrop)',
            boxShadow: 'inset 0 0 0 1px var(--bw-map-icon-outline)',
            pointerEvents: 'none',
          }}
        />
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
            opacity: 'var(--bw-map-icon-opacity)',
            filter: 'var(--bw-map-icon-filter)',
            pointerEvents: 'none',
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
          {unitsCount}
        </div>
      )}

      {isAlwaysRevealed && (
        <Lightbulb
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: zoomedSize * 0.5,
            height: zoomedSize * 0.5,
            color: '#f5c542',
          }}
          strokeWidth={2.4}
        />
      )}
    </div>
  );
});
