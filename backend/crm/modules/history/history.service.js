function createHistoryService({ repository }) {
  async function create(payload) {
    return repository.create({
      created_at: payload.created_at,
      timezone: payload.timezone,
    });
  }

  async function list(filters = {}) {
    const rows = await repository.list(filters);
    return rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      timezone: row.timezone,
    }));
  }

  return Object.freeze({
    create,
    list,
  });
}

export { createHistoryService };
