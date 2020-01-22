 // Nov 26 2007 - Jan 22 2013
// Example URL: https://query1.finance.yahoo.com/v8/finance/chart/SPY?symbol=SPY&period1=1196110800&period2=1358888400&interval=1d&events=div

// (Jan 26 2007 <- 10 month buffer;) Nov 26 2007 - Jan 22 2013
// Example URL: https://query1.finance.yahoo.com/v8/finance/chart/SPY?symbol=SPY&period1=1169845200&period2=1358888400&interval=1d&events=div;
const dataJson = require('./data.json');
const moment = require('moment');

// DEFAULT PARAMETERS
const startDate = moment('2007-12-03', 'YYYY-MM-DD');
const endDate = moment('2013-01-22', 'YYYY-MM-DD');
const taxableAnnualSalary = 75000;
const startingCash = 100000;

const tenMonthMovingAverageParams = {
    startingInMarket: false,
    startingCashMoney: startingCash,
    startingMarketMoney: 0,
    taxableAnnualSalary: taxableAnnualSalary,
    startDate: startDate,
    endDate: endDate,
    method: 'tenMonthMovingAverage',
};

const traditionalParams = {
    startingInMarket: true,
    startingCashMoney: 0,
    startingMarketMoney: startingCash,
    taxableAnnualSalary: taxableAnnualSalary,
    startDate: startDate,
    endDate: endDate,
    method: 'traditional',
};

const t = 1169821800;

const mt = moment('2007-12-03T14:30:00', 'YYYY-MM-DDT')

// const tenMonthMovingAverageResults = calculateModel(tenMonthMovingAverageParams);



function calculateModel(params) {
    const taxesOwed = 0;
    const feesPaid = 0;
    let previousPrice = null;

    

    const results = { };

    return results;
}

function OLD_calculateModel() {
    const startDate = moment('2007-12-03', 'YYYY-MM-DD');
    const endDate = moment('2013-01-22', 'YYYY-MM-DD');
    
    const result = dataJson.chart.result[0];
    const timestamps = result.timestamp;
    const dividends = result.events.dividends;
    const closePrices = result.indicators.quote[0].close;
    
    const expenseRatio = 0.000945;
    const tradingDaysPerYear = 252;
    const tradingDayExpenseRatio = expenseRatio / tradingDaysPerYear;
    let startingBalance = 100000;
    let startingMarketMoney = 0;
    const startingMarketState = true;
    const isTenMonthMovingAverage = false;
    // const startingMarketState = false;
    // const isTenMonthMovingAverage = true;
    
    if(isTenMonthMovingAverage) {
        
    }
    else {
        startingMarketMoney = startingBalance;
        startingBalance = 0;
    }
    
    
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
                    // End of Month Price
                    // timestamp: previous.timestamp,
                    // price: previous.price,
                    // Start of Month Price
                    timestamp: timestamp,
                    price: priceDateTimes[i].price,
                });                
            }
        }
    }
    
    const finalBalanceObject = timestamps.reduce((results, timestamp, index) => {
        const closingPrice = closePrices[index];
        
        // If current date === first trading day of month,
        const date = moment.unix(timestamp);
    
        if(date.isBefore(startDate) || date.isAfter(endDate)) {
            return results;
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
                    results.cashMoney = results.marketMoney;
                    results.marketMoney = 0;
                }
                else if(!results.isInMarket && closingPrice > tenMonthMovingAverage) {
                    // GET IN - BUY
                    console.log(`GET IN - BUY  => ${date.toString()}`);
                    console.log(`Average: $${tenMonthMovingAverage}`);
                    console.log(`Price: $${closingPrice}`);                
                    results.isInMarket = true;
                    results.marketMoney = results.cashMoney;
                    results.cashMoney = 0;       
                }
            }
        }
        
        if(results.isInMarket) {
            
            // Check for Dividend
            const dividend = dividends[timestamp];
    
            if(dividend) {
                const dollarDividendEarnings = (results.marketMoney / closingPrice) * dividend.amount;
                debugger;
                results.marketMoney += dollarDividendEarnings;
            }
        
            // Daily Expense Ratio Fees
            const fees = results.marketMoney * tradingDayExpenseRatio;
            results.fees -= fees;
        }
    
        return results;
    }, { 
        cashMoney: startingBalance ,
        marketMoney: startingMarketMoney, 
        fees: 0, 
        taxes: 0, 
        isInMarket: startingMarketState,
        unrealizedGains: 0,
        lastBuyDate: null,
    });
    
    const lastPrice = closePrices[closePrices.length - 1];
    
    console.log(`lastPrice: ${lastPrice}`);
    
    if(isTenMonthMovingAverage) {
        console.log('CASE 2 - 10 MONTH MOVING AVERAGE');
    }
    else {
        console.log('CASE 1 - RIDING THE ROLLERCOASTER');
    }
    
    // finalBalanceObject.cashMoney = finalBalanceObject.shares * lastPrice;
    
    console.log('STARTING DATE: ' + startDate.toString());
    console.log('ENDING DATE: ' + endDate.toString());
    
    console.log('Fees Paid: ' + finalBalanceObject.fees);
    console.log('Taxes Owed: ' + finalBalanceObject.taxes);
    
    console.log('Cash Money: ' + finalBalanceObject.cashMoney);
}



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