import { EventEmitter } from "events";

export interface RealtimePayload {
  type:
    | "ORDER_CREATED"
    | "ORDER_UPDATED"
    | "MENU_UPDATED"
    | "SETTINGS_UPDATED"
    | "TABLE_UPDATED";
  orderId?: number;
  orderNumber?: number;
  tableCode?: string;
  status?: string;
  timestamp: string;
}

class RealtimeBus extends EventEmitter {
  emitEvent(payload: Omit<RealtimePayload, "timestamp">) {
    const fullPayload: RealtimePayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    this.emit("realtime", fullPayload);
  }
}

const globalForEvents = globalThis as unknown as {
  amorinoRealtimeBus?: RealtimeBus;
};

export const realtimeBus =
  globalForEvents.amorinoRealtimeBus || new RealtimeBus();
realtimeBus.setMaxListeners(200);

if (!globalForEvents.amorinoRealtimeBus) {
  globalForEvents.amorinoRealtimeBus = realtimeBus;
}
