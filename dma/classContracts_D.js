module.exports = class Contract {
    constructor(
        id,
        code,
        connected_realm_id,
        type,
        contract_data
    ) {
        this._id = id;
        this.code = code;
        this.connected_realm_id = connected_realm_id;
        this.type = type;
        this.price = {
            open: contract_data[0].price,
            open_size: contract_data[0].price_size,
            low: parseFloat(Math.min(...contract_data.map(low => low.price)).toFixed(2)),
            low_size: parseFloat(Math.min(...contract_data.map(low_size => low_size.price_size)).toFixed(2)),
            change: parseFloat((contract_data[contract_data.length-1].price - contract_data[0].price).toFixed(2)),
            avg: parseFloat((contract_data.reduce((total, next) => total + next.price_size, 0) / contract_data.length).toFixed(2)),
            high: parseFloat(Math.max(...contract_data.map(high => high.price)).toFixed(2)),
            high_size: parseFloat(Math.max(...contract_data.map(high => high.price_size)).toFixed(2)),
            close: contract_data[contract_data.length-1].price,
            close_size: contract_data[contract_data.length-1].price_size,
        };
        this.quantity = {
            open: contract_data[0].quantity,
            low: Math.min(...contract_data.map(low => low.quantity)),
            change: (contract_data[contract_data.length-1].quantity - contract_data[0].quantity),
            high: Math.max(...contract_data.map(high => high.quantity)),
            close: contract_data[contract_data.length-1].quantity,
        };
        this.open_interest = {
            open: parseFloat((contract_data[0].open_interest).toFixed(2)),
            low: parseFloat(Math.min(...contract_data.map(low => low.open_interest)).toFixed(2)),
            change: parseFloat((contract_data[contract_data.length-1].open_interest - contract_data[0].open_interest).toFixed(2)),
            high: parseFloat(Math.max(...contract_data.map(high => high.open_interest)).toFixed(2)),
            close: parseFloat((contract_data[contract_data.length-1].open_interest).toFixed(2)),
        };
        let price_data = [];
        let timestamp_data = [];
        let sellers = [];
        for (let i = 0; i < contract_data.length; i++) {
            price_data = [...price_data.concat(contract_data[i].price)];
            timestamp_data = [...new Set(timestamp_data.concat(contract_data[i]._id))];
            if (contract_data[i].sellers) sellers = [...new Set(sellers.concat(contract_data[i].sellers))];
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
        //TODO Value at Risk and only for M
        /**
         * @return {number}
         */
        function VaR (portfolioEquityCurve, alpha) {
            // Compute the returns and remove the first element, always equals to NaN
            function arithmeticReturns (portfolioEquityCurve) {
                portfolioEquityCurve = portfolioEquityCurve.map(x=>parseInt(x));
                let returns = new Array(portfolioEquityCurve.length); // Inherit the array type from the input array
                returns[0] = NaN;
                for (let i = 1; i < portfolioEquityCurve.length; ++i) {
                    returns[i] = Number((portfolioEquityCurve[i] - portfolioEquityCurve[i-1])/portfolioEquityCurve[i-1]);
                }
                // Return the arithmetic returns
                return returns;
            }
            let returns = arithmeticReturns(portfolioEquityCurve).slice(1);
            console.log(returns);
            // Sort the returns from lowest to highest values
            returns.sort((a, b) => { return a - b;});
            // Compute w
            // C.f. p. 383 of the reference
            let c_alpha = 1 - alpha;
            let w = c_alpha * returns.length;
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
            stdDev: parseFloat((standardDeviation(contract_data.map(low => low.price*100))/100).toFixed(2)),
            stdDev_size: parseFloat((standardDeviation(contract_data.map(low_size => low_size.price_size*100))/100).toFixed(2))
        };
/*        if (type === 'M') {
            this.risk.VaR = parseFloat(VaR(contract_data.map(low => low.price*100),0.80).toFixed(2));
            this.risk.VaR_size = parseFloat(VaR(contract_data.map(low => low.price_size*100).filter((value)=> value !== 0),0.80).toFixed(2));
        }*/
        if (sellers.length) {
            this.sellers = {
                sellers: sellers,
                open: contract_data[0].sellers.length,
                change: contract_data[contract_data.length-1].sellers.length - contract_data[0].sellers.length,
                close: contract_data[contract_data.length-1].sellers.length,
                total: sellers.length,
            };
        }
    }
};