import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        slateInk: "#1F2A44",
        slateText: "#5C6882",
        shell: "#F3F5FA",
        line: "#E7EBF3",
        goldSoft: "#F0C66E"
      },
      boxShadow: {
        shell: "0 24px 60px rgba(31, 42, 68, 0.08)",
        card: "0 8px 28px rgba(26, 39, 71, 0.07)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
