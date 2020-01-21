 // Nov 26 2007 - Jan 22 2013
// Example URL: https://query1.finance.yahoo.com/v8/finance/chart/SPY?symbol=SPY&period1=1196110800&period2=1358888400&interval=1d&events=div

// (Jan 26 2007 <- 10 month buffer;) Nov 26 2007 - Jan 22 2013
// Example URL: https://query1.finance.yahoo.com/v8/finance/chart/SPY?symbol=SPY&period1=1169845200&period2=1358888400&interval=1d&events=div;
const dataJson = require('./data.json');
const moment = require('moment');

const startDate = moment('2007-12-3') 
const endDate = moment('2013-01-22')

const result = dataJson.chart.result[0];
const timestamps = result.timestamp;
const dividends = result.events.dividends;
const closePrices = result.indicators.quote[0].close;

const expenseRatio = 0.0945;
const tradingDaysPerYear = 252;
const tradingDayExpenseRatio = expenseRatio / tradingDaysPerYear;
const startingMarketState = false;
const isTenMonthMovingAverage = true;

let startingBalance = 100000;
let startingShares = 0;

const priceDateTimes = timestamps.map((timestamp, index) => {
    const price = closePrices[index];

    return {
        price, 
        timestamp
    };
});

const closingMonthPrices = [];
for(let i = 0; i < priceDateTimes.length; i++) {
    const timestamp = priceDateTimes[i].timestamp;
    const timestampMoment = moment.unix(timestamp);

    if(i > 0) {
        const previous = priceDateTimes[i - 1];
        const previousTimestamp = moment.unix(previous.timestamp);

        if(timestampMoment.month() !== previousTimestamp.month()) {
            closingMonthPrices.push({
                timestamp: previous.timestamp,
                price: previous.price,
            });                
        }
    }
}

// closingMonthPrices.forEach((item) => {
//     console.log(moment.unix(item.timestamp).toString());
//     console.log(item.price);
// });
let firstDayComplete = false;


const finalBalanceObject = timestamps.reduce((results, timestamp, index) => {
    const closingPrice = closePrices[index];

    
    // If current date === last trading day of month,
    const date = moment.unix(timestamp);

    if(date.isBefore(startDate) || date.isAfter(endDate)) {
        return results;
    }

    if(!firstDayComplete && !isTenMonthMovingAverage) {
        firstDayComplete = true;
        results.shares = results.cash / closingPrice;
        // debugger;
        results.cash = 0;
    }

    const result = closingMonthPrices.findIndex((item, index) => {
        return item.timestamp === timestamp;
    });

    if(isTenMonthMovingAverage && result > 0) {
        // debugger;
        // Calculate the 10 month moving average.
        const tenMonthMovingAverage = calculateTenMonthMovingAverage(timestamp, closingMonthPrices);
        
        if(tenMonthMovingAverage > 0) {
            // debugger;

            if(results.isInMarket && tenMonthMovingAverage > closingPrice) {
                // GET OUT - SELL
                console.log(`GET OUT - SELL => ${date.toString()}`);
                console.log(`Average: $${tenMonthMovingAverage}`);
                console.log(`Price: $${closingPrice}`);
                results.isInMarket = false;
                debugger;
                results.cash = results.shares * closingPrice;
            }
            else if(!results.isInMarket && closingPrice > tenMonthMovingAverage) {
                // GET IN - BUY
                console.log(`GET IN - BUY  => ${date.toString()}`);
                console.log(`Average: $${tenMonthMovingAverage}`);
                console.log(`Price: $${closingPrice}`);                
                results.isInMarket = true;
                debugger;
                results.shares = results.cash / closingPrice;
                results.cash = 0;
            }
        }
    }
    
    if(results.isInMarket) {
        // Check for Dividend
        const dividend = dividends[timestamp];

        if(dividend) {
            const dollarDividendEarnings = results.shares * dividend.amount;
            results.shares += dollarDividendEarnings / closingPrice
            // results.cash += dollarDividendEarnings;
        }
    
        // Daily Expense Ratio Fees
        const fees = (closingPrice * results.shares) * tradingDayExpenseRatio; 
        // results.cash -= fees;
        results.feesPaid += fees;
    }

    return results;
}, { cash: startingBalance , feesPaid: 0, shares: startingShares, isInMarket: startingMarketState });

const lastPrice = closePrices[closePrices.length - 1];

if(isTenMonthMovingAverage) {
    console.log('CASE 2 - 10 MONTH MOVING AVERAGE');
    finalBalanceObject.cash = finalBalanceObject.shares * lastPrice;
    finalBalanceObject.shares = 0;
}
else {
    console.log('CASE 1 - RIDING THE ROLLERCOASTER');
    finalBalanceObject.cash = finalBalanceObject.shares * lastPrice;
    finalBalanceObject.shares = 0;
}

console.log('STARTING DATE: ' + startDate.toString());
console.log('ENDING DATE: ' + endDate.toString());

// debugger;
const finalBalance = finalBalanceObject.cash;

console.log('feesPaid: ' + finalBalanceObject.feesPaid);
console.log('shares: ' + finalBalanceObject.shares);

console.log('finalBalance: ' + finalBalance);
debugger;

function calculateTenMonthMovingAverage(timestamp, monthlyClosingPrices) {


    const index = monthlyClosingPrices.findIndex((item) => {
        return item.timestamp === timestamp;
    });

    if(index > 9) {
        const prices = monthlyClosingPrices.slice(index - 10, index);
        const sum = prices.reduce((sum, item) => {
            return sum += item.price;
        }, 0);
        const average = sum / prices.length;
    
        return average;
    }

    return 0;
}