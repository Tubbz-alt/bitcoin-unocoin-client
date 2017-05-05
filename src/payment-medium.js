var ExchangePaymentMedium = require('bitcoin-exchange-client').PaymentMedium;
var Profile = require('./profile');
var assert = require('assert');

class PaymentMedium extends ExchangePaymentMedium {
  constructor (obj, api, quote, profile) {
    super(api, quote);

    this._fiatMedium = 'bank';

    this._inMedium = 'bank';
    this._outMedium = 'blockchain';

    this._inCurrencies = ['INR', 'BTC'];
    this._outCurrencies = ['BTC', 'INR'];

    this._inCurrency = 'INR';
    this._outCurrency = 'BTC';

    // TODO: get these from ticker
    this._inFixedFee = 0;
    this._outFixedFee = 0;
    this._inPercentageFee = 0;
    this._outPercentageFee = 0;

    this._minimumInAmounts = {
      INR: 1000
    };

    this.limitInAmounts = {
      // TODO: set INR limit when API provides it, or calculate...
      BTC: profile.currentLimits.bank.inRemaining
    };

    if (quote) {
      this._fee = 0;
      this._total = -quote.baseAmount;
    }
  }

  static getAll (inCurrency, outCurrency, api, quote) {
    // Bank is the only payment type. The Coinify API returns information about
    // trade limits along with their payment types. We mimick this behavior here
    // by calling the validate_buy and profiledetails endpoints.

    return Profile.fetch(api).then(profile => {
      return quote.api.authPOST('api/v1/trading/validate_buy', {
        // Use genesis address as placeholder
        destination: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amount: quote.baseCurrency === 'INR' ? -quote.baseAmount : -quote.quoteAmount
      }).then((res) => {
        switch (res.status_code) {
          case 200:
          case 760: // Less then the required minimum amount.
          case 782: // More than max ("Please enter minumum INR amount to deposit.")
            // Return bank account as a type
            return Promise.resolve({bank: new PaymentMedium(undefined, api, quote, profile)});
          default:
            // TODO: wrap error message in PaymentMedium object?
            return Promise.reject(res.message);
        }
      });
    });
  }

  checkMinimum () {
    return -this._quote.baseAmount >= this._minimumInAmounts[this.inCurrency];
  }

  buy () {
    assert(this.checkMinimum(), 'Less than minimum buy amount');
    return super.buy().then((trade) => {
      trade._getQuote = this._quote.constructor.getQuote; // Prevents circular dependency
      return trade;
    });
  }
}

module.exports = PaymentMedium;
