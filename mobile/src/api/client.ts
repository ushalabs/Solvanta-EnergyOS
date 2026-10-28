import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_TOKEN_KEY = '@solvanta_auth_token';

export function getBaseApiUrl(): string {
  // 1. Explicit environment override (physical device LAN or custom cloud endpoint)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }

  // 2. Android emulator host loopback address
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }

  // 3. Fallback for iOS simulator and Web preview
  return 'http://localhost:8000/api/v1';
}

export interface ApiProblemDetails {
  error?: {
    code: string;
    message: string;
    status: number;
    details?: Array<{ field?: string; issue?: string }>;
    timestamp?: string;
  };
  detail?: string;
}

export class SolvantaApiError extends Error {
  status: number;
  data: ApiProblemDetails;

  constructor(status: number, data: ApiProblemDetails) {
    const message = data.error?.message || data.detail || `API request failed with status ${status}`;
    super(message);
    this.name = 'SolvantaApiError';
    this.status = status;
    this.data = data;
  }
}

export interface BuildingPayload {
  name: string;
  address?: string;
  timezone?: string;
  pv_capacity_kwp: number;
  inverter_rating_kw: number;
  battery: {
    nominal_capacity_kwh: number;
    usable_capacity_kwh: number;
    initial_soc_pct: number;
    minimum_soc_pct: number;
    max_charge_kw: number;
    max_discharge_kw: number;
    round_trip_efficiency: number;
  };
}

export class SolvantaApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getBaseApiUrl();
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  async clearToken(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }

  async request<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    const token = await this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      if (!response.ok) {
        let errorData: ApiProblemDetails;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText };
        }
        throw new SolvantaApiError(response.status, errorData);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (err: any) {
      if (err instanceof SolvantaApiError) {
        throw err;
      }
      if (err?.name === 'AbortError') {
        throw new SolvantaApiError(408, {
          error: {
            code: 'REQUEST_TIMEOUT',
            message: `API request timed out after ${timeoutMs}ms: ${url}`,
            status: 408,
          },
          detail: `API request timed out after ${timeoutMs}ms`,
        });
      }
      throw new SolvantaApiError(0, {
        error: {
          code: 'NETWORK_ERROR',
          message: `Network failure connecting to ${url}: ${err?.message || 'Host unreachable'}`,
          status: 0,
        },
        detail: `Network failure connecting to ${url}`,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async get<T>(endpoint: string, timeoutMs?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, timeoutMs);
  }

  async post<T>(endpoint: string, body?: unknown, timeoutMs?: number): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }, timeoutMs);
  }

  async patch<T>(endpoint: string, body?: unknown, timeoutMs?: number): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }, timeoutMs);
  }

  async delete<T>(endpoint: string, timeoutMs?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, timeoutMs);
  }

  // Domain shortcuts
  async getHealth() {
    return this.get<{ status: string; version: string; environment: string; timestamp: string }>('/system/health');
  }

  async getReady() {
    return this.get<{ ready: boolean; database: string; engines: string; timestamp: string }>('/system/ready');
  }

  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const data = await this.request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (data.access_token) {
      await this.setToken(data.access_token);
    }
    return data;
  }

  async getCurrentUser() {
    return this.get<{ id: string; email: string; full_name: string; role: string; is_superuser: boolean }>('/auth/me');
  }

  async getBuildings() {
    return this.get<Array<BuildingPayload & { id: string; owner_id: string; organization_id?: string }>>('/buildings');
  }

  async getBuilding(buildingId: string) {
    return this.get<BuildingPayload & { id: string; owner_id: string; organization_id?: string }>(`/buildings/${buildingId}`);
  }

  async createBuilding(payload: BuildingPayload) {
    return this.post<BuildingPayload & { id: string; owner_id: string; organization_id?: string }>('/buildings', payload);
  }
}

export const api = new SolvantaApiClient();
