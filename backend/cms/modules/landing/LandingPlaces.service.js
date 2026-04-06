import { BaseService } from "../../core/base/BaseClasses.js";
import { LandingPlace } from "./LandingPlace.entity.js";
import { ValidationError, ConflictError } from "../../core/errors/Errors.js";
import { TextNormalizer, NumberConverter } from "../../core/utils/Utilities.js";

export class LandingPlacesService extends BaseService {
  static MAX_LANDING_PLACES = 4;

  constructor(repository, logger = null) {
    super(repository, logger);
  }
  toEntity(row) {
    return LandingPlace.fromDatabase(row);
  }

  async list(filters = {}) {
    const rows = await this.repository.findAll(filters);
    const entities = rows.map((row) => this.toEntity(row));
    return entities.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async listActive() {
    const rows = await this.repository.findActive();
    return rows.map((row) => this.toEntity(row));
  }

  async create(data) {
    const activeCount = await this.repository.countActive();
    if (activeCount >= LandingPlacesService.MAX_LANDING_PLACES) {
      throw new ConflictError(
        `Maximum ${LandingPlacesService.MAX_LANDING_PLACES} landing places allowed`,
      );
    }

    const entity = new LandingPlace({
      name: TextNormalizer.normalize(data.name),
      description: TextNormalizer.normalize(data.description),
      tag: TextNormalizer.normalize(data.tag),
      imageUrl: TextNormalizer.normalize(data.imageUrl),
      displayOrder: NumberConverter.toInteger(data.displayOrder, activeCount),
      isActive: data.isActive !== false,
    });

    const validation = entity.validate();
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join(", "));
    }

    const row = await this.repository.create(entity.toDatabase());
    return this.toEntity(row);
  }

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

  async delete(id) {
    await this.getById(id);
    await this.repository.softDelete(id);
    return { success: true };
  }

  async reorder(items) {
    if (!Array.isArray(items)) {
      throw new ValidationError("Items must be an array");
    }

    for (const item of items) {
      await this.getById(item.id);
    }

    await this.repository.updateOrder(items);
    return { success: true };
  }

  validateCreate(data) {
    if (!data.name) {
      throw new ValidationError("Name is required");
    }
    if (!data.description) {
      throw new ValidationError("Description is required");
    }
    if (!data.imageUrl) {
      throw new ValidationError("Image URL is required");
    }
    return data;
  }
}
