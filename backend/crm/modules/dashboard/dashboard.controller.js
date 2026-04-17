import { logger } from '../../core/logger/index.js';

class DashboardController {
  constructor(service) {
    this.service = service;
  }

  async getStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      const stats = await this.service.getStats(period);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats',
        error: error.message
      });
    }
  }

  async getRevenue(req, res) {
    try {
      const { range = 'week', currency } = req.query;
      const revenueData = await this.service.getRevenue(range, currency);
      
      res.json({
        success: true,
        data: revenueData
      });
    } catch (error) {
      logger.error('Error fetching revenue data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue data',
        error: error.message
      });
    }
  }

  async getLeadSources(req, res) {
    try {
      const { period = 'month' } = req.query;
      const leadSources = await this.service.getLeadSources(period);
      
      res.json({
        success: true,
        data: leadSources
      });
    } catch (error) {
      logger.error('Error fetching lead sources:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch lead sources',
        error: error.message
      });
    }
  }
}

function createDashboardController(service) {
  return new DashboardController(service);
}

export { DashboardController, createDashboardController };