import axios from "axios";

const axiosClient = axios.create({
  // baseURL: "http://43.248.33.178:8002/api/",
  baseURL: "https://f1softs.com/api/",
  timeout: 10000,
});

// Mocking apiConfig if you have headers like Authorization
const apiConfig = () => ({
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = {
  // Your existing POST logic
  create: async (url, data) => {
    return axiosClient.post(url, data || "");
  },

  // Your existing GET logic with query string builder
  get: async (url, params) => {
    const queryString = params
      ? `?${Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join("&")}`
      : "";
    return axiosClient.get(`${url}${queryString}`, apiConfig());
  },
};

export default function IgnoreMe() { return null; }
