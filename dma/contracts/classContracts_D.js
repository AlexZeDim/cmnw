module.exports = class Contract {
    constructor(
        id,
        code,
        item_id,
        connected_realm_id,
        type,
        contract_data
    ) {
        this._id = id;
        this.code = code;
        this.item_id = item_id;
        this.connected_realm_id = connected_realm_id;
        this.type = type;
        let expired_Array = [];
        let orders_Array = [];
        let price_Array = [];
        let price_size_Array = [];
        let quantity_Array = [];
        let open_interest_Array = [];
        let orders_count_Array = [];
        const added_orders = new Set();
        const cancelled_orders = new Set();
        const expired_orders = new Set();
        const total_orders = new Set();
        const sellersArray = new Set();
        contract_data.map(({_id, price, price_size, quantity, open_interest, orders, sellers}, i) => {
            price_Array.push(parseFloat(price.toFixed(2)));
            quantity_Array.push(parseFloat(quantity.toFixed(2)));
            open_interest_Array.push(parseFloat(open_interest.toFixed(2)));
            if (!!price_size) {
                price_size_Array.push(parseFloat(price_size.toFixed(2)));
            }
            if (orders) {
                orders_count_Array.push(orders.length);
                orders.map(({id, time_left}) => {
                    if (time_left === 'SHORT') {
                        expired_Array.push(id);
                        expired_orders.add(id);
                    }
                    total_orders.add(id);
                    orders_Array.push(id)
                });
                let orders_T0 = orders_Array.filter(val => !expired_Array.includes(val));
                let orders_T1;
                let orders_C;
                let orders_A;
                if (contract_data[i+1]) {
                    orders_T1 = contract_data[i+1].orders.map(({id}) => id);
                    orders_C = orders_T0.filter(order => {
                        if (!orders_T1.includes(order)) {
                            cancelled_orders.add(order);
                            return order
                        }
                    });
                    orders_A = orders_T1.filter(order => {
                        if (!orders_T0.includes(order)) {
                            added_orders.add(order);
                            return order
                        }
                    });
                    contract_data[i].added = orders_A.length;
                    contract_data[i].canceled = orders_C.length;
                }
                contract_data[i].expired = expired_Array.length;
                orders_Array = [];
                expired_Array = [];
            }
            if (sellers) {
                sellers.map( seller => sellersArray.add(seller));
            }
        });
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
        const VaR = (portfolioEquityCurve, alpha) => {
            // Compute the returns and remove the first element, always equals to NaN
            const arithmeticReturns = portfolioEquityCurve => {
                portfolioEquityCurve = portfolioEquityCurve.map(x=>parseFloat(x));
                let returns = new Array(portfolioEquityCurve.length); // Inherit the array type from the input array
                returns[0] = NaN;
                for (let i = 1; i < portfolioEquityCurve.length; ++i) {
                    returns[i] = Number((portfolioEquityCurve[i] - portfolioEquityCurve[i-1])/portfolioEquityCurve[i-1]);
                }
                // Return the arithmetic returns
                return returns;
            };
            let returns = arithmeticReturns(portfolioEquityCurve).slice(1);
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
        };
        this.price = {
            open: price_Array[0],
            low: Math.min(...price_Array),
            change: parseFloat((price_Array[price_Array.length-1] - price_Array[0]).toFixed(2)),
            avg: parseFloat((price_Array.reduce((total, next) => total + next, 0) / price_Array.length).toFixed(2)),
            high: Math.max(...price_Array),
            close: price_Array[price_Array.length-1],
        };
        this.risk = {
            stdDev: parseFloat((standardDeviation(price_Array.map(price => price*100))/100).toFixed(2)),
        };
        if (price_size_Array.length) {
            this.risk.stdDev_size = parseFloat((standardDeviation(price_size_Array.map(price_size => price_size*100))/100).toFixed(2))
            this.price_size = {
                open: price_size_Array[0],
                low: parseFloat(Math.min(...price_size_Array).toFixed(2)),
                change: parseFloat((price_size_Array[price_size_Array.length - 1] - price_size_Array[0]).toFixed(2)),
                avg: parseFloat((price_size_Array.reduce((total, next) => total + next, 0) / price_size_Array.length).toFixed(2)),
                high: parseFloat(Math.max(...price_size_Array).toFixed(2)),
                close: price_size_Array[price_size_Array.length - 1],
            };
        }
        if (orders_count_Array.length) {
            this.orders = {
                open: orders_count_Array[0],
                low: Math.min(...orders_count_Array),
                change: (orders_count_Array[orders_count_Array.length-1] - orders_count_Array[0]),
                high: Math.max(...orders_count_Array),
                close: orders_count_Array[orders_count_Array.length-1],
                orders_total: total_orders.size,
                orders_added: added_orders.size,
                orders_cancelled: cancelled_orders.size,
                orders_expired: expired_orders.size,
                ratio_added: parseFloat((added_orders.size/total_orders.size).toFixed(2)),
                ratio_cancelled: parseFloat((cancelled_orders.size/total_orders.size).toFixed(2)),
                ratio_expired: parseFloat((expired_orders.size/total_orders.size).toFixed(2)),
            };
        }
        this.quantity = {
            open: quantity_Array[0],
            low: Math.min(...quantity_Array),
            change: (quantity_Array[quantity_Array.length-1] - quantity_Array[0]),
            high: Math.max(...quantity_Array),
            close: quantity_Array[quantity_Array.length-1],
        };
        this.open_interest = {
            open: open_interest_Array[0],
            low: Math.min(...open_interest_Array),
            change: parseFloat((open_interest_Array[open_interest_Array.length-1] - open_interest_Array[0]).toFixed(2)),
            high: Math.max(...open_interest_Array),
            close: open_interest_Array[open_interest_Array.length-1],
        };
        if (sellersArray.size !== 0) {
            this.sellers = {
                sellers: sellersArray,
                open: contract_data[0].sellers.length,
                change: contract_data[contract_data.length-1].sellers.length - contract_data[0].sellers.length,
                close: contract_data[contract_data.length-1].sellers.length,
                total: sellersArray.size,
            };
        }
        this.data = contract_data;

/*        if (type === 'M') {
            this.risk.VaR = parseFloat(VaR(contract_data.map(low => low.price*100),0.80).toFixed(2));
            this.risk.VaR_size = parseFloat(VaR(contract_data.map(low => low.price_size*100).filter((value)=> value !== 0),0.80).toFixed(2));
        }*/

    }
};