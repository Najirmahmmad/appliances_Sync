import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuthUser {
  username: string;
  role: "user" | "admin";
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export const KEYS = {
  AUTH: "authUser",
  SESSION: "session_",
  LOCATIONS: "locations_",
};

export const saveData = async (key: string, value: any): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const getData = async (key: string): Promise<any> => {
  const value = await AsyncStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};

export const clearAuthData = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.AUTH);
};

export default function IgnoreMe() { return null; }
