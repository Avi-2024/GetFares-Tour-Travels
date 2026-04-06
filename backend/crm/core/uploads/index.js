import multer from "multer";

function createMemoryUpload({ maxFileSizeMb = 10 } = {}) {
  const normalized =
    Number.isFinite(Number(maxFileSizeMb)) && Number(maxFileSizeMb) > 0 ?
      Number(maxFileSizeMb)
    : 10;
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: normalized * 1024 * 1024,
    },
  });
}

export { createMemoryUpload };
