const { AppError } = require('../../core/errors');

class VisaService {
  constructor({ repository, logger, events }) {
    this.repository = repository;
    this.logger = logger;
    this.events = events;
  }

  async list(filters = {}, context = {}) {
    this.logger.debug({ module: 'visa', requestId: context.requestId, filters }, 'Listing records');
    return this.repository.findAll(filters);
  }

  async getById(id, context = {}) {
    this.logger.debug({ module: 'visa', requestId: context.requestId, id }, 'Getting record by id');
    const item = await this.repository.findById(id);

    if (!item) {
      throw new AppError(404, 'Visa not found', 'visa_NOT_FOUND');
    }

    return item;
  }

  async create(payload, context = {}) {
    const created = await this.repository.create({
      ...payload,
      createdBy: context.user?.id || null,
    });

    this.events.emitCreated(created);
    return created;
  }

  async update(id, payload, context = {}) {
    await this.getById(id, context);

    const updated = await this.repository.update(id, {
      ...payload,
      updatedBy: context.user?.id || null,
    });

    this.events.emitUpdated(updated);
    return updated;
  }
}

module.exports = { VisaService };
