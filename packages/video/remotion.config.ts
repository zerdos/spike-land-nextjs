import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind";
import path from "path";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((config) => {
  // Enable Tailwind CSS
  return enableTailwind(config);
});
