import Block from '@shared/game/block';
import Player from '@shared/game/player';
import Point from '@shared/game/point';
import type { Room } from '@shared/game/types';
import { TileType } from '@shared/game/types';

const botDirections = [
  new Point(-1, 0),
  new Point(1, 0),
  new Point(0, -1),
  new Point(0, 1),
];

export const BOT_SEARCH_LIMITS = {
  origins: 48,
  targets: 12,
} as const;

const BOT_OPENING_RULES = {
  turns: 80,
  landRatio: 0.08,
  minLandGoal: 10,
  maxLandGoal: 18,
  frontierPlainPriority: 2600,
  frontierSwampPriority: 2100,
} as const;

type StrategicTargetKind =
  | 'enemy_king'
  | 'enemy_city'
  | 'enemy_land'
  | 'neutral_city'
  | 'frontier_land';

type StrategicTarget = {
  point: Point;
  kind: StrategicTargetKind;
  priority: number;
};

type CandidateOrigin = {
  block: Block;
  movable: number;
  pressure: number;
};

type BotMetrics = {
  evaluatedMoves: number;
};

export type BotDecisionReason =
  | 'defend_king'
  | 'capture_king'
  | 'capture_city'
  | 'capture_land'
  | 'advance'
  | 'expand';

export type BotDecision = {
  from: Point;
  to: Point;
  reason: BotDecisionReason;
  inspectedOrigins: number;
  evaluatedMoves: number;
};

function manhattanDistance(from: Point, to: Point) {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

function getBotName(room: Pick<Room, 'players'>) {
  const existingNames = new Set(room.players.map((player) => player.username));
  let botIndex = room.players.filter((player) => player.isBot).length + 1;
  let botName = `Bot ${botIndex}`;

  while (existingNames.has(botName)) {
    botIndex += 1;
    botName = `Bot ${botIndex}`;
  }

  return botName;
}

function getNeighborBlocks(room: Room, point: Point) {
  if (!room.map) {
    return [] as Block[];
  }

  return botDirections
    .map((direction) => new Point(point.x + direction.x, point.y + direction.y))
    .filter((neighbor) => room.map!.withinMap(neighbor))
    .map((neighbor) => room.map!.getBlock(neighbor));
}

function isFriendlyBlock(player: Player, block: Block) {
  return block.player?.team === player.team;
}

function isEnemyBlock(player: Player, block: Block) {
  return Boolean(block.player && block.player.team !== player.team);
}

function createDecision(
  from: Point,
  to: Point,
  reason: BotDecisionReason,
  inspectedOrigins: number,
  metrics: BotMetrics
): BotDecision {
  return {
    from,
    to,
    reason,
    inspectedOrigins,
    evaluatedMoves: metrics.evaluatedMoves,
  };
}

function getOpeningLandGoal(room: Room) {
  if (!room.map) {
    return BOT_OPENING_RULES.minLandGoal;
  }

  const mapArea = room.map.width * room.map.height;
  return Math.max(
    BOT_OPENING_RULES.minLandGoal,
    Math.min(
      BOT_OPENING_RULES.maxLandGoal,
      Math.ceil(mapArea * BOT_OPENING_RULES.landRatio)
    )
  );
}

function shouldPrioritizeExpansion(room: Room, player: Player) {
  if (!room.map) {
    return false;
  }

  return (
    room.map.turn < BOT_OPENING_RULES.turns &&
    player.land.length < getOpeningLandGoal(room)
  );
}

function collectCandidateOrigins(room: Room, player: Player): CandidateOrigin[] {
  const weightedOrigins = player.land
    .map((block) => {
      const movable = block.getMovableUnit();
      if (movable <= 0) {
        return null;
      }

      const neighbors = getNeighborBlocks(room, block);
      const enemyPressure = neighbors.filter((neighbor) => isEnemyBlock(player, neighbor)).length;
      const nonFriendlyPressure = neighbors.filter(
        (neighbor) => !isFriendlyBlock(player, neighbor)
      ).length;
      const kingDistance = player.king
        ? manhattanDistance(new Point(block.x, block.y), new Point(player.king.x, player.king.y))
        : 0;

      return {
        block,
        movable,
        pressure:
          movable * 10 +
          enemyPressure * 60 +
          nonFriendlyPressure * 25 -
          kingDistance,
      };
    })
    .filter((item): item is CandidateOrigin => item !== null)
    .sort((left, right) => right.pressure - left.pressure);

  return weightedOrigins.slice(0, BOT_SEARCH_LIMITS.origins);
}

function collectStrategicTargets(
  room: Room,
  player: Player,
  prioritizeExpansion: boolean
) {
  if (!room.map) {
    return [];
  }

  const targets: StrategicTarget[] = [];
  for (let x = 0; x < room.map.width; x++) {
    for (let y = 0; y < room.map.height; y++) {
      const block = room.map.map[x][y];
      if (block.type === TileType.Mountain || isFriendlyBlock(player, block)) {
        continue;
      }

      const point = new Point(x, y);
      if (!block.player) {
        if (
          prioritizeExpansion &&
          block.type !== TileType.City &&
          getNeighborBlocks(room, point).some((neighbor) => isFriendlyBlock(player, neighbor))
        ) {
          targets.push({
            point,
            kind: 'frontier_land',
            priority:
              block.type === TileType.Swamp
                ? BOT_OPENING_RULES.frontierSwampPriority
                : BOT_OPENING_RULES.frontierPlainPriority,
          });
          continue;
        }

        if (block.type === TileType.City) {
          targets.push({
            point,
            kind: 'neutral_city',
            priority: prioritizeExpansion ? 700 - block.unit * 2 : 1500 - block.unit,
          });
        }
        continue;
      }

      if (block.type === TileType.King) {
        targets.push({
          point,
          kind: 'enemy_king',
          priority: 9000 - block.unit * 3,
        });
        continue;
      }

      if (block.type === TileType.City) {
        targets.push({
          point,
          kind: 'enemy_city',
          priority: prioritizeExpansion ? 1000 - block.unit * 2 : 4500 - block.unit * 2,
        });
        continue;
      }

      targets.push({
        point,
        kind: 'enemy_land',
        priority: 1800 - block.unit,
      });
    }
  }

  return targets
    .sort((left, right) => right.priority - left.priority)
    .slice(0, BOT_SEARCH_LIMITS.targets);
}

function planKingDefense(
  room: Room,
  player: Player,
  origins: CandidateOrigin[],
  metrics: BotMetrics
) {
  if (!room.map || !player.king) {
    return null;
  }

  const kingPoint = new Point(player.king.x, player.king.y);
  const kingBlock = room.map.getBlock(kingPoint);
  const threats = getNeighborBlocks(room, kingPoint).filter((block) =>
    isEnemyBlock(player, block)
  );

  if (threats.length === 0) {
    return null;
  }

  const strongestThreat = Math.max(...threats.map((block) => block.unit));
  if (kingBlock.unit > strongestThreat + 1) {
    return null;
  }

  let best: { from: Point; to: Point; score: number } | null = null;
  for (const origin of origins) {
    const from = new Point(origin.block.x, origin.block.y);
    for (const target of [...threats, kingBlock]) {
      const to = new Point(target.x, target.y);
      metrics.evaluatedMoves += 1;

      if (!room.map.commendable(player, from, to)) {
        continue;
      }

      const movingToKing = to.x === kingPoint.x && to.y === kingPoint.y;
      const score =
        movingToKing
          ? origin.movable * 140 - strongestThreat * 40
          : origin.movable * 130 - target.unit * 35;

      if (!best || score > best.score) {
        best = { from, to, score };
      }
    }
  }

  if (!best || best.score <= 0) {
    return null;
  }

  return createDecision(best.from, best.to, 'defend_king', origins.length, metrics);
}

function scoreImmediateMove(
  player: Player,
  fromBlock: Block,
  toBlock: Block,
  prioritizeExpansion: boolean
) {
  const movable = fromBlock.getMovableUnit();

  if (toBlock.type === TileType.Mountain || isFriendlyBlock(player, toBlock)) {
    return null;
  }

  if (isEnemyBlock(player, toBlock) && movable <= toBlock.unit) {
    return {
      reason: 'capture_land' as const,
      score: movable * 2 - toBlock.unit * 4,
    };
  }

  if (toBlock.type === TileType.King && isEnemyBlock(player, toBlock)) {
    return {
      reason: 'capture_king' as const,
      score: 20000 + movable * 20 - toBlock.unit * 5,
    };
  }

  if (toBlock.type === TileType.City) {
    if (prioritizeExpansion) {
      return {
        reason: 'capture_city' as const,
        score:
          (isEnemyBlock(player, toBlock) ? 500 : 350) +
          movable * 4 -
          toBlock.unit * 4,
      };
    }

    return {
      reason: 'capture_city' as const,
      score:
        (isEnemyBlock(player, toBlock) ? 8000 : 3500) +
        movable * 10 -
        toBlock.unit * 4,
    };
  }

  if (isEnemyBlock(player, toBlock)) {
    return {
      reason: 'capture_land' as const,
      score: 3200 + movable * 6 - toBlock.unit * 4,
    };
  }

  return {
    reason: 'expand' as const,
    score:
      (toBlock.type === TileType.Swamp ? 150 : 650) +
      movable * 4 -
      toBlock.unit * 2,
  };
}

function planImmediateMove(
  room: Room,
  player: Player,
  origins: CandidateOrigin[],
  metrics: BotMetrics,
  prioritizeExpansion: boolean
) {
  if (!room.map) {
    return null;
  }

  let best: { from: Point; to: Point; score: number; reason: BotDecisionReason } | null = null;

  for (const origin of origins) {
    const from = new Point(origin.block.x, origin.block.y);
    for (const neighbor of getNeighborBlocks(room, from)) {
      const to = new Point(neighbor.x, neighbor.y);
      metrics.evaluatedMoves += 1;

      if (!room.map.commendable(player, from, to)) {
        continue;
      }

      const scored = scoreImmediateMove(
        player,
        origin.block,
        neighbor,
        prioritizeExpansion
      );
      if (!scored || scored.score <= 0) {
        continue;
      }

      if (!best || scored.score > best.score) {
        best = { from, to, score: scored.score, reason: scored.reason };
      }
    }
  }

  if (!best) {
    return null;
  }

  return createDecision(best.from, best.to, best.reason, origins.length, metrics);
}

function scoreStrategicAdvance(
  player: Player,
  fromBlock: Block,
  toBlock: Block,
  target: StrategicTarget
) {
  const from = new Point(fromBlock.x, fromBlock.y);
  const to = new Point(toBlock.x, toBlock.y);
  const currentDistance = manhattanDistance(from, target.point);
  const nextDistance = manhattanDistance(to, target.point);

  if (nextDistance >= currentDistance) {
    return Number.NEGATIVE_INFINITY;
  }

  const friendlyPenalty = isFriendlyBlock(player, toBlock)
    ? target.kind === 'frontier_land'
      ? 30
      : 120
    : 0;
  const swampPenalty = toBlock.type === TileType.Swamp ? 200 : 0;
  const frontierBonus = target.kind === 'frontier_land' ? 180 : 0;

  return (
    target.priority -
    nextDistance * 25 +
    fromBlock.getMovableUnit() * 6 -
    toBlock.unit * 2 -
    friendlyPenalty -
    swampPenalty +
    frontierBonus
  );
}

function planStrategicAdvance(
  room: Room,
  player: Player,
  origins: CandidateOrigin[],
  targets: StrategicTarget[],
  metrics: BotMetrics
) {
  if (!room.map || targets.length === 0) {
    return null;
  }

  let best: { from: Point; to: Point; score: number } | null = null;
  for (const origin of origins) {
    const from = new Point(origin.block.x, origin.block.y);
    for (const neighbor of getNeighborBlocks(room, from)) {
      const to = new Point(neighbor.x, neighbor.y);
      if (!room.map.commendable(player, from, to) || neighbor.type === TileType.Mountain) {
        continue;
      }

      for (const target of targets) {
        metrics.evaluatedMoves += 1;
        const score = scoreStrategicAdvance(player, origin.block, neighbor, target);
        if (!best || score > best.score) {
          best = { from, to, score };
        }
      }
    }
  }

  if (!best || best.score <= 0) {
    return null;
  }

  return createDecision(best.from, best.to, 'advance', origins.length, metrics);
}

export function createBotPlayer(options: {
  room: Pick<Room, 'players'>;
  botId: string;
  color: number;
  team: number;
}) {
  const { room, botId, color, team } = options;
  return new Player(
    botId,
    `bot:${botId}`,
    getBotName(room),
    color,
    team,
    false,
    false,
    false,
    0,
    [],
    null,
    null,
    false,
    true
  );
}

export function planBotMove(room: Room, player: Player): BotDecision | null {
  if (!room.map || !player.king || player.isDead || player.spectating()) {
    return null;
  }

  const origins = collectCandidateOrigins(room, player);
  if (origins.length === 0) {
    return null;
  }

  const metrics: BotMetrics = { evaluatedMoves: 0 };
  const prioritizeExpansion = shouldPrioritizeExpansion(room, player);
  const targets = collectStrategicTargets(room, player, prioritizeExpansion);

  return (
    planKingDefense(room, player, origins, metrics) ??
    planImmediateMove(room, player, origins, metrics, prioritizeExpansion) ??
    planStrategicAdvance(room, player, origins, targets, metrics)
  );
}
