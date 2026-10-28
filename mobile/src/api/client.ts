import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_TOKEN_KEY = '@solvanta_auth_token';

export function getBaseApiUrl(): string {
  if (Platform.OS === 'android') {
    // Android emulator host loopback address
    return 'http://10.0.2.2:8000/api/v1';
  }
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    const token = await this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
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
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
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
    return this.get<{ id: string; email: string; full_name: string; role: string }>('/auth/me');
  }

  async getBuildings() {
    return this.get<Array<{
      id: string;
      name: string;
      address?: string;
      pv_capacity_kwp: number;
      inverter_rating_kw: number;
      battery_nominal_kwh: number;
      battery_usable_kwh: number;
      battery_initial_soc_pct: number;
      battery_min_soc_pct: number;
      battery_max_charge_kw: number;
      battery_max_discharge_kw: number;
      battery_round_trip_efficiency: number;
    }>>('/buildings');
  }

  async getBuilding(buildingId: string) {
    return this.get<any>(`/buildings/${buildingId}`);
  }
}

export const api = new SolvantaApiClient();
