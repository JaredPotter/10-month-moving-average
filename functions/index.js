// const admin = require('firebase-admin');
const functions = require('firebase-functions');
const axios = require('axios');
const moment = require('moment');
// const cors = require('cors');
// const corsHandler = cors({origin: true});
const cors = require('cors')({origin: true});

const mongoDbService = require('./mongoDbService')
// const serviceAccount = require('./month-mov-avg-notifier-firebase-adminsdk-qwmh7-c5e2115c16.json');

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: 'https://month-mov-avg-notifier.firebaseio.com'
// });

const runtimeOpts = {
    timeoutSeconds: 120,
    memory: '2GB'
};

// Cron Job Schedule - How Often to trigger the function.
const schedule = '30 17 * * *'; // Everyday at 9am server time.

const fetchDailyData = async function() {
    console.log('Running Daily Fetch Data');
    // debugger;

    const symbols = await mongoDbService.find();

    for(let symbol of symbols) {
        const id = symbol._id;
        console.log('Fetching data for: ' + id);
        const lastUpdated = symbol.lastUpdated;
        const currentData = symbol;

        const data = await fetchData(id, lastUpdated, currentData);

        if(!data) {
            console.log('No New Data!');
            continue;
        }

        const newData = { ...currentData };
    
        newData.prices = newData.prices.concat(data.prices);
        newData.dividends = { ...currentData.dividends, ...data.dividends };
        newData.lastUpdated = data.lastUpdated;

        // Check if today is a new trading day month.
        const prices = newData.prices;
        const currentDay = prices[prices.length - 1];
        const previousPreviousDay = prices[prices.length - 2];
        const currentDayMoment = moment.unix(currentDay.timestamp).utc();
        const previousPreviousDayMoment = moment.unix(previousPreviousDay.timestamp).utc();
    
        if(previousPreviousDayMoment.isBefore(currentDayMoment, 'month')) {
            console.log('First Trading Day of the Month!!!');
    
            const tenMonthMovingAverages = symbol.tenMonthMovingAverages;
            let lastUpdated = tenMonthMovingAverages.lastUpdated;
    
            if(lastUpdated === '0') {
                lastUpdated = prices[0].timestamp;
            }
            
            const lastUpdatedMoment = moment.unix(Number(lastUpdated)).utc().startOf('day');
            lastUpdatedMoment.add(1, 'month');
            lastUpdated = lastUpdatedMoment.unix();

            const nowDay = Number(currentDay.timestamp);
            const averages = [];
            
            // debugger;
            while(lastUpdated < nowDay) {
                const average = await calculateTenMonthMovingAverage(lastUpdated, newData.prices);
    
                if(average) {
                    averages.push(average);
                }
    
                lastUpdatedMoment.add(1, 'month');
                lastUpdated = lastUpdatedMoment.unix();
            }
    
            newData.tenMonthMovingAverages = {
                lastUpdated: nowDay + '',
                averages: newData.tenMonthMovingAverages.averages.concat(averages),
            };
        }
    
        // UPDATE SYMBOL
        const query = {
            _id: id
        };
        const result = await mongoDbService.update(query, newData);
    
        // TODO: if 1st day of trading week, calculate 40 week moving average.
    }

    console.log(symbols);
};

async function fetchData(symbol, lastUpdated, currentData) {
    const now = moment();
    const nowUnix = now.unix();

    // const nowUnix = 946684800;

// Example URL
// https://query1.finance.yahoo.com/v8/finance/chart/VOO?symbol=VOO&period1=729129600&period2=1579736788&interval=1d&events=div;
// https://query1.finance.yahoo.com/v8/finance/chart/VFINX?symbol=VFINX&period1=729129600&period2=1579736788&interval=1d&events=div;    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?symbol=${symbol}&period1=${lastUpdated}&period2=${nowUnix}&interval=1d&events=div`;
    const response = await axios.get(url);

    if(response.status === 404) {
        return;
    }

    const data = response.data;

    if(!data.chart.result[0].timestamp) {
        console.log('No New Data.');
        return; 
    }

    const transformedData = await transformData(data);

    if(transformedData.prices.length === 0 && Object.keys(transformedData.dividends).length === 0) {
        return;
    }

    return transformedData;
}

async function getSymbolName(symbol) {
    const url = `https://www.google.com/search?q=${symbol}`;
    const googleResults = await axios.get(url);
    const cheerioClient = cheerio.load(googleResults.data);
    let name = null;

    if (symbol.includes('-')) {
        // Exchange Ratio between 2 currencies
        const destinationCurrencyText = cheerioClient(
            '#main > div:nth-child(4) > div > div:nth-child(3) > div > div > div > div > div:nth-child(2) > div > div > div > div > span'
        ).text();
        const destinationCurrencySplit = destinationCurrencyText.split(' ');
        const destinationCurrency = destinationCurrencySplit
            .splice(1, destinationCurrencySplit.length - 1)
            .join('');
        const originCurrencyText = cheerioClient(
            '#main > div:nth-child(4) > div > div:nth-child(3) > div > div > div > div > div:nth-child(1) > div > div > div > div'
        ).text();
        const originCurrencySplit = originCurrencyText.split(' ');
        const originCurrency = originCurrencySplit
            .splice(1, originCurrencySplit.length - 1)
            .join(' ');
        name = `${destinationCurrency} => ${originCurrency}`;
    } else {
        // Fund / Stock Symbol
        name = cheerioClient(
            '#main > div:nth-child(5) > div > div.kCrYT > span:nth-child(1) > span'
        ).text();
    }

    return name;
}


async function transformData(data) {
    // TRANSFORM DATA
    const result = data.chart.result[0];
    // const meta = result.meta;
    const symbol = result.meta.symbol;
    const timestamps = result.timestamp;
    const dividends = result.events ? result.events.dividends : {};
    const closePrices = result.indicators.quote[0].close;

    const newDividends = {};

    for(let key of Object.keys(dividends)) {

        const d = dividends[key];

        const time = moment.unix(d.date).utc().startOf('day').unix() + '';

        newDividends[time] = {amount: dividends[key].amount }
    }

    const prices = [];

    // debugger;

    for(let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const time = moment.unix(timestamp).utc().startOf('day').unix() + '';
        const closePrice = closePrices[i];            
        const price = {
            timestamp: time,
            price: closePrice
        };
        const existing = prices.findIndex((price) => {
            return price.timestamp === time;
        });
        
        if(existing !== -1) {
            debugger;
            continue;
        }
                        
        const query = { $and: [ { _id: symbol }, { 'prices.timestamp': { $in: [time] } } ] };
        const existingDay = await mongoDbService.findOne(query);

        if(!existingDay) {


            // const acc = await arr;

            prices.push(price);
        }
    }

    // debugger;

    const nowUnix = moment().utc().startOf('day').unix() + '';

    const transformedData = {
        prices: prices,
        dividends: newDividends,
        lastUpdated: nowUnix + '',
    };

    // debugger;

    return transformedData;
}

async function calculateTenMonthMovingAverage(timestamp, prices) {
    const timestampMoment = moment.unix(Number(timestamp)).utc().startOf('day');
    const timestampMomentMinusTenMonths = moment(timestampMoment).add(-9, 'months');
    const firstPrice = prices[0];
    const firstTimestamp = firstPrice.timestamp;
    const firstTimestampMoment = moment.unix(Number(firstTimestamp));

    // Before
    if(timestampMomentMinusTenMonths.isBefore(firstTimestampMoment)) {
        console.log('timestamp too early. Not enough historical data.');
        return;
    }

    console.log(`There's enough historical data! - ${timestamp}`);

    const momentDay = moment.unix(Number(timestamp)).utc();
    
    const averageArray = [];

    while(averageArray.length !== 10) { // TODO: add another condition to break out.
        const day = getFirstTradingDayOfMonth(prices, momentDay.unix());

        // debugger;
        if(day) {
            averageArray.push(day);
        }

        momentDay.add(-1, 'months');
        // debugger;
    }

    const sum = averageArray.reduce((sum, day) => {
        return sum + day.price;
    }, 0);
    const average = sum / averageArray.length;

    const first = averageArray[0].timestamp;

    // debugger;

    const tradingDayMoment = moment.unix(Number(first)).utc();

    const tenMonthMovingAverage = {
        average: average,
        closingDayPrice: averageArray[0].price,
        lastUpdated: tradingDayMoment.unix() + '',
        title: tradingDayMoment.utc().format('MMM D, YYYY'),
    };

    return tenMonthMovingAverage;
}   

function getFirstTradingDayOfMonth(prices, timestamp) {
    let pervious = null;
    let current = null;
    let next = null;
    const targetMoment = moment.unix(Number(timestamp)).utc().startOf('day');
    // const targetTimestamp = timestamp;
    const targetYear = targetMoment.utc().year();
    const targetMonth = targetMoment.utc().month();
    // debugger;
    const length = prices.length;

    for(let i = 0; i < length; i++) {
        current = prices[i];

        if(i > 0) {
            pervious = prices[i - 1];
        }

        // if(i < length - 1) {
        //     next = prices[i + 1];
        // }

        // debugger;

        if(pervious) {
            const previousTimestamp = Number(pervious.timestamp);
            const currentTimestamp = Number(current.timestamp);
            const previousMoment = moment.unix(previousTimestamp).utc();
            const currentMoment = moment.unix(currentTimestamp).utc();
            const previousMonth = previousMoment.month();
            const currentMonth = currentMoment.month();               
            // const nextTimestamp = Number(next.timestamp);

            // Month Changed.
            if(previousMonth !== currentMonth) {
                
                // Check if target month and year match.
                const currentYear = currentMoment.year();

                if(currentMonth === targetMonth && currentYear === targetYear) {
                    // debugger;
                    return current;
                }

            }
            // const previousMonthMoment = moment.unix(pervious.timestamp);
            // const currentMonthMoment = moment.unix(current.timestamp);
            
            
            // const previousMonth = previousMonthMoment.month();
            // const currentMonth = currentMonthMoment.month();
            // const currentYear = currentMonthMoment.year();
            // // const previousMonth = moment.unix(pervious.timestamp).month();
            // // const currentMonth = moment.unix(current.timestamp).month();

            // if(previousMonth < targetMonth && targetMonth === currentMonth && targetYear === currentYear) {
            //     // FOUND!

            //     // debugger;

            //     return current;
            // }
        }
    }

    debugger;
}

function getLastTradingDayOfMonth(prices, timestamp) {
    // TODO: implement
}

exports.fetchFinancialData = functions.runWith(runtimeOpts).pubsub.schedule(schedule).onRun(fetchDailyData);

exports.symbols = functions.https.onRequest(async (req, res) => {
    const method = req.method;
    const id = req.query['id'];
    switch(method) {
        case 'GET':
            const symbol = await mongoDbService.findOne({ _id: id });
            // TODO: Get data.
            console.log('GET THE DATA!');
            res.send('yay!');
            break;
    }
});

exports.tenMonthMovingAverages = functions.https.onRequest(async (req, res) => {
    const method = req.method;
    const id = req.query['id'];
    const start = req.query['start'];
    const end = req.query['end'];

    // let startDateMoment = null;
    // let endDateMoment = null;

    // // if(start && end) {
    // //     const startDate = moment.utc().unix(Number(startDate));
    // //     const endDate = moment.utc().unix(Number(endDate));
    // // } 

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');    

    switch(method) {
        case 'GET':
            // TODO: add database filtering at the right time.
            // const query = {};

            // if(start && end) {
            //     query.start = Number(start);
            //     query.end = Number(end);
            // }

            const symbol = await mongoDbService.findOne({ _id: id });
            const tenMonthMovingAverages = symbol.tenMonthMovingAverages;

            res.send(tenMonthMovingAverages);
            return;
    }
});

exports.latestTenMonthMovingAverage = functions.https.onRequest(async (req, res) => {
    // console.log('latestTenMonthMovingAverage: CALLED()');
    const id = req.query.id;
    // console.log(`id: ${id}`);

    if(!id) {
        res.send('Missing Required Parameter: id');
        return;
    }

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');    

    // return cors(req, res, async () => {
    
        const symbol = await mongoDbService.findOne({ _id: id });

        if(!symbol) {
            res.send(`${id} Does Not Exist!`);
            return;
        }
        const tenMonthMovingAverages = symbol.tenMonthMovingAverages;
        const title = tenMonthMovingAverages.title;
    
        const latestAverage = symbol.tenMonthMovingAverages.averages[symbol.tenMonthMovingAverages.averages.length - 1];

        const response = {
            id: symbol._id,
            name: symbol.name,
            title,
            latestAverage,
        };
    
        res.send(response);
    // });    
});

exports.whatIfCalculate = functions.https.onRequest(async (req, res) => {
    const method = req.method;

    switch(method) {
        case 'POST':    
            const parameters = {
                currentBalance: req.body.currentBalance,
                start: req.body.start,
                end: req.body.end,
                symbol: req.body.symbol,
                yearsWorked: req.body.yearsWorked,
                isInMarket: req.body.isInMarket,
            };

            const results = whatIfCalculateHandler(parameters);
            res.send(results);
            return;
    }
        
    res.send();
});
    
async function whatIfCalculateHandler(params) {
    let method = '';
    // let results = null;

    const parameters = { ...params };
    // Calculate (Simulated) Worst Case - TODO: Later

    // Calculate "Traditional" Case
    method = 'traditional';
    parameters.method = method;
    const traditionalResults = await whatIfCalculate(parameters);
    
    // Calculate 10 Month Moving Average Case
    method = 'tenMonthMovingAverage';
    parameters.method = method;
    const tenMonthMovingAverageResults = await whatIfCalculate(parameters);

    const results = {
        traditional: traditionalResults,
        tenMonthMovingAverage: tenMonthMovingAverageResults,
    };
    debugger; 
    return results;
}

async function whatIfCalculate(params) {
    let taxesOwed = 0;
    let feesPaid = 0;
    let dividendTotalReceived = 0;
    let previousPrice = null;
    let isInMarket = params.isInMarket;
    let marketMoney = 0;
    let cashMoney = 0;
    const tradingDaysPerYear = 252;
    let dailyExpenseRatio = 0;
    const threshold = 0; // TODO: hookup as a parameter.
    
    const startTimestamp = Number(params.start);
    const endTimestamp = Number(params.end);
    
    // debugger;
    
    // Initializing money.
    if(isInMarket) {
        marketMoney = params.currentBalance;
    }
    else {        
        cashMoney = params.currentBalance;
    }
    
    let lastBuy = null;
    
    // Lookup Symbol to get expense ratio.
    const symbols = await mongoDbService.find({ _id: params.symbol });
    
    let expenseRatio = 0;
    let tenMonthMovingAverages = [];
    let prices = [];
    let dividends = {};
    
    if(symbols.length > 0) {
        const symbol = symbols[0];
        expenseRatio = Number(symbol.expenseRatio.toString());
        dailyExpenseRatio = expenseRatio / tradingDaysPerYear;
        dividends = symbol.dividends;
        prices = symbol.prices.filter((price) => {
            if(price.timestamp >= startTimestamp && price.timestamp <= endTimestamp) {
                return true;
            }
        });

        if(params.method === 'tenMonthMovingAverage') { 
            // Fetch precalculated values.
            tenMonthMovingAverages = symbol.tenMonthMovingAverages.averages.filter((average) => {
                if(Number(average.lastUpdated) >= startTimestamp && Number(average.lastUpdated) <= endTimestamp) {
                    return true;
                }
            });
        }
    }

    if(params.method === 'traditional') {
        for(let dailyClosingPrice of prices) {
            const timestamp = dailyClosingPrice.timestamp;

            // 1. Calculate Change in Price
            if(previousPrice) {
                marketMoney = calculateDailyChangeInValue(previousPrice, dailyClosingPrice, marketMoney);
            }

            previousPrice = dailyClosingPrice.price;            
            
            // 2. If Dividend Day, Calculate Dividend
            if(dividends[timestamp]) {
                let dividendAmount = dividends[timestamp].amount;
                const shareCount = marketMoney / dailyClosingPrice.price;
                const earnedDividendAmount = shareCount * dividendAmount;

                dividendTotalReceived += earnedDividendAmount;

                marketMoney += earnedDividendAmount
            }

            // 3. Calculate Expense Ratio Fees
            const dailyFees = marketMoney * dailyExpenseRatio;

            feesPaid += dailyFees;
            marketMoney -= dailyFees;
        }
    }
    else if(params.method === 'tenMonthMovingAverage') { 
        // Fetch precalculated values.
        let nextBuySellTimestamp;
        let nextBuySellIndex = 1;

        if(isInMarket) {
            lastBuy = prices[0];
        }

        if(tenMonthMovingAverages.length > 0) {
            nextBuySellTimestamp = Number(tenMonthMovingAverages[0].lastUpdated);
        }

        for(let dailyClosingPrice of prices) {
            // debugger;
            const timestamp = dailyClosingPrice.timestamp;
            nextBuySellTimestamp = Number(tenMonthMovingAverages[nextBuySellIndex].lastUpdated);
            let isBuyOrSellDay = timestamp === nextBuySellTimestamp ? true : false;
            
            if(isInMarket) {
                // 1. Calculate Change in Price
                if(previousPrice) {
                    marketMoney = calculateDailyChangeInValue(previousPrice, dailyClosingPrice, marketMoney);
                }
                
                previousPrice = dailyClosingPrice.price;

                // 2. If Dividend Day, Calculate Dividend
                if(dividends[timestamp]) {
                    let dividendAmount = dividends[timestamp].amount;
                    const shareCount = marketMoney / dailyClosingPrice.price;
                    const earnedDividendAmount = shareCount * dividendAmount;

                    dividendTotalReceived += earnedDividendAmount;

                    marketMoney += earnedDividendAmount
                }

                // 3. Calculate Expense Ratio Fees
                const dailyFees = marketMoney * dailyExpenseRatio;

                feesPaid += dailyFees;
                marketMoney -= dailyFees;                
                
                
                if(isBuyOrSellDay) {
                    const average = tenMonthMovingAverages[nextBuySellIndex];
                    nextBuySellIndex++;

                    if(average.average > average.closingDayPrice) {
                        const withinThreshold = isWithinThreshold(average.closingDayPrice, average.average, threshold);

                        if(!withinThreshold) {
                            // SELL
                            const buyPrice = lastBuy.price;
                            const sellPrice = dailyClosingPrice.price;
                            const net = (sellPrice - buyPrice) / buyPrice;
                            // Net is used for tracking net gains / losses to calculate taxes.
                            // TODO: Calculate taxes.
                            lastBuy = null;
                            cashMoney += marketMoney
                            marketMoney = 0;
                            // debugger;
                            isInMarket = false;
                        }
                    }
                }
            }
            else {
                // Not in the Market

                // 1. Determine if I should buy.
                if(isBuyOrSellDay) {
                    const average = tenMonthMovingAverages[nextBuySellIndex];
                    nextBuySellIndex++;

                    if(average.average < average.closingDayPrice) {
                        const withinThreshold = isWithinThreshold(average.average, average.closingDayPrice, threshold);
    
                        if(!withinThreshold) {
                            // BUY
                            lastBuy = dailyClosingPrice;
                            marketMoney += cashMoney;
                            cashMoney = 0;
                            // debugger;
                            isInMarket = true;
                        }
                    }
                }                
            }
        }
    }

    const results = {
        taxesOwed,
        feesPaid,
        newBalance: marketMoney + cashMoney,
        dividendTotalReceived
    };

    return results;
};

function calculateDailyChangeInValue(previousDayPrice, currentDay, marketMoney) {
    let gainLossAmount = 0;
    let newMarketMoney = marketMoney;

    // Calculate Gains / Losses
    if(previousDayPrice > currentDay.price) {
        // loss
        const loss = 1 - (currentDay.price / previousDayPrice);
        gainLossAmount = newMarketMoney * loss;
        newMarketMoney -= gainLossAmount;
    }
    else if(currentDay.price > previousDayPrice) {
        // gain
        const gain = 1 - (previousDayPrice / currentDay.price);
        gainLossAmount = newMarketMoney * gain;
        newMarketMoney += gainLossAmount;
    }

    return newMarketMoney;
}

function isWithinThreshold(smallerValue, largerValue, threshold) {
    const percentDifference = 1 - (smallerValue / largerValue);

    if((threshold / 100) > percentDifference) {
        return true;
    }

    return false;
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

const whatIfParameters = {
    currentBalance: 200000,
    start: 1183334400, // 07/02/2007
    end: 1362182399, // 03/01/2013
    symbol: 'SPY',
    yearsWorked: 30,
    isInMarket: true,
};
// const whatIfParameters = {
//     currentBalance: 200000,
//     start: 1046649600, // 03/03/2003
//     end: 1191196800, // 10/01/2007
//     symbol: 'SPY',
//     yearsWorked: 30,
//     isInMarket: true,
// };

(async () =>  {
    const results = await whatIfCalculateHandler(whatIfParameters);

    debugger;
})();

// fetchDailyData();

// calculateTenMonthMovingAverage(0, 'SPY');
// calculateTenMonthMovingAverage(725932800, 'SPY'); // 1993 / 1 / 2
// calculateTenMonthMovingAverage(749433600, 'SPY'); // 1993 / 10 / 1
// calculateTenMonthMovingAverage(752198400, 'SPY'); // 1993 / 11 / 2
// calculateTenMonthMovingAverage(753148800, 'SPY'); // 1993 / 11 / 13 (sat)

// console.log('DEPLOYMENT SUCCESSFUL!');

// 154.30 / 70.60 = 250000 / x
// 