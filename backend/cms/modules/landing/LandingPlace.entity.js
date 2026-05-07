export class LandingPlace {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description ?? data.tag;
    this.tag = data.tag;
    this.imageUrl = data.imageUrl || data.image_url;
    this.displayOrder = data.displayOrder || data.display_order || 0;
    this.isActive =
      data.isActive !== undefined ? data.isActive : data.is_active !== false;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
  }

  static fromDatabase(row) {
    if (!row) return null;
    return new LandingPlace({
      id: row.id,
      name: row.name,
      description: row.tag,
      tag: row.tag,
      imageUrl: row.image_url,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toDatabase() {
    return {
      name: this.name,
      tag: this.tag,
      image_url: this.imageUrl,
      display_order: this.displayOrder,
      is_active: this.isActive,
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      tag: this.tag,
      imageUrl: this.imageUrl,
      displayOrder: this.displayOrder,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("Name is required");
    }

    if (!this.tag || this.tag.trim().length === 0) {
      errors.push("Tag is required");
    }

    if (!this.imageUrl || this.imageUrl.trim().length === 0) {
      errors.push("Image URL is required");
    }

    if (this.displayOrder < 0) {
      errors.push("Display order must be non-negative");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
