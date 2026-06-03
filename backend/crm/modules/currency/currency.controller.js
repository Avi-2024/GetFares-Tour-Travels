class CurrencyController {
  constructor({ currencyService, logger }) {
    this.currencyService = currencyService;
    this.logger = logger;
  }

  getRates = async (req, res) => {
    try {
      const result = await this.currencyService.getRates();
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      this.logger.error(
        { module: "currency", error: error.message, stack: error.stack },
        "Failed to get currency rates",
      );
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to get currency rates",
      });
    }
  };

  updateRates = async (req, res) => {
    try {
      const result = await this.currencyService.updateManagedRates({
        rates: req.body?.rates,
      });
      return res.status(200).json({
        success: true,
        message: "Currency rates updated",
        data: result,
      });
    } catch (error) {
      this.logger.error(
        { module: "currency", error: error.message },
        "Failed to update currency rates",
      );
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to update currency rates",
      });
    }
  };

  convert = async (req, res) => {
    try {
      const { amount, from, to } = req.query;

      if (!amount || !from || !to) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters: amount, from, to",
        });
      }

      const amountNumber = Number(amount);
      if (!Number.isFinite(amountNumber)) {
        return res.status(400).json({
          success: false,
          error: "amount must be a finite number",
        });
      }

      const converted = await this.currencyService.convert(
        amountNumber,
        from.toUpperCase(),
        to.toUpperCase(),
      );

      return res.status(200).json({
        success: true,
        data: {
          amount: amountNumber,
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          converted: Number(converted.toFixed(2)),
        },
      });
    } catch (error) {
      this.logger.error(
        { module: "currency", error: error.message },
        "Failed to convert currency",
      );
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to convert currency",
      });
    }
  };
}

export { CurrencyController };
