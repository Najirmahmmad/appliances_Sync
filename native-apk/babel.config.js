// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: ["babel-preset-expo"],
//     plugins: [
//       "@babel/plugin-transform-classes",
//       "nativewind/babel",
//       "react-native-reanimated/plugin",
//     ],
//   };
// };
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "nativewind/babel",
    ],
  };
};