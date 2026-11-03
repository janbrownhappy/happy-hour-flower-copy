import { base44 } from '@/api/base44Client';

// Calls the server-authoritative stop manager; surfaces its error message.
export async function truckStopAction(action, payload = {}) {
  try {
    const res = await base44.functions.invoke('manageTruckStops', { action, ...payload });
    return res.data;
  } catch (e) {
    const err = new Error(e?.response?.data?.error || e.message || 'Something went wrong');
    err.code = e?.response?.data?.code;
    throw err;
  }
}