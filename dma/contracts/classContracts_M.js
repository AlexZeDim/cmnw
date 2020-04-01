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
        let price_low_Array = [];
        let price_high_Array = [];
        let quantity_low_Array = [];
        let quantity_high_Array = [];
        let oi_low_Array = [];
        let oi_high_Array = [];
        let price_Array = [];
        let price_size_Array = [];
        let orders_a = 0;
        let orders_c = 0;
        let orders_e = 0;
        let o_low_Array = [];
        let o_high_Array = [];
        const sellersArray = new Set();
        const ordersArray = new Set();
        const standardDeviation = (arr, usePopulation = true) => {
            const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
            return Math.sqrt(
                arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0) /
                (arr.length - (usePopulation ? 0 : 1))
            );
        };
        const VaR = (portfolioEquityCurve, alpha) => {
            const arithmeticReturns = portfolioEquityCurve => {
                let returns = new Array(portfolioEquityCurve.length);
                returns[0] = NaN;
                for (let i = 1; i < portfolioEquityCurve.length; ++i) {
                    returns[i] = Number((portfolioEquityCurve[i] - portfolioEquityCurve[i-1])/portfolioEquityCurve[i-1]);
                }
                return returns;
            };
            let returns = arithmeticReturns(portfolioEquityCurve).slice(1);
            returns.sort((a, b) => { return a - b;});
            let c_alpha = 1 - alpha;
            let w = c_alpha * returns.length;
            if (w === 0) {
                return 0;
            }
            return parseFloat((-returns[Math.round(w)-1]).toFixed(2));
        };
        contract_data.map(({price, quantity, open_interest, orders, sellers, data}, i) => {
            if (price) {
                let {low, high} = price;
                price_low_Array.push(low);
                price_high_Array.push(high);
            }
            if (quantity) {
                let {low, high} = quantity;
                quantity_low_Array.push(low);
                quantity_high_Array.push(high);
            }
            if (open_interest) {
                let {low, high} = open_interest;
                oi_low_Array.push(low);
                oi_high_Array.push(high);
            }
            if (orders) {
                let {orders_added, orders_cancelled, orders_expired, low, high} = orders;
                orders_a += orders_added;
                orders_c += orders_cancelled;
                orders_e += orders_expired;
                o_low_Array.push(low);
                o_high_Array.push(high);
                console.log(orders)
            }
            data.map(({price, price_size, sellers, orders}) => {
                if (orders) {
                    orders.map(({id}) => {
                        ordersArray.add(id);
                    })
                }
                price_Array.push(price);
                if (price_size) price_size_Array.push(price_size);
                if (sellers) sellers.map(x => sellersArray.add(x))
            })
        });
        console.log(price_size_Array);
        this.price = {
            open: contract_data[0].price.open,
            low: Math.min(...price_low_Array),
            avg: parseFloat((price_Array.reduce((total, next) => total + next, 0) / price_Array.length).toFixed(2)),
            change: parseFloat((contract_data[contract_data.length-1].price.close - contract_data[0].price.open).toFixed(2)),
            high: Math.max(...price_high_Array),
            close: contract_data[contract_data.length-1].price.close
        };
        this.risk = {
            stdDev: parseFloat(standardDeviation(price_Array).toFixed(2)),
            VaR: VaR(price_Array, 0.8)
        };
        if (price_size_Array.length) {
            this.risk.stdDev_size = parseFloat(standardDeviation(price_size_Array).toFixed(2));
            this.risk.VaR_size = VaR(price_size_Array, 0.80);
            this.price_size = {
                open: price_size_Array[0],
                low: Math.min(...price_size_Array),
                change: parseFloat((price_size_Array[price_size_Array.length - 1] - price_size_Array[0]).toFixed(2)),
                avg: parseFloat((price_size_Array.reduce((total, next) => total + next, 0) / price_size_Array.length).toFixed(2)),
                high: Math.max(...price_size_Array),
                close: price_size_Array[price_size_Array.length - 1],
            };
        }
        this.quantity = {
            open: contract_data[0].quantity.open,
            low: Math.min(...quantity_low_Array),
            change: (contract_data[contract_data.length-1].quantity.close - contract_data[0].quantity.open),
            high: Math.max(...quantity_high_Array),
            close: contract_data[contract_data.length-1].quantity.close,
        };
        this.open_interest = {
            open: contract_data[0].open_interest.open,
            low: Math.min(...oi_low_Array),
            change: parseFloat((contract_data[contract_data.length-1].open_interest.close - contract_data[0].open_interest.open).toFixed(2)),
            high: Math.max(...oi_high_Array),
            close: contract_data[contract_data.length-1].open_interest.close,
        };
        //TODO orders
        if (ordersArray.size !== 0) {
            this.orders = {
                open: contract_data[0].orders.open,
                low: Math.min(...o_low_Array),
                change: (contract_data[contract_data.length-1].orders.close - contract_data[0].orders.open),
                high: Math.max(...o_high_Array),
                close: contract_data[contract_data.length-1].orders.close,
                orders_total: ordersArray.size,
                orders_added: orders_a,
                orders_cancelled: orders_c,
                orders_expired: orders_e,
                ratio_added: parseFloat((orders_a/ordersArray.size).toFixed(2)),
                ratio_cancelled: parseFloat((orders_c/ordersArray.size).toFixed(2)),
                ratio_expired: parseFloat((orders_e/ordersArray.size).toFixed(2)),
            };
        }
        if (sellersArray.size !== 0) {
            this.sellers = {
                sellers: [...sellersArray],
                open: contract_data[0].sellers.open,
                change: contract_data[contract_data.length-1].sellers.close - contract_data[0].sellers.open,
                close: contract_data[contract_data.length-1].sellers.close,
                total: sellersArray.size,
            };
        }
    }
};