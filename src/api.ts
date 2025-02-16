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
  isFirmwareAtRecommended?: boolean;
  processorHealthStatus?: string;
  healthStatus: string; 
  serverLabel?: string; 
  network?: {
    hostName?: string; 
  };
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
  region?: string;
  gatewayAddress: string;
  resourceState: string;
  computeDevices?: ComputeDevice[];
  storageDevices: any[];
  ethernetSwitches: any[];
  fibreChannelSwitches: any[];
  geoInformation: {
    geoLocation?: string;
    country?: string;
    zipcode?: string;
    latitude?: string;
    longitude?: string;
    resourceId: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface Alert {
  device: string;
  issue: string;
}

function getApiBaseUrl(): string {
  const apiUrl = localStorage.getItem('apiUrl');
  if (!apiUrl) throw new Error('API URL is not configured');
  return apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;
}

/**
 * Universal API fetch function with authentication
 */
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

    if (response.status === 401) {
      console.error('Token expired or unauthorized. Logging out.');
      logout(); // Automatically logout on 401 Unauthorized
      return { data: {} as T, error: 'Unauthorized - Logged out' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'API request failed');
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return { 
      data: {} as T, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}


/**
 * ✅ Authenticate with UCP Advisor API (DO NOT USE `fetchWithAuth`)
 */
export async function authenticate(username: string, password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/porcelain/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!data.data?.token) throw new Error('Invalid authentication response: No token received.');

    localStorage.setItem('bearerToken', data.data.token);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Network error during authentication' 
    };
  }
}

export function logout() {
  localStorage.removeItem('bearerToken');
  localStorage.removeItem('apiUrl'); // Optional: Clear API URL if necessary
  window.location.href = '/login'; // Redirect to login page
}

/**
 * ✅ Fetch all UCP Systems
 */
export async function fetchUcpSystems(): Promise<{ data: UcpSystem[]; error?: string }> {
  try {
    const response = await fetchWithAuth<{ data: { data: UcpSystem[] } }>('/porcelain/v2/systems');
    
    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error("❌ API response 'data' is not an array:", response);
      throw new Error("API response 'data' is not an array");
    }

    return { data: response.data.data };  // ✅ Extract correct array
  } catch (error) {
    console.error("❌ fetchUcpSystems Error:", error);
    return { data: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}


/**
 * ✅ Fetch all Compute Devices from all UCP Systems
 */
export async function fetchComputeDevices(): Promise<ApiResponse<ComputeDevice[]>> {
  const response = await fetchWithAuth<{ data: ComputeDevice[] }>('/porcelain/v2/compute/devices');

  if (response.error) return { data: [], error: response.error };

  if (!response.data || !Array.isArray(response.data.data)) {
    console.error("❌ API response 'data' is not an array:", response);
    return { data: [], error: "Invalid API response format" };
  }

  return { data: response.data.data }; // ✅ Extract the actual array
}


/**
 * ✅ Fetch Compute Device Power State
 */
export async function setComputePowerState(resourceId: string, action: 'ON' | 'OFF' | 'CYCLE'): Promise<{ error?: string }> {
  return fetchWithAuth(`/porcelain/v2/compute/devices/${resourceId}/powerState`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });
}

// ✅ Fetch Firmware Compliance Data
export async function fetchFirmwareCompliance() {
  try {
    const computeDevicesResponse = await fetchComputeDevices();
    if (computeDevicesResponse.error) {
      throw new Error(computeDevicesResponse.error);
    }

    const computeDevices = computeDevicesResponse.data;
    const compliantCount = computeDevices.filter(device => device.isFirmwareAtRecommended).length;
    const nonCompliantCount = computeDevices.length - compliantCount;

    return {
      data: {
        total: computeDevices.length,
        compliant: compliantCount,
        nonCompliant: nonCompliantCount
      }
    };
  } catch (error: unknown) {
    let errorMessage = 'Failed to fetch firmware compliance data';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { error: errorMessage };
}
}

// ✅ Fetch Recent Alerts
export async function fetchRecentAlerts(): Promise<ApiResponse<{ device: ComputeDevice; alert: string }[]>> {
  try {
    const computeResponse = await fetchComputeDevices();
    if (computeResponse.error) return { data: [], error: computeResponse.error };

    const alerts: { device: ComputeDevice; alert: string }[] = [];

    computeResponse.data.forEach((device) => {
      const healthFields = [
        "driveHealthStatus",
        "fanHealthStatus",
        "temperatureHealthStatus",
        "voltageHealthStatus",
        "processorHealthStatus",
        "powerSupplyHealthStatus",
      ];

      healthFields.forEach((field) => {
        const status = (device as any)[field]; // Access dynamically
        if (status && status !== "NORMAL") {
          alerts.push({
            device,
            alert: `${field.replace(/([A-Z])/g, " $1")}: ${status}`, // Format "powerSupplyHealthStatus" → "Power Supply Health Status"
          });
        }
      });
    });

    return { data: alerts };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Failed to fetch alerts" };
  }
}

// ✅ Fetch Active Tasks
export async function fetchActiveTasks(): Promise<ApiResponse<{ id: string; name: string; status: string; startTime: string }[]>> {
  try {
    const response = await fetchWithAuth<{ data?: { id: string; name: string; status: string; startTime: string }[] }>('/porcelain/v2/tasks');
    if (response.error) return { data: [], error: response.error };

    // Ensure `response.data` is an array before filtering
    if (!Array.isArray(response.data)) {
      return { data: [], error: "Invalid API response: Expected an array but received something else" };
    }

    // Filter tasks that are not completed
    const activeTasks = response.data.filter(task => 
      task.status && task.status.toLowerCase() !== "completed"
    );

    return { data: activeTasks };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Failed to fetch active tasks" };
  }
}
