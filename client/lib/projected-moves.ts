import type { AttackRoute } from '@/lib/attack-queue';
import { TileType, type MapData, type Position } from '@/lib/types';

type PlayerLike = {
  color: number;
  team: number;
};

type SimTile = {
  type: TileType;
  color: number | null;
  team: number | null;
  unitsCount: number;
};

export type ProjectedMoveState = {
  position: Position;
  color: number | null;
  unitsCount: number;
};

export function getMovableUnits(unitsCount: number, half: boolean) {
  const movableUnits = Math.max(unitsCount - 1, 0);
  return half ? Math.ceil(movableUnits / 2) : movableUnits;
}

function buildTeamByColor(players: PlayerLike[]) {
  return new Map(players.map((player) => [player.color, player.team]));
}

function cloneMapData(mapData: MapData, players: PlayerLike[]) {
  const teamByColor = buildTeamByColor(players);

  return mapData.map((tiles) => {
    return tiles.map(([type, color, unitsCount]) => ({
      type,
      color,
      team: color === null ? null : teamByColor.get(color) ?? null,
      unitsCount: unitsCount ?? 0,
    }));
  });
}

function readProjectedState(simMap: SimTile[][], position: Position) {
  const tile = simMap[position.x]?.[position.y];
  if (!tile) {
    return null;
  }

  return {
    position,
    color: tile.color,
    unitsCount: tile.unitsCount,
  } satisfies ProjectedMoveState;
}

function onSameTeam(fromTile: SimTile, toTile: SimTile) {
  return (
    fromTile.color !== null &&
    fromTile.team !== null &&
    toTile.team !== null &&
    fromTile.team === toTile.team
  );
}

export function projectQueuedMoves({
  mapData,
  players,
  plannedRoutes,
  fallbackPosition,
}: {
  mapData: MapData;
  players: PlayerLike[];
  plannedRoutes: AttackRoute[];
  fallbackPosition: Position;
}) {
  const simMap = cloneMapData(mapData, players);
  const startPosition = plannedRoutes[0]?.from ?? fallbackPosition;

  if (plannedRoutes.length === 0) {
    return {
      ok: true,
      end: readProjectedState(simMap, startPosition),
    };
  }

  let currentPosition = startPosition;

  for (const route of plannedRoutes) {
    const fromTile = simMap[route.from.x]?.[route.from.y];
    const toTile = simMap[route.to.x]?.[route.to.y];

    if (!fromTile || !toTile) {
      return {
        ok: false,
        end: readProjectedState(simMap, currentPosition),
      };
    }

    const movingUnits = getMovableUnits(fromTile.unitsCount, route.half);
    if (movingUnits <= 0) {
      return {
        ok: false,
        end: readProjectedState(simMap, route.from),
      };
    }

    fromTile.unitsCount -= movingUnits;

    if (onSameTeam(fromTile, toTile)) {
      toTile.unitsCount += movingUnits;
      if (toTile.type !== TileType.King) {
        toTile.color = fromTile.color;
        toTile.team = fromTile.team;
      }
    } else if (toTile.unitsCount >= movingUnits) {
      toTile.unitsCount -= movingUnits;
    } else {
      toTile.unitsCount = movingUnits - toTile.unitsCount;
      toTile.color = fromTile.color;
      toTile.team = fromTile.team;
    }

    currentPosition = route.to;
  }

  return {
    ok: true,
    end: readProjectedState(simMap, currentPosition),
  };
}
