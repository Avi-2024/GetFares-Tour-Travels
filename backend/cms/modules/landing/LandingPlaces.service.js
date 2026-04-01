import { BaseService } from '../../core/base/BaseClasses.js';
import { LandingPlace } from './LandingPlace.entity.js';
import { ValidationError, ConflictError } from '../../core/errors/Errors.js';
import { TextNormalizer, NumberConverter } from '../../core/utils/Utilities.js';

/**
 * Landing Places Service
 * Extends BaseService following Open/Closed Principle
 * Single Responsibility: Business logic for landing places
 */
export class LandingPlacesService extends BaseService {
  static MAX_LANDING_PLACES = 4;

  constructor(repository, logger = null) {
    super(repository, logger);
  }

  /**
   * Transform database row to entity
   * Template method implementation
   */
  toEntity(row) {
    return LandingPlace.fromDatabase(row);
  }

  /**
   * List landing places with optional filters
   */
  async list(filters = {}) {
    const rows = await this.repository.findAll(filters);
    const entities = rows.map((row) => this.toEntity(row));
    return entities.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * List only active landing places
   */
  async listActive() {
    const rows = await this.repository.findActive();
    return rows.map((row) => this.toEntity(row));
  }

  /**
   * Create new landing place
   * Validates max limit
   */
  async create(data) {
    // Check max limit
    const activeCount = await this.repository.countActive();
    if (activeCount >= LandingPlacesService.MAX_LANDING_PLACES) {
      throw new ConflictError(
        `Maximum ${LandingPlacesService.MAX_LANDING_PLACES} landing places allowed`
      );
    }

    // Create entity
    const entity = new LandingPlace({
      name: TextNormalizer.normalize(data.name),
      description: TextNormalizer.normalize(data.description),
      tag: TextNormalizer.normalize(data.tag),
      imageUrl: TextNormalizer.normalize(data.imageUrl),
      displayOrder: NumberConverter.toInteger(data.displayOrder, activeCount),
      isActive: data.isActive !== false,
    });

    // Validate
    const validation = entity.validate();
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // Save
    const row = await this.repository.create(entity.toDatabase());
    return this.toEntity(row);
  }

  /**
   * Update landing place
   */
  async update(id, data) {
    const existing = await this.getById(id);

    const updates = {};
    if (data.name !== undefined) {
      updates.name = TextNormalizer.normalize(data.name);
    }
    if (data.description !== undefined) {
      updates.description = TextNormalizer.normalize(data.description);
    }
    if (data.tag !== undefined) {
      updates.tag = TextNormalizer.normalize(data.tag);
    }
    if (data.imageUrl !== undefined) {
      updates.image_url = TextNormalizer.normalize(data.imageUrl);
    }
    if (data.displayOrder !== undefined) {
      updates.display_order = NumberConverter.toInteger(data.displayOrder);
    }
    if (data.isActive !== undefined) {
      updates.is_active = data.isActive;
    }

    const row = await this.repository.update(id, updates);
    return this.toEntity(row);
  }

  /**
   * Delete landing place (soft delete)
   */
  async delete(id) {
    await this.getById(id); // Verify exists
    await this.repository.softDelete(id);
    return { success: true };
  }

  /**
   * Reorder landing places
   */
  async reorder(items) {
    if (!Array.isArray(items)) {
      throw new ValidationError('Items must be an array');
    }

    // Validate all items exist
    for (const item of items) {
      await this.getById(item.id);
    }

    await this.repository.updateOrder(items);
    return { success: true };
  }

  /**
   * Validation hook
   */
  validateCreate(data) {
    if (!data.name) {
      throw new ValidationError('Name is required');
    }
    if (!data.description) {
      throw new ValidationError('Description is required');
    }
    if (!data.imageUrl) {
      throw new ValidationError('Image URL is required');
    }
    return data;
  }
}
