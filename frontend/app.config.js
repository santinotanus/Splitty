import "dotenv/config";

export default ({ config }) => ({
  ...config,
  extra: {
    BACKEND_URL: process.env.BACKEND_URL || "http://192.168.1.34:3000",
  },
});
