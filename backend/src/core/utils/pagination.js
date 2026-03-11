function toPagination(query = {}) {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

module.exports = { toPagination };
