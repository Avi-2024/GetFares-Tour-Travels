class CurrencyController {
  constructor({ currencyService, logger }) {
    this.currencyService = currencyService;
    this.logger = logger;
  }

  getRates = async (req, res) => {
    try {
      this.logger.info('Currency rates endpoint called');
      const result = await this.currencyService.getRates();
      this.logger.info({ source: result.source }, 'Currency rates retrieved successfully');
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      this.logger.error({ error: error.message, stack: error.stack }, 'Failed to get currency rates in controller');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get currency rates'
      });
    }
  };

  convert = async (req, res) => {
    try {
      const { amount, from, to } = req.query;
      
      if (!amount || !from || !to) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: amount, from, to'
        });
      }

      const converted = await this.currencyService.convert(
        parseFloat(amount),
        from.toUpperCase(),
        to.toUpperCase()
      );

      return res.status(200).json({
        success: true,
        data: {
          amount: parseFloat(amount),
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          converted: Math.round(converted * 100) / 100
        }
      });
    } catch (error) {
      this.logger.error({ error: error.message }, 'Failed to convert currency');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to convert currency'
      });
    }
  };
}

export { CurrencyController };
