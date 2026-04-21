import { MapData, Position } from './types';

export type StrategistHintKey =
  | 'enemyInTerritory'
  | 'enemyNearCapital'
  | 'frontlinePressure';

export interface StrategistHint {
  id: string;
  key: StrategistHintKey;
  player: string;
  priority: number;
  units?: number;
  distance?: number;
  count?: number;
}

export interface StrategistPlayerSnapshot {
  id: string;
  username: string;
  color: number;
  team: number;
  isDead?: boolean;
}

interface GetStrategistHintsOptions {
  mapData: MapData;
  players: StrategistPlayerSnapshot[];
  myPlayerId: string;
  capital: Position | null;
}

interface FrontlineSummary {
  player: string;
  frontlineTiles: number;
  maxUnits: number;
  closestDistance: number;
}

const CARDINAL_DIRECTIONS: Position[] = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
];

function manhattanDistance(a: Position, b: Position) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isWithinMap(
  mapData: MapData,
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number
) {
  return x >= 0 && x < mapWidth && y >= 0 && y < mapHeight && !!mapData[x]?.[y];
}

function countAdjacentOwnedTiles(
  mapData: MapData,
  x: number,
  y: number,
  myColor: number,
  mapWidth: number,
  mapHeight: number
) {
  return CARDINAL_DIRECTIONS.reduce((count, direction) => {
    const nextX = x + direction.x;
    const nextY = y + direction.y;
    if (!isWithinMap(mapData, nextX, nextY, mapWidth, mapHeight)) {
      return count;
    }

    return mapData[nextX][nextY][1] === myColor ? count + 1 : count;
  }, 0);
}

export function getStrategistHints({
  mapData,
  players,
  myPlayerId,
  capital,
}: GetStrategistHintsOptions): StrategistHint[] {
  if (!capital || mapData.length === 0 || mapData[0]?.length === 0) {
    return [];
  }

  const me = players.find((player) => player.id === myPlayerId);
  if (!me || me.isDead) {
    return [];
  }

  const mapWidth = mapData.length;
  const mapHeight = mapData[0].length;
  const capitalAlertDistance = Math.max(
    4,
    Math.min(8, Math.floor((mapWidth + mapHeight) / 5))
  );
  const playersByColor = new Map<number, StrategistPlayerSnapshot>(
    players.map((player) => [player.color, player])
  );

  let bestEnemyInTerritory: StrategistHint | null = null;
  let bestEnemyNearCapital: StrategistHint | null = null;
  const frontlineByEnemy = new Map<number, FrontlineSummary>();

  for (let x = 0; x < mapWidth; x++) {
    for (let y = 0; y < mapHeight; y++) {
      const [, color, units] = mapData[x][y];
      if (color === null || color === me.color) {
        continue;
      }

      const enemy = playersByColor.get(color);
      if (!enemy || enemy.isDead || enemy.team === me.team) {
        continue;
      }

      const distanceToCapital = manhattanDistance({ x, y }, capital);
      const adjacentOwnedTiles = countAdjacentOwnedTiles(
        mapData,
        x,
        y,
        me.color,
        mapWidth,
        mapHeight
      );

      if (adjacentOwnedTiles > 0) {
        const frontline = frontlineByEnemy.get(enemy.color) ?? {
          player: enemy.username,
          frontlineTiles: 0,
          maxUnits: 0,
          closestDistance: Number.POSITIVE_INFINITY,
        };

        frontline.frontlineTiles += 1;
        frontline.maxUnits = Math.max(
          frontline.maxUnits,
          typeof units === 'number' ? units : 0
        );
        frontline.closestDistance = Math.min(
          frontline.closestDistance,
          distanceToCapital
        );

        frontlineByEnemy.set(enemy.color, frontline);
      }

      if (
        adjacentOwnedTiles >= 2 &&
        typeof units === 'number' &&
        units >= 6
      ) {
        const priority = units * 4 + adjacentOwnedTiles * 10 - distanceToCapital;
        if (
          !bestEnemyInTerritory ||
          priority > bestEnemyInTerritory.priority
        ) {
          bestEnemyInTerritory = {
            id: `enemyInTerritory:${enemy.color}:${x}:${y}:${units}`,
            key: 'enemyInTerritory',
            player: enemy.username,
            units,
            priority,
          };
        }
      }

      if (
        distanceToCapital > 0 &&
        distanceToCapital <= capitalAlertDistance
      ) {
        const priority =
          (capitalAlertDistance - distanceToCapital + 1) * 12 +
          adjacentOwnedTiles * 5 +
          (typeof units === 'number' ? units : 0);
        if (
          !bestEnemyNearCapital ||
          priority > bestEnemyNearCapital.priority
        ) {
          bestEnemyNearCapital = {
            id: `enemyNearCapital:${enemy.color}:${distanceToCapital}:${x}:${y}`,
            key: 'enemyNearCapital',
            player: enemy.username,
            distance: distanceToCapital,
            priority,
          };
        }
      }
    }
  }

  let bestFrontlinePressure: StrategistHint | null = null;
  frontlineByEnemy.forEach((frontline, color) => {
    if (frontline.frontlineTiles < 3) {
      return;
    }

    const priority =
      frontline.frontlineTiles * 9 +
      frontline.maxUnits * 2 -
      frontline.closestDistance;

    if (!bestFrontlinePressure || priority > bestFrontlinePressure.priority) {
      bestFrontlinePressure = {
        id: `frontlinePressure:${color}:${frontline.frontlineTiles}`,
        key: 'frontlinePressure',
        player: frontline.player,
        count: frontline.frontlineTiles,
        priority,
      };
    }
  });

  const hints = [
    bestEnemyNearCapital,
    bestEnemyInTerritory,
    bestFrontlinePressure,
  ].filter((hint): hint is StrategistHint => hint !== null);

  return hints.sort((a, b) => b.priority - a.priority);
}
