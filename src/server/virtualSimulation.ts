import crypto from 'crypto';
import { calculateMultiplier } from '../utils/paytable.ts';

export interface VirtualTicket {
  id: string;
  drawId: string;
  userName: string;
  userMasked: string;
  phoneMasked: string;
  chosenNumbers: number[];
  stake: number;
  timestamp: string;
  secondPlaced: number; // 0 to 45
  status: 'waiting' | 'win' | 'loss';
  payout?: number;
  matchedCount?: number;
  multiplier?: number;
}

const ETHIOPIAN_NAMES = [
  'Abebe B.', 'Tadesse K.', 'Almaz T.', 'Selamawit G.', 'Dawit M.',
  'Kassahun W.', 'Yohannes H.', 'Hirut D.', 'Getachew A.', 'Mesfin T.',
  'Bethelhem Y.', 'Nebiyu S.', 'Tigist M.', 'Eskinder F.', 'Rahel T.',
  'Desta Z.', 'Binyam A.', 'Aster K.', 'Mulugeta T.', 'Hiwot B.',
  'Kiros G.', 'Mekonnen D.', 'Genet W.', 'Fikru L.', 'Worknesh S.',
  'Solomon T.', 'Zenebech M.', 'Fasika B.', 'Temesgen K.', 'Tsehay A.',
  'Henok M.', 'Lidya Z.', 'Kalkidan E.', 'Haile G.', 'Ermias T.',
  'Senait R.', 'Berhanu J.', 'Tsion W.', 'Natnael K.', 'Biruk M.',
  'Rediet S.', 'Eyob D.', 'Helen F.', 'Yared B.', 'Amen T.',
  'Ephrem A.', 'Samrawit L.', 'Robel K.', 'Meron N.', 'Tamirat H.'
];

const ETHIOPIAN_PHONE_PREFIXES = ['091', '092', '093', '094', '095', '096', '097', '098', '071', '079'];

function generateEthiopianPhoneHandle(): string {
  const prefix = ETHIOPIAN_PHONE_PREFIXES[Math.floor(Math.random() * ETHIOPIAN_PHONE_PREFIXES.length)];
  const last3 = String(Math.floor(100 + Math.random() * 900));
  return `${prefix}****${last3}`;
}

const STAKE_DISTRIBUTION = [5, 5, 10, 10, 10, 20, 20, 20, 50, 50, 100, 100, 250];
const SPOT_DISTRIBUTION = [2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 8, 10, 10];

export class VirtualSimulationEngine {
  private currentDrawId: string = '';
  private targetPlayersCount: number = 750;
  private virtualTickets: VirtualTicket[] = [];

  constructor() {
    this.initRound('890253779');
  }

  public initRound(drawId: string) {
    this.currentDrawId = drawId;
    // Generate between 500 and 1,000 players per round
    this.targetPlayersCount = Math.floor(520 + Math.random() * 460); // 520 - 980
    this.virtualTickets = [];

    const now = new Date();

    for (let i = 0; i < this.targetPlayersCount; i++) {
      const name = ETHIOPIAN_NAMES[Math.floor(Math.random() * ETHIOPIAN_NAMES.length)];
      const phone = generateEthiopianPhoneHandle();
      const pickCount = SPOT_DISTRIBUTION[Math.floor(Math.random() * SPOT_DISTRIBUTION.length)];

      const numbers: number[] = [];
      while (numbers.length < pickCount) {
        const r = crypto.randomInt(1, 81);
        if (!numbers.includes(r)) numbers.push(r);
      }
      numbers.sort((a, b) => a - b);

      const stake = STAKE_DISTRIBUTION[Math.floor(Math.random() * STAKE_DISTRIBUTION.length)];
      // Stagger placement across the 45s betting window
      // Bias slightly towards middle and late seconds
      const secondPlaced = Math.min(44, Math.floor(Math.pow(Math.random(), 0.7) * 45));

      const ticketTime = new Date(now.getTime() - (45 - secondPlaced) * 1000);
      const timeStr = ticketTime.toTimeString().split(' ')[0];

      this.virtualTickets.push({
        id: `vt_${drawId}_${i + 1}`,
        drawId,
        userName: name,
        userMasked: `${phone.slice(0, 3)}***${phone.slice(-3)}`,
        phoneMasked: phone,
        chosenNumbers: numbers,
        stake,
        timestamp: timeStr,
        secondPlaced,
        status: 'waiting',
      });
    }

    // Sort by secondPlaced descending so newest appear at top
    this.virtualTickets.sort((a, b) => b.secondPlaced - a.secondPlaced);
  }

  public getRoundState(drawId: string, timeRemaining: number, phase: 'betting' | 'drawing' | 'reset', drawnNumbers: number[] = []) {
    if (this.currentDrawId !== drawId) {
      this.initRound(drawId);
    }

    // Calculate how many tickets have been placed so far in this 45s betting window
    let visibleCount = this.targetPlayersCount;
    if (phase === 'betting') {
      const elapsed = Math.max(0, 45 - timeRemaining);
      // Gradually reveal tickets from 0 to targetPlayersCount
      const progress = Math.min(1.0, elapsed / 45);
      // Starts with base ~12% then reaches 100% at 0s
      const ratio = 0.12 + 0.88 * Math.pow(progress, 0.9);
      visibleCount = Math.min(this.targetPlayersCount, Math.max(65, Math.round(this.targetPlayersCount * ratio)));
    }

    // Slice tickets that have been placed up to this second
    const activeTickets = this.virtualTickets.slice(0, visibleCount);

    // If drawing or finished, evaluate hits in real time for visible tickets
    if (drawnNumbers.length > 0) {
      activeTickets.forEach((t) => {
        const matches = t.chosenNumbers.filter((n) => drawnNumbers.includes(n));
        t.matchedCount = matches.length;
        const mult = calculateMultiplier(t.chosenNumbers.length, matches.length);
        t.multiplier = mult;
        t.payout = Math.round(t.stake * mult);

        if (phase === 'drawing') {
          t.status = mult > 0 ? 'win' : 'waiting';
        } else if (phase === 'reset') {
          t.status = mult > 0 ? 'win' : 'loss';
        }
      });
    }

    // Return the active tickets (top 40 for rendering performance) and total dynamic count
    return {
      totalCount: visibleCount,
      targetCount: this.targetPlayersCount,
      bets: activeTickets.slice(0, 35).map((t) => ({
        id: t.id,
        userMasked: t.phoneMasked,
        userName: t.userName,
        chosenNumbers: t.chosenNumbers,
        stake: t.stake,
        status: t.status,
        payout: t.payout || 0,
        matchedCount: t.matchedCount || 0,
        timeAgo: 'Just now',
      })),
    };
  }
}

export const virtualSimulation = new VirtualSimulationEngine();
