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
            const query = {};

            if(start && end) {
                query.start = Number(start);
                query.end = Number(end);
            }

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

// fetchDailyData();

// calculateTenMonthMovingAverage(0, 'SPY');
// calculateTenMonthMovingAverage(725932800, 'SPY'); // 1993 / 1 / 2
// calculateTenMonthMovingAverage(749433600, 'SPY'); // 1993 / 10 / 1
// calculateTenMonthMovingAverage(752198400, 'SPY'); // 1993 / 11 / 2
// calculateTenMonthMovingAverage(753148800, 'SPY'); // 1993 / 11 / 13 (sat)

// console.log('DEPLOYMENT SUCCESSFUL!');