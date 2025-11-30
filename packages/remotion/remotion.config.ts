import { Config } from "@remotion/cli/config";
import path from "path";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        "@/": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../shared"),
        "@ui": path.resolve(__dirname, "..//ui"),
      },
      extensions: [
        ...(config.resolve?.extensions ?? []),
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
      ],
    },
  };
});
