import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  serverExternalPackages: ["unpdf", "mammoth"],
  /** the 10-screen workbench became 4 steps; old links land on the matching step */
  async redirects() {
    const to = (dest: string, ...from: string[]) => from.map((f) => ({ source: `/${f}`, destination: dest, permanent: false }));
    return [
      ...to("/", "scope"),
      ...to("/inputs", "evidence", "interviews", "process"),
      ...to("/review", "scoring", "compare"),
      ...to("/results", "opportunities", "roadmap", "synthesis"),
    ];
  },
};

export default nextConfig;
