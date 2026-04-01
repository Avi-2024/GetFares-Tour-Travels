import dotenv from "dotenv";

dotenv.config();

const config = Object.freeze({
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    allowedVideoTypes: ["video/mp4", "video/webm"],
  },

  cache: {
    enabled: process.env.CACHE_ENABLED === "true",
    ttl: parseInt(process.env.CACHE_TTL || "3600", 10), // 1 hour
    redisUrl: process.env.REDIS_URL,
  },

  storage: {
    type: process.env.STORAGE_TYPE || "local", // 'local' or 's3'
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    local: {
      uploadDir: process.env.UPLOAD_DIR || "./uploads",
      publicUrl: process.env.PUBLIC_URL || "http://localhost:3000",
    },
  },
});

export { config };
