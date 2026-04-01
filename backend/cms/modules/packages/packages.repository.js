function createCmsPackagesRepository({ db, schema }) {
  return Object.freeze({
    // Get published packages from CRM
    async findPublishedPackages(filters = {}) {
      const result = await db.query(
        `SELECT * FROM ${schema.packagesTable}
         WHERE publish_to_website = true
           AND is_deleted = false
         ORDER BY created_at DESC`,
      );
      return result.rows;
    },

    async findPackageById(id) {
      return db.findById(schema.packagesTable, id);
    },

    // Main packages
    async findAllMainPackages() {
      const result = await db.query(
        `SELECT mp.*, p.name, p.destination, p.starting_price, p.duration,
                p.banner_image_url, p.publish_to_website
         FROM ${schema.mainPackagesTable} mp
         JOIN ${schema.packagesTable} p ON mp.package_id = p.id
         WHERE p.is_deleted = false
         ORDER BY mp.display_order`,
      );
      return result.rows;
    },

    async findMainPackageById(id) {
      return db.findById(schema.mainPackagesTable, id);
    },

    async createMainPackage(data) {
      return db.insert(schema.mainPackagesTable, data);
    },

    async updateMainPackage(id, data) {
      return db.update(schema.mainPackagesTable, id, data);
    },

    async deleteMainPackage(id) {
      const result = await db.query(
        `DELETE FROM ${schema.mainPackagesTable} WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] || null;
    },

    // Sub packages
    async findSubPackages(mainPackageId) {
      const result = await db.query(
        `SELECT sp.*, p.name, p.starting_price, p.duration, p.banner_image_url
         FROM ${schema.subPackagesTable} sp
         JOIN ${schema.packagesTable} p ON sp.package_id = p.id
         WHERE sp.main_package_id = $1
           AND p.is_deleted = false
         ORDER BY sp.display_order`,
        [mainPackageId],
      );
      return result.rows;
    },

    async findSubPackageById(id) {
      return db.findById(schema.subPackagesTable, id);
    },

    async createSubPackage(data) {
      return db.insert(schema.subPackagesTable, data);
    },

    async updateSubPackage(id, data) {
      return db.update(schema.subPackagesTable, id, data);
    },

    async deleteSubPackage(id) {
      const result = await db.query(
        `DELETE FROM ${schema.subPackagesTable} WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] || null;
    },
  });
}

export { createCmsPackagesRepository };
