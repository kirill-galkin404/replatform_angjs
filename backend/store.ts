// in-memory state + synchronous flat-file persistence against DB_FILE
import * as fs from 'fs';

export interface HistoryEntry {
  t: number;
  op: string;
  val: number;
}

export interface StoreState {
  count: number;
  history: HistoryEntry[];
}

const DB_FILE = process.env.DB_FILE || './data.json';

export const state: StoreState = { count: 0, history: [] };

// load on boot - defaults to count=0, history=[] on any read/parse error
export function load(): void {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const obj = JSON.parse(raw);
    state.count = obj.count;
    state.history = obj.history;
  } catch (e) {
    state.count = 0;
    state.history = [];
  }
}

export function save(): void {
  fs.writeFileSync(DB_FILE, JSON.stringify({ count: state.count, history: state.history }));
}

load();
