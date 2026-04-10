function collectRequestFiles(req) {
  const files = [];

  if (req?.file) {
    files.push(req.file);
  }

  if (Array.isArray(req?.files)) {
    files.push(...req.files);
  } else if (req?.files && typeof req.files === "object") {
    for (const key of Object.keys(req.files)) {
      const value = req.files[key];
      if (Array.isArray(value)) {
        files.push(...value);
      } else if (value) {
        files.push(value);
      }
    }
  }

  return files.filter(Boolean);
}

function getFirstRequestFile(req, preferredFieldNames = []) {
  const files = collectRequestFiles(req);
  if (!files.length) {
    return null;
  }

  const normalized = preferredFieldNames.map((name) =>
    String(name || "").toLowerCase(),
  );
  if (!normalized.length) {
    return files[0];
  }

  for (const file of files) {
    const fieldName = String(file?.fieldname || "").toLowerCase();
    if (normalized.includes(fieldName)) {
      return file;
    }
  }

  return files[0];
}

function getRequestFiles(req, preferredFieldNames = []) {
  const files = collectRequestFiles(req);
  if (!files.length) {
    return [];
  }

  const normalized = preferredFieldNames.map((name) =>
    String(name || "").toLowerCase(),
  );
  if (!normalized.length) {
    return files;
  }

  return files.filter((file) =>
    normalized.includes(String(file?.fieldname || "").toLowerCase()),
  );
}

export { collectRequestFiles, getFirstRequestFile, getRequestFiles };
