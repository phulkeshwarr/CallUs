import { config } from "dotenv";

config();

const required = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL,
  clientUrls: (process.env.CLIENT_URLS || process.env.CLIENT_URL)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
