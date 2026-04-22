import { DurableObject } from 'cloudflare:workers';
import { ColorArr, MaxTeamNum, forceStartOK } from '@shared/game/constants';
import GameRecord from '@shared/game/game-record';
import GameMap from '@shared/game/map';
import MapDiff from '@shared/game/map-diff';
import { formatCreatorRoomName, isFallbackRoomName } from '@shared/game/room-names';
import Player from '@shared/game/player';
import Point from '@shared/game/point';
import { createDefaultRoom } from '@shared/game/room-defaults';
import type {
  CustomMapData,
  LeaderBoardRow,
  LeaderBoardTable,
  Message,
  Room,
  UserData,
  initGameInfo,
} from '@shared/game/types';
import { getPlayerIndex, getPlayerIndexBySocket } from '@shared/game/utils';
import type { SocketPacket } from '@shared/ws';
import {
  cloneRoomSummary,
  hydrateRoomSummary,
  sanitizeRoomSummary,
  type PlainRoom,
} from './lib/room-summary';
import {
  createBotPlayer as createManagedBotPlayer,
  planBotMove,
} from './lib/bot-engine';

type Env = Cloudflare.Env;

type SocketAttachment = {
  connectionId: string;
  roomId: string;
  playerId?: string;
};

const configurableRoomSettings = new Set([
  'roomName',
  'mapId',
  'maxPlayers',
  'gameSpeed',
  'mapWidth',
  'mapHeight',
  'mountain',
  'city',
  'swamp',
  'fogOfWar',
  'revealKing',
  'warringStatesMode',
  'deathSpectator',
]);

const DISCONNECT_GRACE_MS = 15000;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

function buildPacket(type: string, data: unknown[]): string {
  const packet: SocketPacket = { type, data };
  return JSON.stringify(packet);
}

function randomPlayerId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

function isConfigurableRoomSetting(property: string) {
  return configurableRoomSettings.has(property);
}

function pointFromPayload(value: unknown): Point | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const { x, y } = value as { x?: unknown; y?: unknown };
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    return null;
  }

  return new Point(Number(x), Number(y));
}

function isCardinalNeighbor(from: Point, to: Point) {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
}

function hasHumanPlayers(room: { players: Array<{ isBot?: boolean }> }) {
  return room.players.some((player) => !player.isBot);
}

function isReadyParticipant(player: { team: number; isBot?: boolean }) {
  return !player.isBot && player.team !== MaxTeamNum + 1;
}

function countReadyParticipants(room: Room) {
  return room.players.reduce(
    (count, player) => count + (isReadyParticipant(player) && player.forceStart ? 1 : 0),
    0
  );
}

function countActiveHumanPlayers(room: Room) {
  return room.players.filter(isReadyParticipant).length;
}

function countActiveBotPlayers(room: Room) {
  return room.players.filter(
    (player) => player.isBot && player.team !== MaxTeamNum + 1
  ).length;
}

function getForceStartTarget(room: Room) {
  const activeHumans = countActiveHumanPlayers(room);
  if (activeHumans === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (countActiveBotPlayers(room) > 0) {
    return activeHumans;
  }

  return forceStartOK[activeHumans] ?? activeHumans;
}

function pickNextConnectedHumanHost(room: Room) {
  return room.players.find(
    (player) => !player.isBot && !player.disconnected
  );
}

export class RoomDurableObject extends DurableObject<Env> {
  private room: Room | null = null;
  private sockets = new Map<string, WebSocket>();
  private gameLoopTimer: number | null = null;
  private disconnectTimers = new Map<string, number>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as SocketAttachment | null;
      if (attachment) {
        this.sockets.set(attachment.connectionId, socket);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const url = new URL(request.url);
    const roomId = url.pathname.split('/').at(-1);

    if (!roomId) {
      return new Response('Missing room id', { status: 400 });
    }

    const session = await this.app.getSession(url.searchParams.get('sessionToken'));
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const reconnectToken = url.searchParams.get('reconnectToken') ?? '';
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const connectionId = crypto.randomUUID();

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ connectionId, roomId });
    this.sockets.set(connectionId, server);

    void this.handleJoin(
      connectionId,
      roomId,
      session.username,
      session.id,
      reconnectToken
    ).catch(
      (error) => {
        console.error('join failed', serializeError(error));
        this.send(connectionId, 'reject_join', 'Unable to join the room.');
        server.close(1011, 'Unable to join the room.');
      }
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const text =
        typeof message === 'string'
          ? message
          : new TextDecoder().decode(message as ArrayBuffer);
      const packet = JSON.parse(text) as SocketPacket;
      const attachment = ws.deserializeAttachment() as SocketAttachment | null;

      if (!attachment) {
        return;
      }

      await this.ensureRoom(attachment.roomId);
      await this.handlePacket(attachment.connectionId, packet);
    } catch (error) {
      console.error('webSocketMessage failed', serializeError(error));
    }
  }

  async webSocketClose(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    if (!attachment) {
      return;
    }

    this.sockets.delete(attachment.connectionId);
    await this.ensureRoom(attachment.roomId);
    await this.handleDisconnect(attachment.connectionId);
  }

  private get app() {
    return this.env.APP.getByName('global');
  }

  private send(connectionId: string, event: string, ...data: unknown[]) {
    const socket = this.sockets.get(connectionId);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(buildPacket(event, data));
  }

  private broadcast(event: string, ...data: unknown[]) {
    const payload = buildPacket(event, data);
    for (const socket of this.sockets.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }

  private async ensureRoom(roomId: string) {
    if (this.room) {
      return this.room;
    }

    const summary = (await this.app.getStoredRoom(roomId)) as PlainRoom | null;
    this.room = hydrateRoomSummary(roomId, summary);
    this.pruneRoomToActiveConnections();
    return this.room;
  }

  async reconcilePersistedSummary(summary: PlainRoom): Promise<PlainRoom | null> {
    const hadPlayers = summary.players.length > 0;

    if (!this.room) {
      this.room = hydrateRoomSummary(summary.id, summary);
    }

    const liveSummary = sanitizeRoomSummary(
      cloneRoomSummary(this.room),
      { activeConnectionIds: this.getActiveConnectionIds() }
    );

    if (
      (hadPlayers && liveSummary.players.length === 0 && !liveSummary.keepAlive) ||
      (liveSummary.players.length > 0 && !hasHumanPlayers(liveSummary))
    ) {
      this.clearGameLoop();
      this.room = null;
      return null;
    }

    if (!this.room.map) {
      this.room = hydrateRoomSummary(liveSummary.id, liveSummary);
    }

    return liveSummary;
  }

  private async syncRoomSummary() {
    if (!this.room) {
      return;
    }

    const summary = cloneRoomSummary(this.room);

    if (
      (summary.players.length === 0 || !hasHumanPlayers(summary)) &&
      !summary.keepAlive
    ) {
      await this.app.deleteRoom(this.room.id);
      return;
    }

    await this.app.upsertRoom(summary);
  }

  private persistSocketAttachment(
    connectionId: string,
    roomId: string,
    playerId: string
  ) {
    this.sockets.get(connectionId)?.serializeAttachment({
      connectionId,
      roomId,
      playerId,
    });
  }

  private computeLeaderBoard() {
    if (!this.room?.map) {
      return [] as LeaderBoardTable;
    }

    return this.room.players
      .filter((player) => !player.spectating())
      .map((player) => {
        const data = this.room!.map!.getTotal(player);
        return [player.color, player.team, data.army, data.land] as LeaderBoardRow;
      });
  }

  private createInitGameInfo(player: Player): initGameInfo {
    if (!this.room?.map) {
      throw new Error('Map not initialized');
    }

    return {
      king: player.king ? { x: player.king.x, y: player.king.y } : { x: 0, y: 0 },
      mapWidth: this.room.map.width,
      mapHeight: this.room.map.height,
    };
  }

  private getPlayerByConnection(connectionId: string) {
    if (!this.room) {
      return null;
    }

    const playerIndex = getPlayerIndexBySocket(this.room, connectionId);
    if (playerIndex === -1) {
      return null;
    }

    return this.room.players[playerIndex];
  }

  private getActiveConnectionIds() {
    const connectionIds = new Set<string>();

    for (const [connectionId, socket] of this.sockets.entries()) {
      if (socket.readyState === WebSocket.OPEN) {
        connectionIds.add(connectionId);
      }
    }

    return connectionIds;
  }

  private hasConnectedPlayers() {
    return (
      this.room?.players.some(
        (player) => !player.isBot && !player.disconnected
      ) ?? false
    );
  }

  private pruneRoomToActiveConnections() {
    if (!this.room || this.room.map) {
      return;
    }

    const liveSummary = sanitizeRoomSummary(
      cloneRoomSummary(this.room),
      { activeConnectionIds: this.getActiveConnectionIds() }
    );
    this.room = hydrateRoomSummary(this.room.id, liveSummary);
  }

  private ensureConnectedHumanHost(
    previousHost: Player | null = null,
    announce = false
  ) {
    if (!this.room) {
      return null;
    }

    const nextHost =
      this.room.players.find(
        (roomPlayer) =>
          roomPlayer.isRoomHost && !roomPlayer.isBot && !roomPlayer.disconnected
      ) ??
      pickNextConnectedHumanHost(this.room) ??
      null;

    this.room.players.forEach((roomPlayer) => {
      roomPlayer.setRoomHost(nextHost ? roomPlayer.id === nextHost.id : false);
    });

    if (
      announce &&
      previousHost &&
      nextHost &&
      previousHost.id !== nextHost.id
    ) {
      this.broadcast('host_reassigned', previousHost.minify(), nextHost.minify());
    }

    return nextHost;
  }

  private clearDisconnectTimer(playerId: string) {
    const timer = this.disconnectTimers.get(playerId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }
  }

  private clearAllDisconnectTimers() {
    for (const playerId of this.disconnectTimers.keys()) {
      this.clearDisconnectTimer(playerId);
    }
  }

  private scheduleDisconnectTimer(player: Player) {
    this.clearDisconnectTimer(player.id);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(player.id);
      void this.expireDisconnectedPlayer(player.id).catch((error) => {
        console.error('disconnect grace expiration failed', serializeError(error));
      });
    }, DISCONNECT_GRACE_MS) as unknown as number;
    this.disconnectTimers.set(player.id, timer);
  }

  private async expireDisconnectedPlayer(playerId: string) {
    if (!this.room?.gameStarted) {
      return;
    }

    const player = this.room.players.find((roomPlayer) => roomPlayer.id === playerId);
    if (!player || !player.disconnected || player.spectating()) {
      return;
    }

    if (!player.isDead) {
      this.broadcast('room_message', player.minify(), 'timed out.');
      this.handleNeutralized(this.room, player);
    }

    await this.app.revokeReconnectToken(this.room.id, player.id);

    if (!this.hasConnectedPlayers()) {
      this.clearGameLoop();
      await this.finishGame(null);
      return;
    }

    this.ensureConnectedHumanHost(player.isRoomHost ? player : null, player.isRoomHost);
    this.broadcast('update_room', this.room);
    await this.syncRoomSummary();
  }

  private pauseGameLoopIfUnattended() {
    if (this.room?.gameStarted && !this.hasConnectedPlayers()) {
      this.clearGameLoop();
    }
  }

  private resumeGameLoopIfNeeded() {
    if (this.room?.gameStarted && this.hasConnectedPlayers()) {
      this.scheduleGameLoop();
    }
  }

  private async sendCurrentGameState(
    connectionId: string,
    leaderBoard: LeaderBoardTable = this.computeLeaderBoard()
  ) {
    if (!this.room?.map) {
      return;
    }

    const player = this.getPlayerByConnection(connectionId);
    if (!player || player.disconnected) {
      return;
    }

    if (!player.patchView) {
      player.patchView = new MapDiff();
    }

    if (
      (this.room.deathSpectator && player.isDead) ||
      !this.room.fogOfWar ||
      player.spectating()
    ) {
      await player.patchView.patch(this.room.map.map);
    } else {
      await player.patchView.patch(await this.room.map.getViewPlayer(player));
    }

    this.send(
      connectionId,
      'game_update',
      player.patchView.data,
      this.room.map.turn,
      leaderBoard
    );
  }

  private pickPlayerColor(room: Room) {
    const allColor = Array.from({ length: ColorArr.length }, (_, index) => index);
    const occupiedColor = room.players.map((player) => player.color);
    occupiedColor.push(0);
    return allColor.find((color) => !occupiedColor.includes(color)) ?? 1;
  }

  private pickPlayerTeam(room: Room) {
    const allTeams = Array.from({ length: MaxTeamNum }, (_, index) => index + 1);
    const occupiedTeams = room.players.map((player) => player.team);
    return allTeams.find((team) => !occupiedTeams.includes(team)) ?? 1;
  }

  private handleNeutralized(room: Room, player: Player) {
    if (player.king && room.map) {
      room.map.getBlock(player.king).kingBeDominated();
    }

    player.land.forEach((block) => {
      block.beNeutralized();
    });
    player.land.length = 0;
    player.king = null;
    player.isDead = true;
  }

  private async handleJoin(
    connectionId: string,
    roomId: string,
    username: string,
    sessionId: string,
    reconnectToken: string
  ) {
    const room = await this.ensureRoom(roomId);
    let player: Player | undefined;
    let joinMessage = 'joined the room.';
    const reconnectPlayerId = await this.app.resolveReconnectToken(
      reconnectToken,
      roomId,
      sessionId
    );

    if (reconnectPlayerId) {
      const playerIndex = getPlayerIndex(room, reconnectPlayerId);
      if (playerIndex !== -1) {
        player = room.players[playerIndex];
        this.clearDisconnectTimer(player.id);
        player.disconnected = false;
        player.socket_id = connectionId;
        player.patchView = new MapDiff();
      }
    }

    if (!player) {
      if (room.players.length >= room.maxPlayers) {
        this.send(connectionId, 'reject_join', 'The room is full.');
        this.sockets.get(connectionId)?.close(1008, 'The room is full.');
        return;
      }

      player = new Player(
        randomPlayerId(),
        connectionId,
        username,
        this.pickPlayerColor(room),
        this.pickPlayerTeam(room)
      );

      if (!hasHumanPlayers(room)) {
        player.setRoomHost(true);
        if (isFallbackRoomName(room.roomName)) {
          room.roomName = formatCreatorRoomName(username);
        }
      }

      if (room.gameStarted) {
        player.setSpectate();
        player.patchView = new MapDiff();
        joinMessage = 'joined as spectator.';
      }
      room.players.push(player);
    } else {
      joinMessage = room.gameStarted ? 'reconnected.' : 're-joined the lobby.';
    }

    this.ensureConnectedHumanHost();

    const nextReconnectToken = await this.app.issueReconnectToken(
      sessionId,
      roomId,
      player.id
    );
    this.persistSocketAttachment(connectionId, roomId, player.id);
    this.send(connectionId, 'set_player_id', player.id, nextReconnectToken);

    if (room.gameStarted) {
      this.send(connectionId, 'game_started', this.createInitGameInfo(player));
      await this.sendCurrentGameState(connectionId);
      this.resumeGameLoopIfNeeded();
    }

    this.broadcast('room_message', player.minify(), joinMessage);
    this.broadcast('update_room', room);
    await this.syncRoomSummary();
  }

  private async handleDisconnect(
    connectionId: string,
    reason: 'disconnect' | 'leave' = 'disconnect'
  ) {
    if (!this.room) {
      return;
    }

    const player = this.getPlayerByConnection(connectionId);
    if (!player || player.disconnected) {
      return;
    }

    const leavingActiveGame = this.room.gameStarted && !player.spectating();
    const shouldGraceReconnect = leavingActiveGame && reason === 'disconnect';
    this.clearDisconnectTimer(player.id);
    this.broadcast(
      'room_message',
      player.minify(),
      shouldGraceReconnect
        ? 'lost connection.'
        : leavingActiveGame
        ? 'disconnected.'
        : reason === 'leave'
          ? 'left the room.'
          : 'quit.'
    );

    if (shouldGraceReconnect) {
      player.disconnected = true;
      this.scheduleDisconnectTimer(player);
    } else if (leavingActiveGame) {
      player.disconnected = true;
      this.handleNeutralized(this.room, player);
      await this.app.revokeReconnectToken(this.room.id, player.id);
    } else {
      this.room.players = this.room.players.filter((item) => item.id !== player.id);
      await this.app.revokeReconnectToken(this.room.id, player.id);
    }

    this.room.forceStartNum = countReadyParticipants(this.room);

    if (shouldGraceReconnect) {
      this.pauseGameLoopIfUnattended();
    } else if (this.room.gameStarted && !this.hasConnectedPlayers()) {
      this.clearGameLoop();
      await this.finishGame(null);
      return;
    }

    if (!shouldGraceReconnect) {
      this.ensureConnectedHumanHost(player.isRoomHost ? player : null, player.isRoomHost);
    }

    this.broadcast('update_room', this.room);
    if (!shouldGraceReconnect) {
      await this.syncRoomSummary();
      await this.checkForcedStart();
    }
  }

  private async checkForcedStart() {
    if (!this.room) {
      return;
    }

    const target = getForceStartTarget(this.room);

    if (!this.room.gameStarted && this.room.forceStartNum >= target) {
      await this.startGame();
    }
  }

  private scheduleGameLoop() {
    if (!this.room?.gameStarted || this.gameLoopTimer !== null) {
      return;
    }

    const loop = async () => {
      this.gameLoopTimer = null;
      if (!this.room?.gameStarted) {
        return;
      }

      await this.runGameTick();

      if (this.room?.gameStarted) {
        this.gameLoopTimer = setTimeout(
          () => void loop(),
          500 / this.room.gameSpeed
        ) as unknown as number;
      }
    };

    this.gameLoopTimer = setTimeout(
      () => void loop(),
      500 / this.room.gameSpeed
    ) as unknown as number;
  }

  private clearGameLoop() {
    if (this.gameLoopTimer !== null) {
      clearTimeout(this.gameLoopTimer);
      this.gameLoopTimer = null;
    }
  }

  private async startGame() {
    if (!this.room || this.room.gameStarted) {
      return;
    }

    this.clearAllDisconnectTimers();
    this.room.players.forEach((player) => {
      player.reset();
      player.disconnected = false;
    });

    if (this.room.mapId) {
      const customMap = (await this.app.getMap(this.room.mapId, false)) as CustomMapData | null;
      if (!customMap) {
        throw new Error('Map not found');
      }
      this.room.map = GameMap.from_custom_map(
        customMap,
        this.room.players,
        this.room.revealKing
      );
    } else {
      const actualWidth = Math.ceil(
        Math.sqrt(this.room.players.length) * 5 + 12 * this.room.mapWidth
      );
      const actualHeight = Math.ceil(
        Math.sqrt(this.room.players.length) * 5 + 12 * this.room.mapHeight
      );
      this.room.map = new GameMap(
        'random_map_id',
        'random_map_name',
        actualWidth,
        actualHeight,
        this.room.mountain,
        this.room.city,
        this.room.swamp,
        this.room.players,
        this.room.revealKing
      );
      this.room.map.generate();
    }

    this.room.mapGenerated = true;
    this.room.globalMapDiff = new MapDiff();
    this.room.gameRecord = new GameRecord(
      this.room.players,
      this.room.map.width,
      this.room.map.height
    );
    this.room.gameStarted = true;

    const introMessage = 'Chat is being recorded. 欢迎来到 BlockWar / 方块战争';
    this.room.gameRecord.addMessage({
      turn: this.room.map.turn,
      player: null,
      content: introMessage,
    } as Message);

    this.broadcast('update_room', this.room);
    this.broadcast('room_message', null, introMessage);

    for (const player of this.room.players) {
      player.patchView = new MapDiff();
      this.send(player.socket_id, 'game_started', this.createInitGameInfo(player));
    }

    await this.syncRoomSummary();
    this.scheduleGameLoop();
  }

  private async runGameTick() {
    if (!this.room?.map || !this.room.gameRecord || !this.room.globalMapDiff) {
      return;
    }

    for (const player of this.room.players) {
      if (!player.isDead && !player.spectating()) {
        const block = this.room.map.getBlock(player.king!);
        const blockPlayerIndex = getPlayerIndex(this.room, block.player?.id);

        if (blockPlayerIndex !== -1) {
          if (block.player !== player && player.isDead === false) {
            this.broadcast(
              'captured',
              block.player.minify(),
              player.minify()
            );
            this.send(player.socket_id, 'game_over', block.player.minify());
            player.isDead = true;
            player.land.forEach((landBlock) => {
              this.room!.map!.transferBlock(
                landBlock,
                this.room!.players[blockPlayerIndex]
              );
              this.room!.players[blockPlayerIndex].winLand(landBlock);
            });
            this.room.map.getBlock(player.king!).kingBeDominated();
            player.land.length = 0;
          } else if (
            !player.disconnected &&
            player.operatedTurn === 0 &&
            player.operatedTurn + 160 <= this.room.map.turn
          ) {
            this.handleNeutralized(this.room, player);
            this.broadcast('room_message', player.minify(), 'surrendered');
          }
        }
      }
    }

    for (const player of this.room.players) {
      if (
        !this.room.gameStarted ||
        !player.isBot ||
        player.isDead ||
        player.spectating() ||
        player.operatedTurn >= this.room.map.turn
      ) {
        continue;
      }

      const move = planBotMove(this.room, player);
      if (!move) {
        continue;
      }

      this.room.map.moveAllMovableUnit(player, move.from, move.to);
      player.operatedTurn = this.room.map.turn;
    }

    const leaderBoard = this.computeLeaderBoard();

    for (const [connectionId] of this.sockets.entries()) {
      await this.sendCurrentGameState(connectionId, leaderBoard);
    }

    await this.room.globalMapDiff.patch(this.room.map.map);
    this.room.gameRecord.addGameUpdate(
      this.room.globalMapDiff.data,
      this.room.map.turn,
      leaderBoard
    );
    this.room.map.updateTurn();
    this.room.map.updateUnit();

    const aliveTeams = this.room.players.reduce<number[]>((teams, player) => {
      if (!player.isDead && !player.spectating() && !teams.includes(player.team)) {
        teams.push(player.team);
      }
      return teams;
    }, []);

    if (aliveTeams.length <= 1) {
      await this.finishGame(aliveTeams[0] ?? null);
    }
  }

  private async finishGame(winningTeam: number | null) {
    if (!this.room?.gameRecord) {
      return;
    }

    this.clearAllDisconnectTimers();
    const replayId = await this.app.saveReplay(
      JSON.parse(JSON.stringify(this.room.gameRecord))
    );
    const winners =
      winningTeam === null
        ? []
        : this.room.players
          .filter((player) => player.team === winningTeam)
          .map((player) => player.minify(true));

    this.broadcast('game_ended', winners, replayId);

    this.room.gameStarted = false;
    this.room.forceStartNum = 0;
    this.room.players.forEach((player) => {
      player.reset();
    });
    const removedPlayers = this.room.players.filter((player) => player.disconnected);
    this.room.players = this.room.players.filter((player) => !player.disconnected);
    for (const removedPlayer of removedPlayers) {
      await this.app.revokeReconnectToken(this.room.id, removedPlayer.id);
    }
    this.ensureConnectedHumanHost();
    this.broadcast('update_room', this.room);
    this.clearGameLoop();
    await this.syncRoomSummary();
  }

  private async handlePacket(connectionId: string, packet: SocketPacket) {
    const room = this.room;
    if (!room) {
      return;
    }

    const player = this.getPlayerByConnection(connectionId);
    const [arg1, arg2, arg3, arg4] = packet.data;

    switch (packet.type) {
      case 'ping':
        this.send(connectionId, 'pong', arg1 ?? null);
        break;
      case 'get_room_info':
      case 'reconnect':
        this.send(connectionId, 'update_room', room);
        if (room.gameStarted) {
          await this.sendCurrentGameState(connectionId);
        }
        break;
      case 'leave_room':
        await this.handleDisconnect(connectionId, 'leave');
        this.sockets.get(connectionId)?.close(1000, 'Left room');
        this.sockets.delete(connectionId);
        break;
      case 'set_team': {
        if (!player) return;
        if (room.gameStarted) {
          this.send(
            connectionId,
            'error',
            'Unable to change team',
            'Team changes are locked after the game starts.'
          );
          return;
        }

        const team = Number(arg1);
        if (!Number.isInteger(team) || team <= 0 || team > MaxTeamNum + 1) {
          this.send(
            connectionId,
            'error',
            'Unable to change team',
            `Team must be between 1 and ${MaxTeamNum} or spectators`
          );
          return;
        }

        player.team = team;
        if (player.spectating() && player.forceStart) {
          player.forceStart = false;
        }
        room.forceStartNum = countReadyParticipants(room);

        this.broadcast('update_room', room);
        this.broadcast(
          'room_message',
          player.minify(),
          player.spectating() ? 'became a spectator.' : `change to team ${team}.`
        );
        await this.syncRoomSummary();
        await this.checkForcedStart();
        break;
      }
      case 'set_player_team': {
        if (!player) return;
        if (!player.isRoomHost) {
          this.send(
            connectionId,
            'error',
            'Unable to change team',
            'You are not the room host.'
          );
          return;
        }
        if (room.gameStarted) {
          this.send(
            connectionId,
            'error',
            'Unable to change team',
            'Team changes are locked after the game starts.'
          );
          return;
        }

        const targetPlayerId = String(arg1 ?? '');
        const team = Number(arg2);
        const targetPlayer = room.players.find((roomPlayer) => roomPlayer.id === targetPlayerId);

        if (!targetPlayer) {
          this.send(
            connectionId,
            'error',
            'Unable to change team',
            'Target player not found.'
          );
          return;
        }
        if (!Number.isInteger(team) || team <= 0 || team > MaxTeamNum + 1) {
          this.send(
            connectionId,
            'error',
            'Unable to change team',
            `Team must be between 1 and ${MaxTeamNum} or spectators`
          );
          return;
        }

        targetPlayer.team = team;
        if (targetPlayer.spectating() && targetPlayer.forceStart) {
          targetPlayer.forceStart = false;
        }
        room.forceStartNum = countReadyParticipants(room);

        this.broadcast('update_room', room);
        this.broadcast(
          'room_message',
          player.minify(),
          `${targetPlayer.username} ${targetPlayer.spectating() ? 'became a spectator.' : `moved to team ${team}.`}`
        );
        await this.syncRoomSummary();
        await this.checkForcedStart();
        break;
      }
      case 'surrender': {
        if (!player) return;
        const playerId = String(arg1 ?? '');
        if (!room.gameStarted) {
          this.send(connectionId, 'error', 'Surrender failed', 'Game has not started.');
          return;
        }
        if (player.id !== playerId) {
          this.send(
            connectionId,
            'error',
            'Surrender failed',
            'You can only surrender yourself.'
          );
          return;
        }
        const playerIndex = getPlayerIndex(room, playerId);
        if (playerIndex === -1) {
          this.send(connectionId, 'error', 'Surrender failed', 'Player not found.');
          return;
        }
        if (!room.map) {
          this.send(connectionId, 'error', 'Surrender failed', 'Map not found.');
          return;
        }
        if (player.spectating() || player.isDead) {
          this.send(connectionId, 'error', 'Surrender failed', 'Player is not active.');
          return;
        }

        this.handleNeutralized(room, room.players[playerIndex]);
        this.broadcast('room_message', room.players[playerIndex].minify(), 'surrendered');
        await this.syncRoomSummary();
        break;
      }
      case 'add_bot': {
        if (!player) return;
        if (!player.isRoomHost) {
          this.send(
            connectionId,
            'error',
            'Unable to add bot',
            'You are not the room host.'
          );
          return;
        }
        if (room.gameStarted) {
          this.send(
            connectionId,
            'error',
            'Unable to add bot',
            'Bots can only be added before the game starts.'
          );
          return;
        }
        if (room.players.length >= room.maxPlayers) {
          this.send(
            connectionId,
            'error',
            'Unable to add bot',
            'The room is full.'
          );
          return;
        }

        const botId = randomPlayerId();
        const bot = createManagedBotPlayer({
          room,
          botId,
          color: this.pickPlayerColor(room),
          team: this.pickPlayerTeam(room),
        });
        room.players.push(bot);
        room.forceStartNum = countReadyParticipants(room);
        this.broadcast('update_room', room);
        this.broadcast('room_message', bot.minify(), 'joined as a bot.');
        await this.syncRoomSummary();
        await this.checkForcedStart();
        break;
      }
      case 'start_tutorial': {
        if (!player) return;
        if (room.preset !== 'tutorial') {
          this.send(
            connectionId,
            'error',
            'Unable to start tutorial',
            'This room is not a tutorial room.'
          );
          return;
        }
        if (!player.isRoomHost) {
          this.send(
            connectionId,
            'error',
            'Unable to start tutorial',
            'You are not the room host.'
          );
          return;
        }
        if (room.gameStarted) {
          this.send(
            connectionId,
            'error',
            'Unable to start tutorial',
            'The tutorial has already started.'
          );
          return;
        }
        if (player.spectating()) {
          this.send(
            connectionId,
            'error',
            'Unable to start tutorial',
            'Spectators cannot start the tutorial.'
          );
          return;
        }

        let botCount = room.players.filter(
          (roomPlayer) => roomPlayer.isBot && roomPlayer.team !== MaxTeamNum + 1
        ).length;

        while (botCount < 2) {
          if (room.players.length >= room.maxPlayers) {
            this.send(
              connectionId,
              'error',
              'Unable to start tutorial',
              'The tutorial room is full.'
            );
            return;
          }

          const botId = randomPlayerId();
          const bot = createManagedBotPlayer({
            room,
            botId,
            color: this.pickPlayerColor(room),
            team: this.pickPlayerTeam(room),
          });
          room.players.push(bot);
          this.broadcast('room_message', bot.minify(), 'joined as a bot.');
          botCount += 1;
        }

        if (!player.forceStart) {
          player.forceStart = true;
        }
        room.forceStartNum = countReadyParticipants(room);
        this.broadcast('update_room', room);
        await this.syncRoomSummary();
        await this.checkForcedStart();
        break;
      }
      case 'remove_bot': {
        if (!player) return;
        if (!player.isRoomHost) {
          this.send(
            connectionId,
            'error',
            'Unable to remove bot',
            'You are not the room host.'
          );
          return;
        }
        if (room.gameStarted) {
          this.send(
            connectionId,
            'error',
            'Unable to remove bot',
            'Bots can only be removed before the game starts.'
          );
          return;
        }

        const botId = String(arg1 ?? '');
        const botIndex = room.players.findIndex(
          (roomPlayer) => roomPlayer.id === botId && roomPlayer.isBot
        );
        if (botIndex === -1) {
          this.send(
            connectionId,
            'error',
            'Unable to remove bot',
            'Bot not found.'
          );
          return;
        }

        const [bot] = room.players.splice(botIndex, 1);
        room.forceStartNum = countReadyParticipants(room);
        this.broadcast('update_room', room);
        this.broadcast('room_message', bot.minify(), 'was removed.');
        await this.syncRoomSummary();
        await this.checkForcedStart();
        break;
      }
      case 'kick_player': {
        if (!player) return;
        if (!player.isRoomHost) {
          this.send(
            connectionId,
            'error',
            'Unable to kick player',
            'You are not the room host.'
          );
          return;
        }
        if (room.gameStarted) {
          this.send(
            connectionId,
            'error',
            'Unable to kick player',
            'Players can only be kicked before the game starts.'
          );
          return;
        }

        const targetPlayerId = String(arg1 ?? '');
        if (!targetPlayerId || targetPlayerId === player.id) {
          this.send(
            connectionId,
            'error',
            'Unable to kick player',
            'You cannot kick yourself.'
          );
          return;
        }

        const targetIndex = room.players.findIndex(
          (roomPlayer) => roomPlayer.id === targetPlayerId && !roomPlayer.isBot
        );
        if (targetIndex === -1) {
          this.send(
            connectionId,
            'error',
            'Unable to kick player',
            'Target player not found.'
          );
          return;
        }

        const [targetPlayer] = room.players.splice(targetIndex, 1);
        await this.app.revokeReconnectToken(room.id, targetPlayer.id);
        room.forceStartNum = countReadyParticipants(room);
        this.broadcast('update_room', room);
        this.broadcast('room_message', player.minify(), `kicked ${targetPlayer.username}.`);
        this.send(targetPlayer.socket_id, 'kicked', room.id);
        this.sockets.get(targetPlayer.socket_id)?.close(1000, 'Removed by host');
        await this.syncRoomSummary();
        await this.checkForcedStart();
        break;
      }
      case 'change_host': {
        if (!player) return;
        if (!player.isRoomHost) {
          this.send(
            connectionId,
            'error',
            'Host modification failed',
            'You are not the room host.'
          );
          return;
        }

        const currentHost = getPlayerIndex(room, player.id);
        const newHost = getPlayerIndex(room, String(arg1 ?? ''));
        if (newHost === -1) {
          this.send(
            connectionId,
            'error',
            'Host modification failed',
            'Target player not found.'
          );
          return;
        }
        if (room.players[newHost].isBot) {
          this.send(
            connectionId,
            'error',
            'Host modification failed',
            'Bots cannot become room hosts.'
          );
          return;
        }

        room.players[currentHost].setRoomHost(false);
        room.players[newHost].setRoomHost(true);
        this.broadcast('update_room', room);
        this.broadcast(
          'host_modification',
          player.minify(),
          room.players[newHost].minify()
        );
        await this.syncRoomSummary();
        break;
      }
      case 'change_room_setting': {
        if (!player) return;
        const property = String(arg1 ?? '');
        const value = arg2;
        if (!player.isRoomHost) {
          this.send(
            connectionId,
            'error',
            'Modification was failed',
            'You are not the game host.'
          );
          return;
        }

        if (room.gameStarted) {
          this.send(
            connectionId,
            'error',
            'Modification was failed',
            'Room settings are locked after the game starts.'
          );
          return;
        }

        if (!isConfigurableRoomSetting(property) || value === undefined) {
          this.send(
            connectionId,
            'error',
            'Modification was failed',
            `Invalid property: ${property} or value: ${String(value)}.`
          );
          return;
        }

        switch (property) {
          case 'roomName':
            if (typeof value !== 'string' || value.length > 20) {
              this.send(
                connectionId,
                'error',
                'Modification was failed',
                'Room name is too long.'
              );
              return;
            }
            break;
          case 'mapId':
            if (typeof value !== 'string' || value.length > 50) {
              this.send(
                connectionId,
                'error',
                'Modification was failed',
                'invalid MapId'
              );
              return;
            }
            if (value) {
              const map = await this.app.getMap(value, false);
              if (!map) {
                this.send(
                  connectionId,
                  'error',
                  'Modification was failed',
                  'invalid MapId'
                );
                return;
              }
              room.mapName = map.name;
            } else {
              room.mapName = '';
            }
            break;
          case 'maxPlayers':
            if (typeof value !== 'number' || value <= 1) {
              this.send(
                connectionId,
                'error',
                'Modification was failed',
                'Max player num is invalid.'
              );
              return;
            }
            break;
          case 'gameSpeed':
            if (typeof value !== 'number' || ![0.5, 0.75, 1, 2, 3, 4].includes(value)) {
              this.send(
                connectionId,
                'error',
                'Modification was failed',
                `Game speed: ${value} is invalid.`
              );
              return;
            }
            break;
          case 'mapWidth':
          case 'mapHeight':
          case 'mountain':
          case 'city':
          case 'swamp':
            if (typeof value !== 'number' || value < 0 || value > 1) {
              this.send(
                connectionId,
                'error',
                'Modification was failed',
                `Map ${property} is invalid.`
              );
              return;
            }
            break;
          case 'fogOfWar':
          case 'revealKing':
          case 'warringStatesMode':
          case 'deathSpectator':
            if (typeof value !== 'boolean') {
              this.send(
                connectionId,
                'error',
                'Modification was failed',
                'Invalid value.'
              );
              return;
            }
            break;
          default:
            break;
        }

        (room as unknown as Record<string, unknown>)[property] = value;
        this.broadcast('update_room', room);
        this.broadcast(
          'room_message',
          player.minify(),
          property === 'mapId'
            ? `changed mapName to ${room.mapName}.`
            : `changed ${property} to ${String(value)}.`
        );
        await this.syncRoomSummary();
        break;
      }
      case 'player_message': {
        if (!player) return;
        const message = String(arg1 ?? '');
        if (room.gameStarted && room.gameRecord && room.map) {
          room.gameRecord.addMessage({
            turn: room.map.turn,
            player: player.minify(),
            content: message,
          } as Message);
        }
        this.broadcast('room_message', player.minify(), `: ${message}`);
        break;
      }
      case 'force_start': {
        if (!player || player.spectating()) return;
        if (room.gameStarted) {
          this.send(
            connectionId,
            'error',
            'Unable to force start',
            'The game has already started.'
          );
          return;
        }

        player.forceStart = !player.forceStart;
        room.forceStartNum = countReadyParticipants(room);
        this.broadcast('update_room', room);
        await this.syncRoomSummary();
        await this.checkForcedStart();
        break;
      }
      case 'attack': {
        if (!player || !room.map || !room.gameStarted) return;
        const from = pointFromPayload(arg1);
        const to = pointFromPayload(arg2);
        const isHalf = arg3;
        const requestId = typeof arg4 === 'string' ? arg4 : null;

        if (!from || !to || typeof isHalf !== 'boolean') {
          this.send(connectionId, 'attack_failure', arg1 ?? null, arg2 ?? null, 'Invalid parameter type', requestId);
          return;
        }
        if (from.x < 0 || from.x >= room.map.width || from.y < 0 || from.y >= room.map.height) {
          this.send(connectionId, 'attack_failure', from, to, 'Invalid starting point', requestId);
          return;
        }
        if (to.x < 0 || to.x >= room.map.width || to.y < 0 || to.y >= room.map.height) {
          this.send(connectionId, 'attack_failure', from, to, 'Invalid ending point, out of map', requestId);
          return;
        }
        if (!isCardinalNeighbor(from, to)) {
          this.send(connectionId, 'attack_failure', from, to, 'Invalid ending point, not adjacent', requestId);
          return;
        }

        const canAttack =
          player.operatedTurn < room.map.turn &&
          room.map.commendable(player, from, to);

        if (canAttack) {
          if (isHalf) {
            room.map.moveHalfMovableUnit(player, from, to);
          } else {
            room.map.moveAllMovableUnit(player, from, to);
          }
          player.operatedTurn = room.map.turn;
          this.send(connectionId, 'attack_success', from, to, room.map.turn, requestId);
        } else {
          this.send(
            connectionId,
            'attack_failure',
            from,
            to,
            `Invalid operation: ${player.operatedTurn} ${room.map.turn} ${canAttack}`,
            requestId
          );
        }
        break;
      }
      default:
        break;
    }
  }
}
