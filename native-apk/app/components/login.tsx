import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; // Recommended dependency
import { useDispatch } from "react-redux";
import { setLogin } from "../store/slice/authSlice";
import { KEYS, saveData } from "../utils/storage";

export default function Login() {
  const [username, setUsername] = useState<string>("");
  const router = useRouter();
  const dispatch = useDispatch();

  //   const handleLogin = async (role: "user" | "admin") => {
  //     if (!username.trim()) {
  //       return Alert.alert("Required", "Please enter a username to proceed.");
  //     }

  //     // Indicate loading state (optional but professional)
  //     try {
  //       await saveData(KEYS.AUTH, { username, role });
  //       await saveData(KEYS.SESSION, { loginTime: new Date().toISOString() });

  //       if (role === "admin") {
  //         router.replace("/admin/adminHome");
  //       } else {
  //         router.replace("/user/userHome");
  //       }
  //     } catch (error) {
  //       Alert.alert("Error", "Could not complete login. Please try again.");
  //     }
  //   };

  // Safe wrapper for keyboard handling
  //   const Container = Platform.OS === 'ios' ? KeyboardAwareScrollView : View;

  const handleLogin = async (role: "user" | "admin") => {
    if (!username.trim()) {
      return Alert.alert("Required", "Please enter a username to proceed.");
    }

    try {
      // 1. Save to Storage (Persistence)
      await saveData(KEYS.AUTH, { username, role });

      // 2. Save to Redux (Global State for Drawer)
      dispatch(setLogin({ username, role }));

      if (role === "admin") {
        router.replace("/admin/adminHome");
      } else {
        router.replace("/user/userHome");
      }
      setUsername("");
    } catch (error) {
      Alert.alert("Error", "Could not complete login.");
    }
  };
  return (
    <View
      className="flex-1 bg-white"
      //   contentContainerStyle={{flex: 1}}
      //   behavior="padding"
    >
      <View className="flex-1 justify-center px-6 pt-10">
        {/* Logo/Icon Section */}
        <View className="items-center mb-12">
          {/* REPLACE: Create a folder 'assets/images' and put your 'logo.png' there. */}
          {/* For now, this uses a placeholder tint. */}
          <View className="p-1 bg-white rounded-full border-2 border-blue-500 shadow-xl">
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=200&auto=format&fit=crop",
              }}
              className="w-24 h-24 rounded-full"
            />
          </View>
          <Text className="text-4xl font-bold text-gray-900 tracking-tighter">
            Geo<Text className="text-blue-600">Tracker</Text>
          </Text>
          <Text className="text-gray-500 mt-2 text-base">
            Personnel Location Management
          </Text>
        </View>

        {/* Input Section */}
        <View className="space-y-4 mb-10">
          <Text className="text-sm font-medium text-gray-700 ml-1">
            Agent Username
          </Text>
          <TextInput
            placeholder="e.g. jsmith_01"
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 p-4 rounded-xl text-lg focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-200"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Buttons Section */}
        <View className="space-y-4">
          <Text className="text-sm font-medium text-gray-500 text-center mb-1">
            Select your access role
          </Text>

          <TouchableOpacity
            onPress={() => handleLogin("user")}
            className="w-full bg-blue-600 p-4 rounded-2xl flex-row justify-center items-center shadow-md active:bg-blue-700"
          >
            <Text className="text-white text-xl font-semibold">
              Login as Field Agent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleLogin("admin")}
            className="w-full bg-gray-900 p-4 rounded-2xl flex-row justify-center items-center active:bg-black"
          >
            <Text className="text-white text-lg font-medium">
              Administrator Access
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="mt-16 items-center">
          <Text className="text-gray-400 text-xs">
            Internal Secure System • Version 1.0.0
          </Text>
        </View>
      </View>
    </View>
  );
}

// import { useRouter } from "expo-router";
// import React, { useState } from "react";
// import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
// import { KEYS, saveData } from "../utils/storage";

// export default function Login() {
//   const [username, setUsername] = useState<string>("");
//   const router = useRouter();

//   const handleLogin = async (role: "user" | "admin") => {
//     if (!username.trim()) return Alert.alert("Error", "Enter a username");

//     await saveData(KEYS.AUTH, { username, role });
//     await saveData(KEYS.SESSION, { loginTime: new Date().toISOString() });

//     // NOTE: We do NOT clear locations here so Admin can see them after User logs in
//     if (role === "admin") {
//       router.replace("/admin/adminHome");
//     } else {
//       router.replace("/user/userHome");
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>GeoTracker</Text>
//       <TextInput
//         placeholder="Enter Username"
//         style={styles.input}
//         value={username}
//         onChangeText={setUsername}
//       />
//       <View style={styles.buttonGap}>
//         <Button title="Login as User" onPress={() => handleLogin("user")} />
//       </View>
//       <Button
//         title="Login as Admin"
//         color="#f39c12"
//         onPress={() => handleLogin("admin")}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     padding: 20,
//     backgroundColor: "#fff",
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     padding: 15,
//     marginBottom: 20,
//     borderRadius: 10,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: "bold",
//     textAlign: "center",
//     marginBottom: 40,
//   },
//   buttonGap: { marginBottom: 15 },
// });
