import { useEffect, useRef, useCallback } from 'react';
import { Position } from '@/lib/types';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4.0;

function clampZoom(value: number) {
  return Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
}

const useMapDrag = (
  mapRef: any,
  position: Position,
  setPosition: any,
  zoom: number,
  setZoom: any,
  listenTouch: boolean
) => {
  const mouseDragging = useRef(false);
  const touchDragging = useRef(false);
  const mouseStartPosition = useRef({ x: 0, y: 0 });
  const touchStartPosition = useRef({ x: 0, y: 0 });
  const initialDistance = useRef(0);
  const positionRef = useRef(position);
  const pendingPosition = useRef<Position | null>(null);
  const positionFrame = useRef<number | undefined>(undefined);
  const pendingWheelDelta = useRef(0);
  const wheelFrame = useRef<number | undefined>(undefined);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const schedulePosition = useCallback(
    (nextPosition: Position) => {
      pendingPosition.current = nextPosition;
      if (positionFrame.current !== undefined) return;

      positionFrame.current = window.requestAnimationFrame(() => {
        if (pendingPosition.current) {
          setPosition(pendingPosition.current);
        }
        pendingPosition.current = null;
        positionFrame.current = undefined;
      });
    },
    [setPosition]
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      mouseDragging.current = true;
      mouseStartPosition.current = {
        x: event.clientX - positionRef.current.x,
        y: event.clientY - positionRef.current.y,
      };
    },
    []
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!mouseDragging.current) return;
      schedulePosition({
        x: event.clientX - mouseStartPosition.current.x,
        y: event.clientY - mouseStartPosition.current.y,
      });
    },
    [schedulePosition]
  );

  const handleMouseUp = useCallback(() => {
    mouseDragging.current = false;
  }, []);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length === 1) {
        touchDragging.current = true;
        touchStartPosition.current = {
          x: event.touches[0].clientX - positionRef.current.x,
          y: event.touches[0].clientY - positionRef.current.y,
        };
      } else if (event.touches.length === 2) {
        touchDragging.current = false;
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch1.clientX - touch2.clientX, 2) +
            Math.pow(touch1.clientY - touch2.clientY, 2)
        );
        initialDistance.current = distance;
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();
      if (event.touches.length === 1) {
        if (!touchDragging.current) return;
        schedulePosition({
          x: event.touches[0].clientX - touchStartPosition.current.x,
          y: event.touches[0].clientY - touchStartPosition.current.y,
        });
      } else if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch1.clientX - touch2.clientX, 2) +
            Math.pow(touch1.clientY - touch2.clientY, 2)
        );
        const delta = distance - initialDistance.current;
        initialDistance.current = distance;
        setZoom((currentZoom: number) => clampZoom(currentZoom + delta * 0.0002));
      }
    },
    [schedulePosition, setZoom]
  );

  const handleTouchEnd = useCallback(() => {
    touchDragging.current = false;
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      pendingWheelDelta.current += event.deltaY;
      if (wheelFrame.current !== undefined) return;

      wheelFrame.current = window.requestAnimationFrame(() => {
        const delta = pendingWheelDelta.current;
        pendingWheelDelta.current = 0;
        setZoom((currentZoom: number) => clampZoom(currentZoom + delta * -0.0008));
        wheelFrame.current = undefined;
      });
    },
    [setZoom]
  );

  useEffect(() => {
    const mapNode = mapRef.current;
    if (mapNode) {
      mapNode.addEventListener('wheel', handleWheel, { passive: false });
      mapNode.addEventListener('mousedown', handleMouseDown);
      mapNode.addEventListener('mousemove', handleMouseMove);
      mapNode.addEventListener('mouseup', handleMouseUp);
      if (listenTouch) {
        mapNode.addEventListener('touchstart', handleTouchStart);
        mapNode.addEventListener('touchmove', handleTouchMove, {
          passive: false,
        });
        mapNode.addEventListener('touchend', handleTouchEnd);
      }

      return () => {
        mapNode.removeEventListener('wheel', handleWheel);
        mapNode.removeEventListener('mousedown', handleMouseDown);
        mapNode.removeEventListener('mousemove', handleMouseMove);
        mapNode.removeEventListener('mouseup', handleMouseUp);
        if (listenTouch) {
          mapNode.removeEventListener('touchstart', handleTouchStart);
          mapNode.removeEventListener('touchmove', handleTouchMove);
          mapNode.removeEventListener('touchend', handleTouchEnd);
        }
      };
    }
    return () => {};
  }, [
    mapRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    listenTouch,
  ]);

  useEffect(() => {
    return () => {
      if (positionFrame.current !== undefined) {
        window.cancelAnimationFrame(positionFrame.current);
      }
      if (wheelFrame.current !== undefined) {
        window.cancelAnimationFrame(wheelFrame.current);
      }
    };
  }, []);
};

export default useMapDrag;
