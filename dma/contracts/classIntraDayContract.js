module.exports = class Contract {
    constructor(
        id,
        code,
        connected_realm_id,
        type,
        market_data
    ) {
        this._id = id;
        this.code = code;
        this.connected_realm_id = connected_realm_id;
        this.type = type;
        this.price = {
            open: market_data[0].price,
            open_size: market_data[0].price_size,
            low: Math.min(...market_data.map(low => low.price)),
            low_size: Math.min(...market_data.map(low_size => low_size.price_size)),
            change: parseFloat((market_data[market_data.length-1].price-market_data[0].price).toFixed(2)),
            avg: parseFloat((market_data.reduce((total, next) => total + next.price_size, 0) / market_data.length).toFixed(2)),
            high: Math.max(...market_data.map(high => high.price)),
            high_size: Math.max(...market_data.map(high => high.price_size)),
            close: market_data[market_data.length-1].price,
            close_size: market_data[market_data.length-1].price_size,
        };
        this.quantity = {
            open: market_data[0].quantity,
            low: Math.min(...market_data.map(low => low.quantity)),
            change: market_data[market_data.length-1].quantity - market_data[0].quantity,
            high: Math.max(...market_data.map(high => high.quantity)),
            close: market_data[market_data.length-1].quantity,
        };
        this.open_interest = {
            open: parseFloat(market_data[0].open_interest),
            low: Math.min(...market_data.map(low => low.open_interest)),
            change: parseFloat(market_data[market_data.length-1].open_interest) - parseFloat(market_data[0].open_interest),
            high: Math.max(...market_data.map(high => high.open_interest)),
            close: parseFloat(market_data[market_data.length-1].open_interest),
        };
        let price_data = [];
        let timestamp_data = [];
        for (let i = 0; i < market_data.length; i++) {
            price_data = [...new Set(price_data.concat(market_data[i].price))];
            timestamp_data = [...new Set(timestamp_data.concat(market_data[i]._id))];
        }
        this.price_data = price_data;
        this.timestamp_data = timestamp_data;
        const standardDeviation = (arr, usePopulation = false) => {
            const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
            return Math.sqrt(
                arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0) /
                (arr.length - (usePopulation ? 0 : 1))
            );
        };
        /**
         * @return {number}
         */
        function VaR (portfolioEquityCurve, alpha) {
            // Compute the returns and remove the first element, always equals to NaN
            function arithmeticReturns (portfolioEquityCurve) {
                // Compute the arithmetic returns
                let returns = new portfolioEquityCurve.constructor(portfolioEquityCurve.length); // Inherit the array type from the input array
                returns[0] = NaN;
                for (let i = 1; i < portfolioEquityCurve.length; ++i) {
                    returns[i] = (portfolioEquityCurve[i] - portfolioEquityCurve[i-1])/portfolioEquityCurve[i-1];
                }
                // Return the arithmetic returns
                return returns;
            }
            let returns = arithmeticReturns(portfolioEquityCurve).slice(1);

            // Sort the returns from lowest to highest values
            returns.sort((a, b) => { return a - b;});
            // Compute w
            // C.f. p. 383 of the reference
            let c_alpha = 1 - alpha;
            let w = Math.floor(c_alpha * returns.length);
            // Limit case (w equals to 0), return NaN
            if (w === 0) {
                return 0;
            }
            // Otherwise, compute the value at risk as the w-th return
            // C.f. (2) and (6) of the reference
            // Return the value at risk
            return -returns[w-1];
            // Return the value at risk
            //return parseFloat(returns[w - 1].toFixed(2));
        }
        this.risk = {
            stdDev: parseFloat((standardDeviation(market_data.map(low => low.price*100))/100).toFixed(2)),
            stdDev_size: parseFloat((standardDeviation(market_data.map(low_size => low_size.price_size*100))/100).toFixed(2)),
            VaR: parseFloat(VaR(market_data.map(low => low.price*100),0.80).toFixed(2)),
            VaR_size: parseFloat(VaR(market_data.map(low => low.price_size*100).filter((value)=> value !== 0),0.80).toFixed(2)),
        };
    }
};