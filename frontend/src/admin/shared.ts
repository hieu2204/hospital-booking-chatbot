export interface AdminSession {
  id: number;
  department_id: number;
  department: string;
  doctor: string;
  substitute: string | null;
  room: string;
  service_type: string;
  start_time: string;
  end_time: string;
  status: "open" | "locked";
  booked: number;
  capacity: number;
}

export type Usage = Record<
  string,
  { turns: number; input: number; output: number; cache_read: number; cache_write: number; cost_usd: number }
>;

export function totalCost(usage: Usage | null): number {
  return Object.values(usage ?? {}).reduce((sum, row) => sum + row.cost_usd, 0);
}
