// const VOO = require('./originalData/VOO');
// const VFINX = require('./originalData/VFINX');
// const VTI = require('./originalData/VTI');
// const fs = require('fs');

// const SPY = require('./originalData/SPY');
const moment = require('moment');

// const result = SPY.chart.result[0];
// const meta = result.meta;
// const timestamps = result.timestamp;
// const dividends = result.events.dividends;
// const closePrices = result.indicators.quote[0].close;

// const newDividends = {};

// for(let key of Object.keys(dividends)) {

//     const d = dividends[key];

//     let time = moment.unix(d.date).utc().startOf('day').unix() + '';

//     debugger;

//     newDividends[time] = {amount: dividends[key].amount }
// }

// const prices = timestamps.reduce((arr, timestamp, index) => {


//     const close = closePrices[index];

//     const price = {
//         timestamp: timestamp,
//         price: close
//     };

//     arr.push(price);

//     return arr;
// }, []);


// for(let price of prices) {

//     let time = moment.unix(price.timestamp).utc().startOf('day').unix();

//     debugger;

//     price.timestamp = time;
// }

// debugger;

// const jsonData = {
//     meta,
//     prices,
//     dividends: newDividends,
// };

// fs.writeFileSync('./SPY_V2.json',  JSON.stringify(jsonData))




// debugger;

// Example URL
// https://query1.finance.yahoo.com/v8/finance/chart/VOO?symbol=VOO&period1=729129600&period2=1579736788&interval=1d&events=div;
// https://query1.finance.yahoo.com/v8/finance/chart/VFINX?symbol=VFINX&period1=729129600&period2=1579736788&interval=1d&events=div;

// TODO: transform data and save new json file. Then load that new json file.


const SPYV2 = require('./SPY_V2');

const symbols = {
    SPY: SPYV2
};

// const taxes = require('./taxes');

function getPrices(startDate, endDate, symbol) {
    const start = moment(startDate).utc().startOf('day').unix();
    const end = moment(endDate).utc().startOf('day').unix();
    const prices = symbols[symbol].prices;
    const startIndex = prices.findIndex((price) => {
        return price.timestamp === start;
    });
    const endIndex = prices.findIndex((price) => {
        return price.timestamp === end;
    });

    const slice = prices.slice(startIndex, endIndex);

    return slice;
}

/**
 * 
 * @param {*} date Must already be in unix + utc for and set to start of day.
 * @param {*} symbol 
 */
function getDividendAmount(date, symbol) {
    const dividends = symbols[symbol].dividends;
    const dividend = dividends[date];

    if(dividend) {
        return dividend.amount;
    }

    return 0;
}

function calculateTaxForDividend(amount, salary, year) {

}

function getTenMonthAverage(date, symbol) {
    // getFirstTradingDayOfMonthClosingPrice()

    // determine if 10 months of data is available. Error if not.

    
}

// HELPER FUNCTIONS
function getFirstTradingDayOfMonthClosingPrice(date) {

}


module.exports = { getPrices, getTenMonthAverage, getDividendAmount, calculateTaxForDividend };