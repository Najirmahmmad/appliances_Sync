import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function BottomMenu() {
  const [activeTab, setActiveTab] = useState("Portfolio"); // Default active tab from image

  const TabItem = ({ name, icon, label, isLib = false }: any) => {
    const isActive = activeTab === name;

    return (
      <TouchableOpacity
        onPress={() => setActiveTab(name)}
        className="items-center justify-center flex-1 "
      >
        <View className="mb-1">
          {isLib ? (
            <FontAwesome5
              name={icon}
              size={22}
              color={isActive ? "#3B82F6" : "#71717A"}
            />
          ) : (
            <Ionicons
              name={icon}
              size={24}
              color={isActive ? "#3B82F6" : "#71717A"}
            />
          )}
        </View>
        <Text
          className={`text-[11px] ${isActive ? "text-blue-500 font-medium" : "text-gray-400"}`}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="bg-white flex-row w-full h-20 items-center justify-around border-t border-gray-200 px-2 pb-5">
      <TabItem name="Home" icon="home-outline" label="Home" />

      <TabItem name="Expenses" icon="pie-chart-outline" label="Expenses" />

      <TabItem
        name="Portfolio"
        icon="money-bill-wave"
        label="Portfolio"
        isLib={true}
      />

      <TabItem name="Accounts" icon="newspaper-outline" label="Accounts" />

      <TabItem name="More" icon="ellipsis-horizontal" label="More" />
    </View>
  );
}
