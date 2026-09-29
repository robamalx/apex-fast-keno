export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface Ticket {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  userMasked: string;
  chosenNumbers: number[];
  stake: number;
  timestamp: string;
  status: 'waiting' | 'win' | 'loss';
  payout?: number;
  matchedCount?: number;
  drawnNumbers?: number[];
  multiplier?: number;
}

export interface DrawResult {
  drawId: string;
  timestamp: string;
  drawnNumbers: number[];
  totalBets?: number;
  winnersCount?: number;
}

export interface CommunityBet {
  id: string;
  userMasked: string;
  chosenNumbers: number[];
  stake: number;
  status: 'waiting' | 'win' | 'loss';
  payout?: number;
  timeAgo: string;
}

export interface GameState {
  balance: number;
  currentDrawId: string;
  timeRemainingSeconds: number;
  isDrawing: boolean;
  activeNumbers: number[]; // User's currently selected numbers (max 10)
  currentStake: number;
  lastDrawResult?: {
    drawId: string;
    drawnNumbers: number[];
    matchedNumbers: number[];
    payout: number;
    multiplier: number;
    win: boolean;
  };
  myTickets: Ticket[];
  myBetsHistory: Ticket[];
  recentDraws: DrawResult[];
  hotNumbers: number[];
  coldNumbers: number[];
}
