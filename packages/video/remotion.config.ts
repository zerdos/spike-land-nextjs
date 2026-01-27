import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind";
import path from "path";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((config) => {
  // Enable Tailwind CSS
  const tailwindConfig = enableTailwind(config);

  // Force React 18 resolution using absolute paths
  // This ensures the bundler uses our local React 18, not the monorepo's React 19
  // Use process.cwd() since the CLI is run from the package directory
  const packageDir = process.cwd();
  const reactPath = path.resolve(packageDir, "node_modules/react");
  const reactDomPath = path.resolve(packageDir, "node_modules/react-dom");

  console.log("[remotion.config] Using React from:", reactPath);

  return {
    ...tailwindConfig,
    resolve: {
      ...tailwindConfig.resolve,
      alias: {
        ...tailwindConfig.resolve?.alias,
        react: reactPath,
        "react-dom": reactDomPath,
        "react/jsx-runtime": path.join(reactPath, "jsx-runtime"),
        "react/jsx-dev-runtime": path.join(reactPath, "jsx-dev-runtime"),
        "react-dom/client": path.join(reactDomPath, "client"),
      },
    },
  };
});
