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
const taxes = require('./capitalGainsTax');

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

/**
 * 
 * @param {*} amount The full amount in USD of dividend reward
 * @param {*} salary 
 * @param {*} year 
 * @param {*} term 
 */
function calculateTaxForDividend(amount, salary, year, term) {
    const brackets = taxes[year].brackets;

    let taxRate;

    for(let bracket of brackets) {

        // Top Income Bracket
        // if(!bracket.maxBracketValue) {
        //     if(term === 'short') {
        //         taxRate = bracket.shortTermRate / 100;
        //     } 
        //     else if(term === 'long') {
        //         taxRate = bracket.longTermRate / 100;
        //     }

        //     return amount * taxRate
        // }
        // else {
        //     if(bracket.minBracketValue <= salary && salary <= bracket.maxBracketValue) {
    
        //     }

        // }
    }
    debugger;
}

function getTenMonthAverage(timestamp, symbol) {
    // TODO: determine if 10 month moving average is possible (aka enough historical data)

    const lastUpdate = symbols[symbol].lastUpdate;

    const prices = symbols[symbol].prices;

    // const openingMonthPrice = getFirstTradingDayOfMonthClosingPrices(prices, timestamp);

    const index = openingMonthPrice.findIndex((item) => {
        return item.timestamp === timestamp;
    });

    debugger;

    if(index > 9) {
        const tenMonthPrices = openingMonthPrice.slice(index - 10, index);
        const sum = tenMonthPrices.reduce((sum, item) => {
            return sum += item.price;
        }, 0);
        const average = sum / tenMonthPrices.length;

        debugger;
    
        return average;
    }
    debugger;




    return 0;
}



// HELPER FUNCTIONS
function getFirstTradingDayOfMonthClosingPrices(prices, timestamp) {
    const openingMonthPrices = [];

    const targetTimestampMonth = moment.unix(timestamp).month();

    // for(let i = )

    // let index = prices.findIndex((item) => {
    //     return item.timestamp === timestamp;
    // });

    // let closingPrice = prices[index].price;

    // let currentTimestampMonth = moment.unix(prices[index - 1].timestamp);
debugger;

while(openingMonthPrices.length < 10) {
    debugger;
    while(currentTimestampMonth.month() === targetTimestampMonth) {
        index--;
        closingPrice = prices[index - 1].price;
        openingMonthPrices.push(closingPrice);
        debugger;
        
        // firstTradingDay = 
        currentTimestampMonth = moment.unix(prices[index].timestamp);

    }

}

    // return closingPrice;



    debugger;

    // for(let i = 0; i < prices.length; i++) {
    //     // const timestamp = prices[i].timestamp;
    //     const timestampMoment = moment.unix(timestamp);
    
    //     if(i > 0) {
    //         const previous = prices[i - 1];
    //         const previousTimestamp = moment.unix(previous.timestamp);

    //         debugger;
    
    //         if(timestampMoment.month() !== previousTimestamp.month()) {
    //             openingMonthPrices.push({
    //                 // End of Month Price
    //                 // timestamp: previous.timestamp,
    //                 // price: previous.price,
    //                 // Start of Month Price
    //                 timestamp: timestamp,
    //                 price: prices[i].price,
    //             });                
    //         }
    //     }
    // }

    debugger;

    return openingMonthPrices;
}


module.exports = { getPrices, getTenMonthAverage, getDividendAmount, calculateTaxForDividend };