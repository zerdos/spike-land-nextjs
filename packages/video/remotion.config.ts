import path from "path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((config) => {
  // Enable Tailwind CSS
  const tailwindConfig = enableTailwind(config);

  // Robust React resolution
  // This ensures the bundler uses the correct React version regardless of hoisting
  const resolveReact = (name: string) => {
    try {
      return path.dirname(require.resolve(`${name}/package.json`));
    } catch (_e) {
      return path.resolve(process.cwd(), "../../node_modules", name);
    }
  };

  const reactPath = resolveReact("react");
  const reactDomPath = resolveReact("react-dom");

  console.log("[remotion.config] Using React from:", reactPath);

  return {
    ...tailwindConfig,
    resolve: {
      ...tailwindConfig.resolve,
      alias: {
        ...tailwindConfig.resolve?.alias,
        react: reactPath,
        "react-dom": reactDomPath,
        "react/jsx-runtime": path.join(reactPath, "jsx-runtime.js"),
        "react/jsx-dev-runtime": path.join(reactPath, "jsx-dev-runtime.js"),
        "react-dom/client": path.join(reactDomPath, "client.js"),
      },
    },
  };
});
