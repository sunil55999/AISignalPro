import { apiRequest } from "./queryClient";

export const signalApi = {
  parseSignal: async (data: { rawText: string; source: string; channelName?: string; messageId?: string }) => {
    const response = await apiRequest("POST", "/api/parse-signal", data);
    return response.json();
  },

  getSignals: async (limit?: number) => {
    const url = limit ? `/api/signals?limit=${limit}` : "/api/signals";
    const response = await apiRequest("GET", url);
    return response.json();
  },

  getSignalById: async (id: number) => {
    const response = await apiRequest("GET", `/api/signals/${id}`);
    return response.json();
  },
};

export const ruleApi = {
  getRules: async () => {
    const response = await apiRequest("GET", "/api/manual-rules");
    return response.json();
  },

  createRule: async (data: any) => {
    const response = await apiRequest("POST", "/api/manual-rules", data);
    return response.json();
  },

  updateRule: async (id: number, data: any) => {
    const response = await apiRequest("PUT", `/api/manual-rules/${id}`, data);
    return response.json();
  },

  deleteRule: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/manual-rules/${id}`);
    return response.json();
  },
};

export const trainingApi = {
  getTrainingData: async () => {
    const response = await apiRequest("GET", "/api/training-data");
    return response.json();
  },

  createTrainingData: async (data: any) => {
    const response = await apiRequest("POST", "/api/training-data", data);
    return response.json();
  },

  updateTrainingData: async (id: number, data: any) => {
    const response = await apiRequest("PUT", `/api/training-data/${id}`, data);
    return response.json();
  },

  deleteTrainingData: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/training-data/${id}`);
    return response.json();
  },
};

export const statsApi = {
  getStats: async () => {
    const response = await apiRequest("GET", "/api/stats");
    return response.json();
  },
};
