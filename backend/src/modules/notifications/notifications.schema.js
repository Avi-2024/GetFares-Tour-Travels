const NotificationStatus = Object.freeze({
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
});

const NotificationsSchema = Object.freeze({
  tableName: 'notification_events',
  statuses: NotificationStatus,
});

module.exports = {
  NotificationsSchema,
  NotificationStatus,
};
