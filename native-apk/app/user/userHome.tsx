import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as TaskManager from "expo-task-manager";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, ScrollView, Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { apiClient } from "../admin/api/apiClient";
import { buildQueryString } from "../admin/api/helper";
import BottomMenu from "../components/BottomMenu";
import DashboardStats from "../components/DashboardStats";
import { addUserLocation } from "../store/slice/locationSlice";

// Global variable to track last background location
let lastBackgroundCoords = { lat: 0, lng: 0 };
const COORDINATE_THRESHOLD = 0.0001; // Optional: prevents tiny GPS jitters

const LOCATION_TASK_NAME = "background-location-task";

// --- STATIC USER DATA (Moved outside to be accessible by TaskManager) ---
const STATIC_USER = {
  sync_no: 3900001,
  sync_webset: 3900,
  db_name: "f1-atmiya",
  user_name: "MR RAKESH",
  client_id: 3900,
  comp_id: "3900",
};

// --- BACKGROUND TASK DEFINITION ---
// This runs in a separate thread when the app is minimized.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("Background Task Error:", error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];
    const { latitude, longitude } = location.coords;

    // --- NEW: DUPLICATE CHECK ---
    if (
      latitude === lastBackgroundCoords.lat &&
      longitude === lastBackgroundCoords.lng
    ) {
      console.log("Background: Stationary (Same coordinates). Skipping.");
      return;
    }

    try {
      // Update the last known location
      lastBackgroundCoords = { lat: latitude, lng: longitude };

      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const d = new Date();
      const pad = (n: any) => String(n).padStart(2, "0");
      const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      const locationData = {
        LAT: latitude,
        LOG: longitude,
        DT_TM: timestamp,
        CITY: address?.city || "",
        STATE: address?.region || "",
        COUNTRY: address?.country || "",
        POSTCODE: address?.postalCode || "",
        ADD_LBL: `${address?.name || ""} ${address?.street || ""}`.trim(),
        SYNC_NO: STATIC_USER.sync_no,
        SYNC_WEBSET: STATIC_USER.sync_webset,
      };

      const params: any = { db_name: STATIC_USER?.db_name };
      const queryString = buildQueryString(params);
      const url = `v1/userlocation${queryString}`;

      await apiClient.create(url, locationData);
      console.log("Background Sync Success:", latitude, longitude);
    } catch (err) {
      console.error("Background Sync Error:", err);
    }
  }
});

export default function UserHome() {
  const router = useRouter();
  const dispatch = useDispatch();
  const intervalRef = useRef<any>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const userStats = [
    {
      title: "My Orders",
      count: "24",
      icon: "cart-outline",
      colorClass: "bg-blue-50",
      iconColor: "#3B82F6",
      trend: "+2 this week",
    },
    {
      title: "Complaints",
      count: "02",
      icon: "chatbubble-ellipses-outline",
      colorClass: "bg-red-50",
      iconColor: "#EF4444",
      trend: "Resolved",
    },
  ];

  const startTracking = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);

      // 1. Request BOTH Foreground and Background Permissions
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        // Request background specifically (Required for minimized tracking)
        await Location.requestBackgroundPermissionsAsync();
      }

      if (status !== "granted") {
        setRefreshing(false);
        Alert.alert("Location Required", "Please enable GPS in settings.", [
          { text: "Cancel" },
          {
            text: "Open Settings",
            onPress: () =>
              Platform.OS === "ios"
                ? Linking.openURL("app-settings:")
                : Linking.openSettings(),
          },
        ]);
        return;
      }
      setRefreshing(false);

      // Existing sync logic for Foreground
      const performSync = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          const currentLat = loc.coords.latitude;
          const currentLng = loc.coords.longitude;

          if (
            lastLocationRef.current &&
            lastLocationRef.current.lat === currentLat &&
            lastLocationRef.current.lng === currentLng &&
            !isManualRefresh
          ) {
            console.log("Stationary: Skipping API call.");
            return;
          }

          const [address] = await Location.reverseGeocodeAsync({
            latitude: currentLat,
            longitude: currentLng,
          });

          const formatDateTime = () => {
            const d = new Date();
            const pad = (n: any) => String(n).padStart(2, "0");
            return (
              `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
              `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
            );
          };

          const locationData = {
            LAT: currentLat,
            LOG: currentLng,
            DT_TM: formatDateTime(),
            CITY: address?.city || "",
            STATE: address?.region || "",
            COUNTRY: address?.country || "",
            POSTCODE: address?.postalCode || "",
            ADD_LBL: `${address?.name || ""} ${address?.street || ""}`.trim(),
            SYNC_NO: STATIC_USER?.sync_no,
            SYNC_WEBSET: STATIC_USER?.sync_webset,
          };

          const action = (addUserLocation as any)({
            params: { db_name: STATIC_USER?.db_name },
            data: locationData,
          });

          dispatch(action);
          lastLocationRef.current = { lat: currentLat, lng: currentLng };
          lastBackgroundCoords = { lat: currentLat, lng: currentLng };

          console.log("Foreground Sync Success");
        } catch (err) {
          console.error("Sync error:", err);
        } finally {
          if (isManualRefresh) setRefreshing(false);
        }
      };

      // --- LOGIC FOR BACKGROUND + INTERVAL ---
      if (isManualRefresh) {
        await performSync();
      } else {
        // A. Start the native Background Task
        const isTaskStarted =
          await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (!isTaskStarted) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000,
            distanceInterval: 10,
            foregroundService: {
              notificationTitle: "Tracking Active",
              notificationBody: "Your location is being synced.",
              notificationColor: "#3B82F6",
            },
            pausesUpdatesAutomatically: false,
          });
        }
        console.log("Native background task initialized");

        // B. Keep Foreground Interval
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(performSync, 30000);
        performSync();
      }
    },
    [dispatch],
  );

  useEffect(() => {
    startTracking();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTracking]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => startTracking(true)}
          />
        }
      >
        <DashboardStats data={userStats} />

        <View className="mt-10 items-center justify-center px-6">
          <View className="bg-white w-full p-8 rounded-[40px] shadow-sm border border-slate-100 items-center">
            <View className="bg-green-100 p-4 rounded-full mb-4">
              <View className="w-4 h-4 bg-green-500 rounded-full" />
            </View>
            <Text className="text-slate-900 text-xl font-black">
              Tracking Live
            </Text>
            <Text className="text-slate-400 mt-2 text-center">
              Logged in as {STATIC_USER.user_name}. Your location is being
              synced.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 w-full bg-white">
        <BottomMenu />
      </View>
    </SafeAreaView>
  );
}

// import * as Location from "expo-location";
// import { useRouter } from "expo-router";
// import * as TaskManager from "expo-task-manager";
// import React, { useCallback, useEffect, useRef, useState } from "react";
// import { Alert, Linking, Platform, ScrollView, Text, View } from "react-native";
// import { RefreshControl } from "react-native-gesture-handler";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useDispatch } from "react-redux";
// import BottomMenu from "../components/BottomMenu";
// import DashboardStats from "../components/DashboardStats";
// import { addUserLocation } from "../store/slice/locationSlice"; // Ensure this path is correct
// export default function UserHome() {
//   const router = useRouter();
//   const dispatch = useDispatch();
//   const intervalRef = useRef<any>(null);
//   const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
//   const [refreshing, setRefreshing] = useState(false);

//   const LOCATION_TASK_NAME = "background-location-task";

//   // We define the task outside to keep it alive when the UI unmounts
//   TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
//     if (error) {
//       console.error("Background Task Error:", error);
//       return;
//     }
//     if (data) {
//       // This is triggered by the OS every 30 seconds (or distance interval)
//       // You can call your API directly here using fetch/axios
//       // because dispatch/hooks won't work in this static block.
//       console.log("Background location update received");
//     }
//   });

//   // --- STATIC USER DATA ---
//   const user = {
//     sync_no: 3900001,
//     sync_webset: 3900,
//     db_name: "f1-atmiya",
//     user_name: "MR RAKESH",
//     client_id: 3900,
//     comp_id: "3900",
//   };

//   const userStats = [
//     {
//       title: "My Orders",
//       count: "24",
//       icon: "cart-outline",
//       colorClass: "bg-blue-50",
//       iconColor: "#3B82F6",
//       trend: "+2 this week",
//     },
//     {
//       title: "Complaints",
//       count: "02",
//       icon: "chatbubble-ellipses-outline",
//       colorClass: "bg-red-50",
//       iconColor: "#EF4444",
//       trend: "Resolved",
//     },
//   ];
//   const startTracking = useCallback(
//     async (isManualRefresh = false) => {
//       if (isManualRefresh) setRefreshing(true);

//       // 1. Request BOTH Foreground and Background Permissions
//       let { status } = await Location.requestForegroundPermissionsAsync();

//       // Background permission is required for the task to run when minimized
//       if (status === "granted") {
//         await Location.requestBackgroundPermissionsAsync();
//       }

//       if (status !== "granted") {
//         setRefreshing(false);
//         Alert.alert("Location Required", "Please enable GPS in settings.", [
//           { text: "Cancel" },
//           {
//             text: "Open Settings",
//             onPress: () =>
//               Platform.OS === "ios"
//                 ? Linking.openURL("app-settings:")
//                 : Linking.openSettings(),
//           },
//         ]);
//         return;
//       }
//       setRefreshing(false);

//       // Your existing sync logic (DO NOT CHANGE)
//       const performSync = async () => {
//         try {
//           const loc = await Location.getCurrentPositionAsync({
//             accuracy: Location.Accuracy.Balanced,
//           });

//           const currentLat = loc.coords.latitude;
//           const currentLng = loc.coords.longitude;

//           if (
//             lastLocationRef.current &&
//             lastLocationRef.current.lat === currentLat &&
//             lastLocationRef.current.lng === currentLng &&
//             !isManualRefresh
//           ) {
//             console.log("Stationary: Skipping API call.");
//             return;
//           }

//           const [address] = await Location.reverseGeocodeAsync({
//             latitude: currentLat,
//             longitude: currentLng,
//           });

//           const formatDateTime = () => {
//             const d = new Date();
//             const pad = (n: any) => String(n).padStart(2, "0");
//             return (
//               `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
//               `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
//             );
//           };

//           const locationData = {
//             LAT: currentLat,
//             LOG: currentLng,
//             DT_TM: formatDateTime(),
//             CITY: address?.city || "",
//             STATE: address?.region || "",
//             COUNTRY: address?.country || "",
//             POSTCODE: address?.postalCode || "",
//             ADD_LBL: `${address?.name || ""} ${address?.street || ""}`.trim(),
//             SYNC_NO: user?.sync_no,
//             SYNC_WEBSET: user?.sync_webset,
//           };

//           const action = (addUserLocation as any)({
//             params: { db_name: user?.db_name },
//             data: locationData,
//           });

//           dispatch(action)
//           lastLocationRef.current = { lat: currentLat, lng: currentLng };
//         } catch (err) {
//           console.error("Sync error:", err);
//         } finally {
//           if (isManualRefresh) setRefreshing(false);
//         }
//       };

//       // --- LOGIC FOR BACKGROUND + INTERVAL ---
//       if (isManualRefresh) {
//         await performSync();
//       } else {
//         // A. START EXPO BACKGROUND TASK (For when app is minimized)
//         const isTaskStarted =
//           await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
//         if (!isTaskStarted) {
//           await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
//             accuracy: Location.Accuracy.Balanced,
//             timeInterval: 30000, // 30 seconds
//             distanceInterval: 10, // 10 meters
//             foregroundService: {
//               notificationTitle: "Tracking Active",
//               notificationBody: "Your location is being synced.",
//               notificationColor: "#3B82F6",
//             },
//           });
//         }
//         console.log("location start in backegout");

//         // B. KEEP YOUR INTERVAL (For when app is open/foreground)
//         if (intervalRef.current) clearInterval(intervalRef.current);
//         intervalRef.current = setInterval(performSync, 30000);
//         performSync();
//       }
//     },
//     [user, dispatch],
//   );

//   useEffect(() => {
//     startTracking();
//     return () => {
//       // We clean up the interval, but the Background Task stays alive
//       // unless you explicitly call stopLocationUpdatesAsync
//       if (intervalRef.current) clearInterval(intervalRef.current);
//     };
//   }, [startTracking]);

//   return (
//     <SafeAreaView className="flex-1 bg-slate-50">
//       <ScrollView
//         className="flex-1"
//         contentContainerStyle={{ paddingBottom: 100 }}
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={() => startTracking(true)}
//           />
//         }
//       >
//         <DashboardStats data={userStats} />

//         <View className="mt-10 items-center justify-center px-6">
//           <View className="bg-white w-full p-8 rounded-[40px] shadow-sm border border-slate-100 items-center">
//             <View className="bg-green-100 p-4 rounded-full mb-4">
//               <View className="w-4 h-4 bg-green-500 rounded-full" />
//             </View>
//             <Text className="text-slate-900 text-xl font-black">
//               Tracking Live
//             </Text>
//             <Text className="text-slate-400 mt-2 text-center">
//               Logged in as {user.user_name}. Your location is being synced.
//             </Text>
//           </View>
//         </View>
//       </ScrollView>

//       <View className="absolute bottom-0 w-full bg-white">
//         <BottomMenu />
//       </View>
//     </SafeAreaView>
//   );
// }
