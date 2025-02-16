export interface ComputeDevice {
  resourceId: string;
  model: string;
  serialNumber: string;
  resourceState: string;
  powerStatus: string;
  cpus: number;
  totalMemoryInMb: number;
  gpus: number;
  gpuInfo?: GpuInfo[];
  hostOs?: string;
  datacenter?: string;
  cluster?: string;
  driveHealthStatus?: string;
  fanHealthStatus?: string;
  temperatureHealthStatus?: string;
  powerSupplyHealthStatus?: string;
  bmcFirmwareVersion?: string;
  biosFirmwareVersion?: string;
  cpldFirmwareVersion?: string;
}

export interface GpuInfo {
  model: string;
  vendor: string;
  memorySizeInKB: string;
}

export interface GeoInformation {
  latitude: number;
  longitude: number;
}

export interface UcpSystem {
  resourceId: string;
  name: string;
  model: string;
  serialNumber: string;
  region: string;
  gatewayAddress: string;
  resourceState: string;
  computeDevices: ComputeDevice[];
  storageDevices: any[];
  ethernetSwitches: any[];
  fibreChannelSwitches: any[];
  geoInformation: GeoInformation;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

function getApiBaseUrl() {
  const apiUrl = localStorage.getItem('apiUrl');
  if (!apiUrl) throw new Error('API URL is not configured');
  return apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;
}

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const bearerToken = localStorage.getItem('bearerToken');
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      ...(bearerToken ? { 'Authorization': `Bearer ${bearerToken}` } : {}),
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'API request failed');
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return { 
      data: (Array.isArray(options.body) ? [] : {}) as T, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

export async function fetchInfrastructureStatus(): Promise<ApiResponse<UcpSystem[]>> {
  return fetchWithAuth<UcpSystem[]>('/porcelain/v2/systems');
}

interface AuthResponse {
  token: string;
}

export async function authenticate(username: string, password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await fetchWithAuth<AuthResponse>('/porcelain/v2/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (error || !data.token) {
      return { success: false, message: error || 'Authentication failed' };
    }

    localStorage.setItem('bearerToken', data.token);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Network error during authentication' 
    };
  }
}

interface PowerStateResponse {
  success: boolean;
  message?: string;
}

export async function setComputePowerState(resourceId: string, action: 'ON' | 'OFF' | 'CYCLE'): Promise<{ error?: string }> {
  const { error } = await fetchWithAuth<PowerStateResponse>(`/porcelain/v2/compute/devices/${resourceId}/powerState`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });

  return { error };
}
