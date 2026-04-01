import { BaseRepository } from '../../core/base/BaseClasses.js';

/**
 * Landing Places Repository
 * Extends BaseRepository following Open/Closed Principle
 * Single Responsibility: Data access for landing places
 */
export class LandingPlacesRepository extends BaseRepository {
  constructor(database) {
    const schema = {
      tableName: 'landing_places',
      entityName: 'LandingPlace',
    };
    super(database, schema);
  }

  /**
   * Find active landing places ordered by display order
   */
  async findActive() {
    const rows = await this.db.findMany(this.tableName, { is_active: true });
    return rows.sort((a, b) => a.display_order - b.display_order);
  }

  /**
   * Update display order for multiple places
   */
  async updateOrder(items) {
    const promises = items.map(({ id, displayOrder }) =>
      this.db.update(this.tableName, id, { display_order: displayOrder })
    );
    return Promise.all(promises);
  }

  /**
   * Count active landing places
   */
  async countActive() {
    const rows = await this.db.findMany(this.tableName, { is_active: true });
    return rows.length;
  }

  /**
   * Soft delete (set is_active to false)
   */
  async softDelete(id) {
    return this.db.update(this.tableName, id, { is_active: false });
  }
}
