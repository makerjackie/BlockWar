import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import useMediaQuery from './useMediaQuery';
import useMapDrag from './useMapDrag';

interface Position {
  x: number;
  y: number;
}

interface useMapProps {
  mapWidth: number;
  mapHeight: number;
  listenTouch?: boolean;
}

export default function useMap({
  mapWidth,
  mapHeight,
  listenTouch = true,
}: useMapProps) {
  const [zoom, setZoom] = useState<number>(1.0);
  const [tileSize, setTileSize] = useState(40);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  useMapDrag(mapRef, position, setPosition, zoom, setZoom, listenTouch);

  const isSmallScreen = useMediaQuery('(max-width:600px)');
  useEffect(() => {
    setZoom(isSmallScreen ? 0.7 : 1.0);

    if (mapWidth > 40 || mapHeight > 40) {
      setZoom(0.5);
    } else if (mapWidth > 25 || mapHeight > 25) {
      setZoom(0.75);
    }
  }, [isSmallScreen, mapWidth, mapHeight]);

  const mapBasePixelWidth = useMemo(
    () => tileSize * mapWidth,
    [tileSize, mapWidth]
  );
  const mapBasePixelHeight = useMemo(
    () => tileSize * mapHeight,
    [tileSize, mapHeight]
  );

  const mapPixelWidth = useMemo(
    () => mapBasePixelWidth * zoom,
    [mapBasePixelWidth, zoom]
  );
  const mapPixelHeight = useMemo(
    () => mapBasePixelHeight * zoom,
    [mapBasePixelHeight, zoom]
  );

  const handleZoomOption = useCallback((option: string) => {
    switch (option) {
      case '1':
        if (mapWidth > 20 || mapHeight > 20) {
          setZoom(0.5);
        } else {
          setZoom(0.7);
        }
        break;
      case '2':
        setZoom(1.0);
        break;
      case '3':
        setZoom(1.3);
        break;
      default:
        // handle default case
        break;
    }
  }, [mapWidth, mapHeight]);

  return {
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
    setTileSize,
  };
}
