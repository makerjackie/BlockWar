import { LeaderBoardTable, MapDiffData, Message, Player, GameRecordPerTurn } from './types';

class GameRecord {
  public gameRecordTurns: Array<GameRecordPerTurn> = [];
  public messagesRecord: Array<Message> = [];

  constructor(
    public players: Player[],
    public mapWidth: number,
    public mapHeight: number,
  ) { }

  addGameUpdate(
    data: MapDiffData,
    turn: number,
    lead: LeaderBoardTable
  ): void {
    this.gameRecordTurns.push({ data, turn, lead });
  }

  addMessage(message: Message): void {
    this.messagesRecord.push(message);
  }
}

export default GameRecord;
