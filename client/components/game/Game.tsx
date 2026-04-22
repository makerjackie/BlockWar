import React, { useCallback, useEffect, useState } from 'react';
import SurrenderDialog from './SurrenderDialog';
import GameMap from './GameMap';
import LeaderBoard from './LeaderBoard';
import TurnsCount from './TurnsCount';
import OverDialog from './OverDialog';
import { useGame, useGameDispatch } from '@/context/GameContext';
import TutorialGuide from './TutorialGuide';
import StrategistHint from './StrategistHint';

interface GameProps {
  latencyMs: number | null;
  connectionState: 'connecting' | 'connected' | 'reconnecting';
}

export default function Game({ latencyMs, connectionState }: GameProps) {
  const { room, socketRef, myPlayerId, turnsCount, leaderBoardData } =
    useGame();
  const { setOpenOverDialog, setDialogContent, setIsSurrendered } =
    useGameDispatch();

  const [isSurrenderDialogOpen, setSurrenderDialogOpen] = useState(false);

  const handleReturnClick = () => {
    setSurrenderDialogOpen(true);
  };

  const handleSurrender = () => {
    socketRef.current.emit('surrender', myPlayerId);
    setIsSurrendered(true);
    setDialogContent([[null], 'game_surrender', null]);
    setOpenOverDialog(true);
  };

  return (
    <div className='Game'>
      <TurnsCount
        count={turnsCount}
        handleReturnClick={handleReturnClick}
        latencyMs={latencyMs}
        connectionState={connectionState}
      />
      <StrategistHint />
      <LeaderBoard
        leaderBoardTable={leaderBoardData}
        players={room.players}
        warringStatesMode={room.warringStatesMode}
      />
      <TutorialGuide />
      <GameMap />
      <SurrenderDialog
        isOpen={isSurrenderDialogOpen}
        setOpen={setSurrenderDialogOpen}
        handleSurrender={handleSurrender}
      />
      <OverDialog />
    </div>
  );
}
