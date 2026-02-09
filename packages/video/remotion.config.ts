import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((config) => {
  const newConfig = enableTailwind(config);
  
  return {
    ...newConfig,
    resolve: {
      ...newConfig.resolve,
      alias: {
        ...(newConfig.resolve?.alias ?? {}),
        react: require.resolve("react"),
        "react-dom": require.resolve("react-dom"),
      },
    },
  };
});
