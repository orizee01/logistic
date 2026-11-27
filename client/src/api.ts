export type Role = 'customer' | 'rider' | 'admin' | 'dispatcher';
export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Delivery {
  id: string;
  trackingCode: string;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  recipient: { name: string; phone: string };
  package: { description: string; weightKg: number | null };
  notes: string | null;
  rider: { id: string; name: string; phone: string } | null;
  customer?: { id: string; name: string; email: string };
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  history?: HistoryEntry[];
}

export interface HistoryEntry {
  fromStatus: DeliveryStatus | null;
  toStatus: DeliveryStatus;
  changedBy: 'customer' | 'staff' | 'rider' | 'system';
  note: string | null;
  at: string;
}

export interface Rider {
  id: string;
  name: string;
  email: string;
  phone: string;
  isAvailable: boolean;
  isActivated: boolean;
  activeDeliveries: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

// Without an explicit API origin, call the API under the same base path the app is served from.
const API_ROOT = import.meta.env.VITE_API_URL || import.meta.env.BASE_URL.replace(/\/$/, '');
const BASE_URL = `${API_ROOT}/api/v1`;

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && authToken) {
      onUnauthorized?.();
    }
    const error = data?.error;
    const message = error?.details?.[0]?.message ?? error?.message ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message, error?.details);
  }

  return data as T;
}

export interface DeliverySummary {
  total: number;
  pending: number;
  onTheWay: number;
  delivered: number;
  cancelled: number;
}
