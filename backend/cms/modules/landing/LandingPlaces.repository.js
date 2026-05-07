import { BaseRepository } from "../../core/base/BaseClasses.js";

export class LandingPlacesRepository extends BaseRepository {
  constructor(database) {
    const schema = {
      tableName: "landing_places",
      entityName: "LandingPlace",
    };
    super(database, schema);
  }

  async findActive() {
    const rows = await this.db.findMany(this.tableName, { is_active: true });
    return rows.sort((a, b) => a.display_order - b.display_order);
  }

  async updateOrder(items) {
    const promises = items.map(({ id, displayOrder }) =>
      this.db.update(this.tableName, id, { display_order: displayOrder }),
    );
    return Promise.all(promises);
  }

  async countActive() {
    const rows = await this.db.findMany(this.tableName, { is_active: true });
    return rows.length;
  }

  async softDelete(id) {
    const existing = await this.db.findById(this.tableName, id);
    if (!existing) {
      return null;
    }
    await this.db.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return existing;
  }
}
