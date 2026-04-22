import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle2, Home, RotateCcw, Undo2 } from 'lucide-react';

import Navbar from '@/components/Navbar';
import MapTile from '@/components/game/MapTile';
import useMediaQuery from '@/hooks/useMediaQuery';
import { writeOnboardingStatus } from '@/lib/onboarding';
import { TileType, type TileProp } from '@/lib/types';

type Language = 'en' | 'zh';
type Owner = 'player' | 'enemy' | 'neutral';
type Terrain = 'plain' | 'city' | 'capital' | 'mountain';

type Coord = {
  row: number;
  col: number;
};

type TutorialTile = {
  terrain: Terrain;
  owner: Owner;
  army: number;
};

type StepAction =
  | {
      type: 'select';
      coord: Coord;
    }
  | {
      type: 'move';
      from: Coord;
      to: Coord;
    };

type Step = {
  title: Record<Language, string>;
  body: Record<Language, string>;
  hint: Record<Language, string>;
  action: StepAction;
};

const BOARD_ROWS = 5;
const BOARD_COLS = 8;
const PLAYER_COLOR = 1;
const ENEMY_COLOR = 2;

const CAPITAL: Coord = { row: 2, col: 1 };
const FIRST_PLAIN: Coord = { row: 2, col: 2 };
const CITY: Coord = { row: 2, col: 3 };
const MOUNTAIN: Coord = { row: 2, col: 4 };
const BYPASS: Coord = { row: 3, col: 3 };
const ENEMY_FRONT: Coord = { row: 3, col: 4 };
const ENEMY_CAPITAL: Coord = { row: 3, col: 5 };
const ENEMY_BACK_1: Coord = { row: 2, col: 5 };
const ENEMY_BACK_2: Coord = { row: 3, col: 6 };
const ENEMY_BACK_3: Coord = { row: 2, col: 6 };

const steps: Step[] = [
  {
    title: {
      zh: '选择主城',
      en: 'Select Your Capital',
    },
    body: {
      zh: '先选中自己的皇冠。',
      en: 'Select your crown first.',
    },
    hint: {
      zh: '点击高亮的主城。',
      en: 'Click the highlighted capital.',
    },
    action: {
      type: 'select',
      coord: CAPITAL,
    },
  },
  {
    title: {
      zh: '移动',
      en: 'Move Out',
    },
    body: {
      zh: '向右推进一格。',
      en: 'Move one tile to the right.',
    },
    hint: {
      zh: '向右占下第一块平原。',
      en: 'Move right into the first plain tile.',
    },
    action: {
      type: 'move',
      from: CAPITAL,
      to: FIRST_PLAIN,
    },
  },
  {
    title: {
      zh: '占领城市',
      en: 'Capture the City',
    },
    body: {
      zh: '继续向右，占下城市。城市每回合会自动增兵。',
      en: 'Keep moving right and capture the city. Cities generate army each turn.',
    },
    hint: {
      zh: '拿下高亮城市。',
      en: 'Capture the highlighted city.',
    },
    action: {
      type: 'move',
      from: FIRST_PLAIN,
      to: CITY,
    },
  },
  {
    title: {
      zh: '山地绕路',
      en: 'Route Around the Mountain',
    },
    body: {
      zh: '右边是山地，无法通过。试试从下方绕路。',
      en: 'The mountain on the right blocks your path. Try going downward instead.',
    },
    hint: {
      zh: '从城市走到下方绕路点（山地无法通过）。',
      en: 'Move from the city down to the detour tile (mountains cannot be crossed).',
    },
    action: {
      type: 'move',
      from: CITY,
      to: BYPASS,
    },
  },
  {
    title: {
      zh: '先破前线',
      en: 'Break the Front First',
    },
    body: {
      zh: '别直接冲王，先吃掉前线格。因为你的兵力不够直接攻下主城。',
      en: 'Do not rush the king yet. Take the front tile first because you need more army.',
    },
    hint: {
      zh: '先拿下敌方前线格。',
      en: 'Capture the enemy front-line tile first.',
    },
    action: {
      type: 'move',
      from: BYPASS,
      to: ENEMY_FRONT,
    },
  },
  {
    title: {
      zh: '夺取敌方主城',
      en: 'Take the Enemy Capital',
    },
    body: {
      zh: '最后吃掉敌方主城。',
      en: 'Finish by taking the enemy capital.',
    },
    hint: {
      zh: '进攻敌方主城。',
      en: 'Attack the enemy capital.',
    },
    action: {
      type: 'move',
      from: ENEMY_FRONT,
      to: ENEMY_CAPITAL,
    },
  },
];

const uiCopy = {
  zh: {
    pageTitle: '新手教程',
    eyebrow: '教程',
    restart: '重置',
    undo: '撤销',
    backToLobby: '返回大厅',
    legendYou: '你是红色',
    legendEnemy: '敌方是蓝色',
    legendGoal: '目标是夺取蓝色皇冠',
    progressLabel: '步骤',
    followHint: '当前提示',
    notEnoughArmy: '这个格子的兵力不足，至少要留 1 个兵在原地。',
    mountainBlocked: '山地不能通过。',
    wrongTarget: '这一步先按提示路线走。',
    wrongSelection: '先选中高亮的主城。',
    invalidTile: '只能从自己的格子出兵。',
    moveSuccess: '做得好，继续下一步。',
    capitalCaptured: '占领主城！敌方所有领地归你所有，兵力减半。',
    completedTitle: '完成',
    playAgain: '再练一次',
    finishBadge: '完成',
    gotIt: '知道了',
  },
  en: {
    pageTitle: 'Beginner Tutorial',
    eyebrow: 'Tutorial',
    restart: 'Reset',
    undo: 'Undo',
    backToLobby: 'Back to lobby',
    legendYou: 'You are red',
    legendEnemy: 'Enemy is blue',
    legendGoal: 'Take the blue crown',
    progressLabel: 'Step',
    followHint: 'Prompt',
    notEnoughArmy: 'That tile does not have enough army. One unit must stay behind.',
    mountainBlocked: 'Mountains cannot be crossed.',
    wrongTarget: 'For this step, follow the highlighted route first.',
    wrongSelection: 'Select the highlighted capital first.',
    invalidTile: 'You can only move out from your own tiles.',
    moveSuccess: 'Good. Move on to the next step.',
    capitalCaptured: 'Capital captured! All enemy territory is now yours with halved army.',
    completedTitle: 'Done',
    playAgain: 'Run it again',
    finishBadge: 'Done',
    gotIt: 'Got it',
  },
} as const;

function sameCoord(left: Coord | null | undefined, right: Coord | null | undefined) {
  return !!left && !!right && left.row === right.row && left.col === right.col;
}

function isAdjacent(from: Coord, to: Coord) {
  return Math.abs(from.row - to.row) + Math.abs(from.col - to.col) === 1;
}

function createInitialBoard(): TutorialTile[][] {
  const board = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => ({
      terrain: 'plain' as Terrain,
      owner: 'neutral' as Owner,
      army: 0,
    }))
  );

  board[CAPITAL.row][CAPITAL.col] = {
    terrain: 'capital',
    owner: 'player',
    army: 20,
  };
  board[CITY.row][CITY.col] = {
    terrain: 'city',
    owner: 'neutral',
    army: 3,
  };
  board[2][4] = {
    terrain: 'mountain',
    owner: 'neutral',
    army: 0,
  };
  board[ENEMY_FRONT.row][ENEMY_FRONT.col] = {
    terrain: 'plain',
    owner: 'enemy',
    army: 1,
  };
  board[ENEMY_CAPITAL.row][ENEMY_CAPITAL.col] = {
    terrain: 'capital',
    owner: 'enemy',
    army: 2,
  };
  board[ENEMY_BACK_1.row][ENEMY_BACK_1.col] = {
    terrain: 'plain',
    owner: 'enemy',
    army: 3,
  };
  board[ENEMY_BACK_2.row][ENEMY_BACK_2.col] = {
    terrain: 'plain',
    owner: 'enemy',
    army: 2,
  };
  board[ENEMY_BACK_3.row][ENEMY_BACK_3.col] = {
    terrain: 'plain',
    owner: 'enemy',
    army: 4,
  };

  return board;
}

function cloneBoard(board: TutorialTile[][]) {
  return board.map((row) => row.map((tile) => ({ ...tile })));
}

function toTileProp(tile: TutorialTile): TileProp {
  let tileType = TileType.Plain;

  if (tile.terrain === 'city') {
    tileType = TileType.City;
  } else if (tile.terrain === 'capital') {
    tileType = TileType.King;
  } else if (tile.terrain === 'mountain') {
    tileType = TileType.Mountain;
  }

  let color: number | null = null;
  if (tile.owner === 'player') {
    color = PLAYER_COLOR;
  } else if (tile.owner === 'enemy') {
    color = ENEMY_COLOR;
  }

  return [tileType, color, tile.army];
}

function applyMove(
  board: TutorialTile[][],
  from: Coord,
  to: Coord
):
  | {
      ok: false;
      reason: 'invalid' | 'notEnoughArmy' | 'mountainBlocked' | 'wrongTarget';
    }
  | {
      ok: true;
      board: TutorialTile[][];
      selected: Coord;
      capturedCapital?: boolean;
    } {
  const source = board[from.row]?.[from.col];
  const target = board[to.row]?.[to.col];

  if (!source || !target) {
    return { ok: false, reason: 'invalid' };
  }

  if (source.owner !== 'player') {
    return { ok: false, reason: 'invalid' };
  }

  if (source.army <= 1) {
    return { ok: false, reason: 'notEnoughArmy' };
  }

  if (target.terrain === 'mountain') {
    return { ok: false, reason: 'mountainBlocked' };
  }

  if (!isAdjacent(from, to)) {
    return { ok: false, reason: 'wrongTarget' };
  }

  const movingArmy = source.army - 1;
  const nextBoard = cloneBoard(board);
  nextBoard[from.row][from.col].army = 1;

  if (target.owner === 'player') {
    nextBoard[to.row][to.col].army += movingArmy;
    return { ok: true, board: nextBoard, selected: to };
  }

  if (movingArmy > target.army) {
    const capturedCapital = target.terrain === 'capital' && target.owner === 'enemy';

    nextBoard[to.row][to.col] = {
      ...nextBoard[to.row][to.col],
      owner: 'player',
      army: movingArmy - target.army,
    };

    // If captured enemy capital, convert all enemy tiles to player with halved army
    if (capturedCapital) {
      for (let r = 0; r < nextBoard.length; r++) {
        for (let c = 0; c < nextBoard[r].length; c++) {
          if (nextBoard[r][c].owner === 'enemy') {
            nextBoard[r][c].owner = 'player';
            nextBoard[r][c].army = Math.floor(nextBoard[r][c].army / 2);
          }
        }
      }
    }

    return { ok: true, board: nextBoard, selected: to, capturedCapital };
  }

  nextBoard[to.row][to.col].army = target.army - movingArmy;
  return { ok: true, board: nextBoard, selected: from };
}

function getDirectionTarget(from: Coord, key: string): Coord | null {
  switch (key) {
    case 'w':
    case 'ArrowUp':
      return { row: from.row - 1, col: from.col };
    case 'a':
    case 'ArrowLeft':
      return { row: from.row, col: from.col - 1 };
    case 's':
    case 'ArrowDown':
      return { row: from.row + 1, col: from.col };
    case 'd':
    case 'ArrowRight':
      return { row: from.row, col: from.col + 1 };
    default:
      return null;
  }
}

function TileMarker({
  coord,
  size,
  variant,
}: {
  coord: Coord;
  size: number;
  variant: 'source' | 'target';
}) {
  return (
    <div
      aria-hidden='true'
      className={variant === 'target' ? 'animate-pulse' : undefined}
      style={{
        position: 'absolute',
        left: coord.col * size,
        top: coord.row * size,
        width: size,
        height: size,
        border:
          variant === 'target'
            ? '3px solid var(--bw-blue)'
            : '3px solid var(--bw-ember)',
        boxShadow:
          variant === 'target'
            ? 'inset 0 0 0 1px rgba(255,255,255,0.3), 0 0 0 2px rgba(96,165,250,0.2)'
            : 'inset 0 0 0 1px rgba(255,255,255,0.22)',
        background:
          variant === 'target'
            ? 'color-mix(in srgb, var(--bw-blue) 16%, transparent)'
            : 'color-mix(in srgb, var(--bw-ember) 12%, transparent)',
        pointerEvents: 'none',
        zIndex: 12,
      }}
    />
  );
}

export default function TutorialPage() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const isSmallScreen = useMediaQuery('(max-width: 767px)');
  const language: Language = useMemo(() => {
    const resolvedLanguage = (
      i18n.resolvedLanguage ??
      i18n.language ??
      'en'
    ).toLowerCase();
    return resolvedLanguage.startsWith('zh') ? 'zh' : 'en';
  }, [i18n.language, i18n.resolvedLanguage]);
  const copy = uiCopy[language];

  const mapRef = useRef<HTMLDivElement | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const dragFromRef = useRef<Coord | null>(null);
  const touchStartCoordRef = useRef<Coord | null>(null);
  const touchDraggedRef = useRef(false);
  const lastTouchCoordRef = useRef<Coord | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [board, setBoard] = useState<TutorialTile[][]>(() => createInitialBoard());
  const [selected, setSelected] = useState<Coord | null>(null);
  const [feedback, setFeedback] = useState(steps[0].hint[language]);
  const [completed, setCompleted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [errorShake, setErrorShake] = useState<Coord | null>(null);
  const [history, setHistory] = useState<Array<{ stepIndex: number; board: TutorialTile[][]; selected: Coord | null }>>([]);

  const currentStep = steps[stepIndex];
  const totalSteps = steps.length;
  const tileSize = isSmallScreen ? 48 : 56;
  const boardPixelWidth = tileSize * BOARD_COLS;
  const boardPixelHeight = tileSize * BOARD_ROWS;

  const mapData = useMemo(() => {
    return board.map((row) => row.map((tile) => toTileProp(tile)));
  }, [board]);

  const clearPendingTransition = useCallback(() => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  const focusMap = useCallback(() => {
    mapRef.current?.focus({ preventScroll: true });
  }, []);

  const resetTutorial = useCallback(() => {
    clearPendingTransition();
    dragFromRef.current = null;
    touchStartCoordRef.current = null;
    touchDraggedRef.current = false;
    lastTouchCoordRef.current = null;
    setStepIndex(0);
    setBoard(createInitialBoard());
    setSelected(null);
    setCompleted(false);
    setIsTransitioning(false);
    setFeedback(steps[0].hint[language]);
    setHistory([]);
    setErrorShake(null);
  }, [clearPendingTransition, language]);

  const undoStep = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setStepIndex(lastState.stepIndex);
    setBoard(lastState.board);
    setSelected(lastState.selected);
    setHistory(history.slice(0, -1));
    setCompleted(false);
    setFeedback(steps[lastState.stepIndex].hint[language]);
  }, [history, language]);

  useEffect(() => {
    return () => {
      clearPendingTransition();
    };
  }, [clearPendingTransition]);

  useEffect(() => {
    if (!completed) {
      setFeedback(currentStep.hint[language]);
    }
  }, [completed, currentStep, language]);

  const finishTutorial = useCallback(
    (nextBoard: TutorialTile[][], nextSelection: Coord) => {
      clearPendingTransition();
      setBoard(nextBoard);
      setSelected(nextSelection);
      setCompleted(true);
      setIsTransitioning(false);
      setFeedback(copy.moveSuccess);
      writeOnboardingStatus('completed');
    },
    [clearPendingTransition, copy.moveSuccess]
  );

  const advanceToNextStep = useCallback(
    (nextBoard: TutorialTile[][], nextSelection: Coord, capturedCapital?: boolean) => {
      if (stepIndex === totalSteps - 1) {
        finishTutorial(nextBoard, nextSelection);
        return;
      }

      // Save to history before advancing
      setHistory((prev) => [...prev, { stepIndex, board, selected }]);

      clearPendingTransition();
      setBoard(nextBoard);
      setSelected(nextSelection);
      setIsTransitioning(true);
      setFeedback(capturedCapital ? copy.capitalCaptured : copy.moveSuccess);
      transitionTimeoutRef.current = window.setTimeout(() => {
        setStepIndex((current) => current + 1);
        setIsTransitioning(false);
      }, capturedCapital ? 1200 : 260);
    },
    [
      clearPendingTransition,
      copy.moveSuccess,
      copy.capitalCaptured,
      finishTutorial,
      stepIndex,
      totalSteps,
      board,
      selected,
    ]
  );

  const showWrongMoveMessage = useCallback(
    (
      reason: 'notEnoughArmy' | 'mountainBlocked' | 'wrongTarget' | 'invalid',
      coord?: Coord
    ) => {
      if (coord) {
        setErrorShake(coord);
        setTimeout(() => setErrorShake(null), 500);
      }

      if (reason === 'notEnoughArmy') {
        setFeedback(copy.notEnoughArmy);
        return;
      }
      if (reason === 'mountainBlocked') {
        setFeedback(copy.mountainBlocked);
        return;
      }
      if (reason === 'invalid') {
        setFeedback(copy.invalidTile);
        return;
      }
      setFeedback(copy.wrongTarget);
    },
    [
      copy.invalidTile,
      copy.mountainBlocked,
      copy.notEnoughArmy,
      copy.wrongTarget,
    ]
  );

  const handleMoveAttempt = useCallback(
    (from: Coord, to: Coord) => {
      if (completed || isTransitioning) {
        return;
      }

      if (currentStep.action.type !== 'move') {
        setFeedback(copy.followHint);
        return;
      }

      if (
        !sameCoord(from, currentStep.action.from) ||
        !sameCoord(to, currentStep.action.to)
      ) {
        const attemptedResult = applyMove(board, from, to);
        if (!attemptedResult.ok && attemptedResult.reason !== 'wrongTarget') {
          showWrongMoveMessage(attemptedResult.reason, to);
        } else {
          showWrongMoveMessage('wrongTarget', to);
        }
        return;
      }

      const result = applyMove(board, from, to);
      if (!result.ok) {
        showWrongMoveMessage(result.reason, to);
        return;
      }

      advanceToNextStep(result.board, result.selected, result.capturedCapital);
    },
    [
      advanceToNextStep,
      board,
      completed,
      copy.followHint,
      currentStep.action,
      isTransitioning,
      showWrongMoveMessage,
    ]
  );

  const handleTilePress = useCallback(
    (coord: Coord) => {
      if (completed || isTransitioning) {
        return;
      }

      const tile = board[coord.row]?.[coord.col];
      if (!tile) {
        return;
      }

      if (currentStep.action.type === 'select') {
        if (sameCoord(coord, currentStep.action.coord)) {
          setHistory((prev) => [...prev, { stepIndex, board, selected }]);
          setSelected(coord);
          setFeedback(copy.moveSuccess);
          setStepIndex((current) => current + 1);
          return;
        }

        if (tile.owner === 'player') {
          setSelected(coord);
        }
        setFeedback(copy.wrongSelection);
        setErrorShake(coord);
        setTimeout(() => setErrorShake(null), 500);
        return;
      }

      if (tile.owner === 'player') {
        setSelected(coord);
        if (!sameCoord(coord, currentStep.action.from)) {
          setFeedback(copy.followHint);
        }
        return;
      }

      if (selected && isAdjacent(selected, coord)) {
        handleMoveAttempt(selected, coord);
        return;
      }

      if (tile.terrain === 'mountain' && selected && isAdjacent(selected, coord)) {
        setFeedback(copy.mountainBlocked);
        setErrorShake(coord);
        setTimeout(() => setErrorShake(null), 500);
      }
    },
    [
      board,
      completed,
      copy.followHint,
      copy.mountainBlocked,
      copy.moveSuccess,
      copy.wrongSelection,
      currentStep.action,
      handleMoveAttempt,
      isTransitioning,
      selected,
      stepIndex,
    ]
  );

  const getCoordFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) {
        return null;
      }

      const col = Math.floor((clientX - rect.left) / tileSize);
      const row = Math.floor((clientY - rect.top) / tileSize);

      if (
        row < 0 ||
        row >= BOARD_ROWS ||
        col < 0 ||
        col >= BOARD_COLS
      ) {
        return null;
      }

      return { row, col };
    },
    [tileSize]
  );

  const handleMapClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      focusMap();
      const coord = getCoordFromClientPoint(event.clientX, event.clientY);
      if (!coord) {
        return;
      }

      handleTilePress(coord);
    },
    [focusMap, getCoordFromClientPoint, handleTilePress]
  );

  useEffect(() => {
    const node = mapRef.current;
    if (!node) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (completed || !selected) {
        return;
      }

      const target = getDirectionTarget(selected, event.key);
      if (!target) {
        return;
      }

      event.preventDefault();
      handleMoveAttempt(selected, target);
    };

    node.addEventListener('keydown', handleKeyDown);
    return () => {
      node.removeEventListener('keydown', handleKeyDown);
    };
  }, [completed, handleMoveAttempt, selected]);

  useEffect(() => {
    focusMap();
  }, [focusMap]);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) {
      return;
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }

      event.preventDefault();
      focusMap();

      const coord = getCoordFromClientPoint(
        event.touches[0].clientX,
        event.touches[0].clientY
      );
      if (!coord) {
        return;
      }

      touchStartCoordRef.current = coord;
      touchDraggedRef.current = false;
      lastTouchCoordRef.current = coord;

      const tile = board[coord.row]?.[coord.col];
      if (currentStep.action.type === 'move' && tile?.owner === 'player') {
        dragFromRef.current = coord;
        setSelected(coord);
      } else {
        dragFromRef.current = null;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !dragFromRef.current) {
        return;
      }

      event.preventDefault();

      const coord = getCoordFromClientPoint(
        event.touches[0].clientX,
        event.touches[0].clientY
      );
      if (!coord || sameCoord(coord, lastTouchCoordRef.current)) {
        return;
      }

      lastTouchCoordRef.current = coord;

      if (isAdjacent(dragFromRef.current, coord)) {
        touchDraggedRef.current = true;
        handleMoveAttempt(dragFromRef.current, coord);
        dragFromRef.current = null;
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }

      const startCoord = touchStartCoordRef.current;
      if (!touchDraggedRef.current && startCoord) {
        handleTilePress(startCoord);
      }

      dragFromRef.current = null;
      touchStartCoordRef.current = null;
      touchDraggedRef.current = false;
      lastTouchCoordRef.current = null;
    };

    node.addEventListener('touchstart', handleTouchStart, { passive: false });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd, { passive: false });
    node.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
      node.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [
    board,
    currentStep.action.type,
    focusMap,
    getCoordFromClientPoint,
    handleMoveAttempt,
    handleTilePress,
  ]);

  const focusSource =
    currentStep.action.type === 'move' ? currentStep.action.from : null;
  const focusTarget =
    currentStep.action.type === 'select'
      ? currentStep.action.coord
      : currentStep.action.to;

  return (
    <>
      <Head>
        <title>{`${copy.pageTitle} | BlockWar / 方块战争`}</title>
      </Head>
      <Navbar />
      <main className='app-container'>
        <div className='center-layout lg:justify-center'>
          <section className='bw-card-grid mx-auto w-full max-w-6xl p-0'>
            <div
              className='border-b px-4 py-5 sm:px-6 sm:py-6'
              style={{ borderColor: 'var(--bw-line-strong)' }}
            >
              <div className='flex flex-col gap-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span
                    className='border px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em]'
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--bw-red) 44%, var(--bw-line) 56%)',
                      background:
                        'color-mix(in srgb, var(--bw-red) 12%, var(--bw-panel-strong) 88%)',
                      color: 'var(--bw-ink)',
                    }}
                  >
                    {copy.legendYou}
                  </span>
                  <span
                    className='border px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em]'
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--bw-blue) 44%, var(--bw-line) 56%)',
                      background:
                        'color-mix(in srgb, var(--bw-blue) 12%, var(--bw-panel-strong) 88%)',
                      color: 'var(--bw-ink)',
                    }}
                  >
                    {copy.legendEnemy}
                  </span>
                  <span
                    className='border px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em]'
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--bw-ember) 44%, var(--bw-line) 56%)',
                      background:
                        'color-mix(in srgb, var(--bw-ember) 12%, var(--bw-panel-strong) 88%)',
                      color: 'var(--bw-ink)',
                    }}
                  >
                    {copy.legendGoal}
                  </span>
                  {completed ? (
                    <span
                      className='inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em]'
                      style={{
                        borderColor:
                          'color-mix(in srgb, var(--bw-green) 44%, var(--bw-line) 56%)',
                        background:
                          'color-mix(in srgb, var(--bw-green) 12%, var(--bw-panel-strong) 88%)',
                        color: 'var(--bw-ink)',
                      }}
                    >
                      <CheckCircle2 size={14} strokeWidth={2.4} />
                      {copy.finishBadge}
                    </span>
                  ) : null}
                </div>

                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='max-w-3xl'>
                    <p className='bw-page-copy'>{copy.eyebrow}</p>

                    {/* Progress dots */}
                    <div className='mt-3 flex items-center gap-2'>
                      {Array.from({ length: totalSteps }).map((_, index) => (
                        <div
                          key={index}
                          className='transition-all duration-200'
                          style={{
                            width: index <= stepIndex ? 12 : 8,
                            height: index <= stepIndex ? 12 : 8,
                            borderRadius: '50%',
                            background: index < stepIndex
                              ? 'var(--bw-green)'
                              : index === stepIndex
                              ? 'var(--bw-ember)'
                              : 'var(--bw-line)',
                            boxShadow: index === stepIndex
                              ? '0 0 0 3px color-mix(in srgb, var(--bw-ember) 20%, transparent)'
                              : 'none',
                          }}
                        />
                      ))}
                      <span
                        className='ml-1 text-xs font-black uppercase tracking-[0.18em]'
                        style={{ color: 'var(--bw-muted)' }}
                      >
                        {Math.min(stepIndex + 1, totalSteps)} / {totalSteps}
                      </span>
                    </div>

                    <h1 className='bw-title mt-3 text-3xl sm:text-4xl md:text-5xl'>
                      {completed ? copy.completedTitle : currentStep.title[language]}
                    </h1>
                    <p
                      className='mt-3 max-w-3xl text-sm leading-7 sm:text-base'
                      style={{ color: 'var(--bw-ink-soft)' }}
                    >
                      {completed ? copy.moveSuccess : feedback}
                    </p>
                  </div>

                  <div className='flex flex-wrap gap-2 lg:justify-end'>
                    <button
                      type='button'
                      className='bw-button bw-button-secondary px-4'
                      onClick={() => {
                        void router.push('/');
                      }}
                    >
                      <Home size={16} strokeWidth={2.5} />
                      {copy.backToLobby}
                    </button>
                    {history.length > 0 && !completed && (
                      <button
                        type='button'
                        className='bw-button bw-button-secondary px-4'
                        onClick={undoStep}
                      >
                        <Undo2 size={16} strokeWidth={2.5} />
                        {copy.undo}
                      </button>
                    )}
                    <button
                      type='button'
                      className='bw-button bw-button-secondary px-4'
                      onClick={resetTutorial}
                    >
                      <RotateCcw size={16} strokeWidth={2.5} />
                      {completed ? copy.playAgain : copy.restart}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className='px-4 py-5 sm:px-6 sm:py-6'>
              <div
                className='overflow-hidden border p-3'
                style={{
                  borderColor: 'var(--bw-line)',
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--bw-panel-strong) 94%, transparent), color-mix(in srgb, var(--bw-bg) 88%, transparent))',
                }}
              >
                <div
                  className='mx-auto'
                  style={{
                    width: boardPixelWidth,
                    maxWidth: '100%',
                  }}
                >
                  <div
                    className='relative mx-auto'
                    style={{
                      width: boardPixelWidth,
                      height: boardPixelHeight,
                      maxWidth: '100%',
                    }}
                  >
                    <div
                      ref={mapRef}
                      tabIndex={0}
                      onClick={handleMapClick}
                      onPointerDown={focusMap}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: boardPixelWidth,
                        height: boardPixelHeight,
                        outline: 'none',
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        background:
                          'radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 35%), var(--bw-bg)',
                      }}
                    >
                      {mapData.map((row, rowIndex) =>
                        row.map((tile, colIndex) => {
                          const coord = { row: rowIndex, col: colIndex };
                          const tutorialTile = board[rowIndex][colIndex];
                          const tileType = tile[0];
                          const isAdjacentMoveTarget =
                            !!selected && isAdjacent(selected, coord);
                          const isShaking = errorShake && sameCoord(errorShake, coord);

                          return (
                            <MapTile
                              key={`${rowIndex}/${colIndex}`}
                              size={tileSize}
                              x={rowIndex}
                              y={colIndex}
                              tile={tile}
                              isOwned={tutorialTile.owner === 'player'}
                              _className={isShaking ? 'shake-tile' : ''}
                              tileHalf={false}
                              isSelected={sameCoord(selected, coord)}
                              isNextPossibleMove={
                                isAdjacentMoveTarget &&
                                tileType !== TileType.Mountain
                              }
                              isBlockedMoveTarget={
                                isAdjacentMoveTarget &&
                                tileType === TileType.Mountain
                              }
                              showMyKingHighlight={sameCoord(coord, CAPITAL)}
                              warringStatesMode={false}
                            />
                          );
                        })
                      )}

                      {focusSource ? (
                        <TileMarker
                          coord={focusSource}
                          size={tileSize}
                          variant='source'
                        />
                      ) : null}
                      {focusTarget ? (
                        <TileMarker
                          coord={focusTarget}
                          size={tileSize}
                          variant='target'
                        />
                      ) : null}

                      {/* Show mountain warning in mountain detour step */}
                      {stepIndex === 3 && currentStep.action.type === 'move' && (
                        <div
                          style={{
                            position: 'absolute',
                            left: MOUNTAIN.col * tileSize,
                            top: MOUNTAIN.row * tileSize,
                            width: tileSize,
                            height: tileSize,
                            border: '3px solid var(--bw-red)',
                            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3), 0 0 0 2px rgba(239,68,68,0.2)',
                            background: 'color-mix(in srgb, var(--bw-red) 16%, transparent)',
                            pointerEvents: 'none',
                            zIndex: 12,
                            animation: 'pulse 2s ease-in-out infinite',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion celebration */}
              {completed && (
                <div
                  className='absolute inset-0 pointer-events-none overflow-hidden'
                  style={{ zIndex: 20 }}
                >
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className='absolute'
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                        width: '8px',
                        height: '8px',
                        background: ['var(--bw-red)', 'var(--bw-blue)', 'var(--bw-green)', 'var(--bw-ember)'][i % 4],
                        borderRadius: '50%',
                        animation: `confetti ${2 + Math.random() * 2}s ease-out forwards`,
                        animationDelay: `${Math.random() * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{
        __html: `
          .shake-tile {
            animation: shake 0.5s;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          @keyframes confetti {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
        `
      }} />
    </>
  );
}

export async function getStaticProps(context: any) {
  const { locale } = context;

  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  };
}
