module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Prevent double-registration if worklets ever gets hoisted to root.
          worklets: false,
          reanimated: false,
        },
      ],
    ],
    plugins: [
      require.resolve('react-native-worklets/plugin', { paths: [__dirname] }),
    ],
  };
};
