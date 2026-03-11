function createLeadsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'leads.created');
      eventBus.emit('leads.created', payload);
    },

    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'leads.updated');
      eventBus.emit('leads.updated', payload);
    },

    emitAssigned(payload) {
      logger.info(
        {
          leadId: payload.leadId,
          assigneeId: payload.assigneeId,
          mode: payload.mode,
        },
        'leads.assigned',
      );
      eventBus.emit('leads.assigned', payload);
    },

    emitReassigned(payload) {
      logger.info(
        {
          leadId: payload.leadId,
          previousAssigneeId: payload.previousAssigneeId,
          assigneeId: payload.assigneeId,
          mode: payload.mode,
        },
        'leads.reassigned',
      );
      eventBus.emit('leads.reassigned', payload);
    },

    emitDistributionRun(payload) {
      logger.info(
        {
          processed: payload.processed,
          assigned: payload.assigned,
          unassigned: payload.unassigned,
          errors: payload.errors?.length || 0,
        },
        'leads.distribution_run',
      );
      eventBus.emit('leads.distribution_run', payload);
    },

    emitFollowupCreated(payload) {
      logger.info({ id: payload.id, leadId: payload.leadId }, 'leads.followup_created');
      eventBus.emit('leads.followup_created', payload);
    },

    emitFollowupOverdue(payload) {
      logger.warn({ id: payload.id, leadId: payload.leadId }, 'leads.followup_overdue');
      eventBus.emit('leads.followup_overdue', payload);
    },

    emitSlaBreached(payload) {
      logger.warn({ id: payload.id, leadId: payload.leadId }, 'leads.sla_breached');
      eventBus.emit('leads.sla_breached', payload);
    },

    emitEscalated(payload) {
      logger.warn({ leadId: payload.leadId, reason: payload.reason }, 'leads.escalated');
      eventBus.emit('leads.escalated', payload);
    },
  });
}

module.exports = { createLeadsEvents };
