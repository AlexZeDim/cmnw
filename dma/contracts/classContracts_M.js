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
        contract_data.map(({price, price_size, quantity, open_interest, data}, i) => {
            if (price) {
                let {low, high} = price;
                price_low_Array.push(low);
                price_high_Array.push(high);
            }
            if (price_size) {
                console.log(price_size)
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
        });
        this.price = {
            open: contract_data[0].price.open,
            low: Math.min(...price_low_Array),
            //TODO avg
            change: parseFloat((contract_data[contract_data.length-1].price.close - contract_data[0].price.open).toFixed(2)),
            high: Math.max(...price_high_Array),
            close: contract_data[contract_data.length-1].price.close
        };
        //TODO price_size
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
            close: contract_data[contract_data.length-1].open.close,
        };
        //TODO orders
        this.risk = {

        }
    }
};