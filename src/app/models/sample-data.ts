import { Transaction } from './models';
import { isoDay, uid } from './format';

function mulberry32(seed: number) {
  let s = seed;
  return function (): number {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DESCS: Record<string, string[]> = {
  housing: ['Monthly rent', 'Renters insurance', 'HOA fee'],
  food: ["Groceries — Fresh Market", "Groceries — Trader Joe's", 'Coffee shop', 'Takeout dinner', 'Farmers market'],
  transport: ['Gas station', 'Transit pass', 'Rideshare', 'Parking', 'Car maintenance'],
  shopping: ['Clothing store', 'Online order', 'Home goods', 'Electronics', 'Bookstore'],
  entertainment: ['Streaming subscription', 'Movie tickets', 'Concert tickets', 'Video game', 'Music subscription'],
  health: ['Pharmacy', 'Gym membership', 'Doctor visit', 'Dental checkup'],
  bills: ['Electric bill', 'Internet & phone', 'Water bill', 'Insurance premium'],
  other: ['Gift', 'Donation', 'Miscellaneous', 'Bank fee'],
  salary: ['Paycheck — Acme Corp'],
  freelance: ['Freelance project', 'Consulting invoice'],
  investment: ['Dividend payout', 'Interest income'],
  'other-inc': ['Refund', 'Cash gift', 'Side sale'],
};

function randChoice(rng: () => number, arr: string[]): string {
  return arr[Math.floor(rng() * arr.length)];
}
function randBetween(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

export function generateSampleData(): { transactions: Transaction[]; budgets: Record<string, number> } {
  const rng = mulberry32(20240914);
  const txns: Transaction[] = [];
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 12, 1);

  for (const cursor = new Date(start); cursor <= today; cursor.setMonth(cursor.getMonth() + 1)) {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const monthEnd = new Date(y, m + 1, 0);
    const lastDay = Math.min(
      monthEnd.getDate(),
      today.getMonth() === m && today.getFullYear() === y ? today.getDate() : monthEnd.getDate(),
    );
    const push = (day: number, type: 'income' | 'expense', category: string, amount: number, desc: string) => {
      const d = new Date(y, m, Math.min(day, lastDay));
      if (d > today) return;
      txns.push({ id: uid(), date: isoDay(d), type, category, amount: Math.round(amount * 100) / 100, description: desc });
    };

    // Income
    push(1, 'income', 'salary', randBetween(rng, 2350, 2550), randChoice(rng, DESCS['salary']));
    if (lastDay >= 15) push(15, 'income', 'salary', randBetween(rng, 2350, 2550), randChoice(rng, DESCS['salary']));
    if (rng() < 0.3) push(Math.ceil(randBetween(rng, 5, 25)), 'income', 'freelance', randBetween(rng, 200, 950), randChoice(rng, DESCS['freelance']));
    if (rng() < 0.4) push(Math.ceil(randBetween(rng, 3, 20)), 'income', 'investment', randBetween(rng, 40, 310), randChoice(rng, DESCS['investment']));
    if (rng() < 0.15) push(Math.ceil(randBetween(rng, 5, 25)), 'income', 'other-inc', randBetween(rng, 30, 220), randChoice(rng, DESCS['other-inc']));

    // Fixed expenses
    push(1, 'expense', 'housing', randBetween(rng, 1400, 1520), randChoice(rng, DESCS['housing']));
    push(5, 'expense', 'bills', randBetween(rng, 110, 230), 'Electric bill');
    push(8, 'expense', 'bills', randBetween(rng, 60, 95), 'Internet & phone');

    // Groceries — weekly
    for (let w = 0; w < 4; w++) {
      push(Math.min(3 + w * 7 + Math.floor(randBetween(rng, 0, 3)), 28), 'expense', 'food', randBetween(rng, 35, 105), randChoice(rng, DESCS['food']));
    }
    if (rng() < 0.5) push(Math.ceil(randBetween(rng, 1, 28)), 'expense', 'food', randBetween(rng, 8, 35), 'Coffee shop');

    // Transport
    const transportTrips = 2 + Math.floor(randBetween(rng, 0, 3));
    for (let t = 0; t < transportTrips; t++) {
      push(Math.ceil(randBetween(rng, 1, 28)), 'expense', 'transport', randBetween(rng, 22, 85), randChoice(rng, DESCS['transport']));
    }

    // Entertainment
    push(Math.ceil(randBetween(rng, 1, 10)), 'expense', 'entertainment', randBetween(rng, 12, 20), 'Streaming subscription');
    if (rng() < 0.6) push(Math.ceil(randBetween(rng, 10, 28)), 'expense', 'entertainment', randBetween(rng, 20, 110), randChoice(rng, DESCS['entertainment']));

    // Shopping
    const shoppingTrips = Math.floor(randBetween(rng, 1, 4));
    for (let s = 0; s < shoppingTrips; s++) {
      push(Math.ceil(randBetween(rng, 1, 28)), 'expense', 'shopping', randBetween(rng, 25, 240), randChoice(rng, DESCS['shopping']));
    }

    // Health
    if (rng() < 0.7) push(Math.ceil(randBetween(rng, 1, 28)), 'expense', 'health', randBetween(rng, 15, 75), 'Gym membership');
    if (rng() < 0.35) push(Math.ceil(randBetween(rng, 1, 28)), 'expense', 'health', randBetween(rng, 20, 190), randChoice(rng, DESCS['health']));

    // Other
    if (rng() < 0.4) push(Math.ceil(randBetween(rng, 1, 28)), 'expense', 'other', randBetween(rng, 10, 150), randChoice(rng, DESCS['other']));
  }

  txns.sort((a, b) => a.date.localeCompare(b.date));
  const budgets: Record<string, number> = {
    housing: 1550, food: 500, transport: 280, shopping: 300, entertainment: 150, health: 150, bills: 260, other: 100,
  };
  return { transactions: txns, budgets };
}
