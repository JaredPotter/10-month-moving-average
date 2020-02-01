const admin = require('firebase-admin');
const functions = require('firebase-functions');
const axios = require('axios');
const moment = require('moment');
const cors = require('cors')({ origin: true });

const mongoDbService = require('./mongoDbService')

const serviceAccount = require('./month-mov-avg-notifier-firebase-adminsdk-qwmh7-c5e2115c16.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://month-mov-avg-notifier.firebaseio.com'
});

const firestore = admin.firestore();

const runtimeOpts = {
    timeoutSeconds: 60,
    memory: '1GB'
};

// Cron Job Schedule - How Often to trigger the function.
const schedule = '0 17 * * *'; // Everyday at 9am server time.


const fetchDailyData = async function() {
    console.log('Running Daily Fetch Data');
    // debugger;

    const symbols = await mongoDbService.find();

    for(let symbol of symbols) {
        const id = symbol._id;
        const lastUpdated = symbol.lastUpdated;
        const currentData = symbol;

        const data = await fetchData(id, lastUpdated, currentData);
    }

    console.log(symbols)
    debugger;
};

async function fetchData(symbol, lastUpdated, currentData) {
    const now = moment();
    const nowUnix = now.unix();
    debugger;

    // const nowUnix = 946684800;

    // Example URL: https://query1.finance.yahoo.com/v8/finance/chart/SPY?symbol=SPY&period1=1552867200&period2=1579478400&interval=1d&events=div
    // Example URL: https://query1.finance.yahoo.com/v8/finance/chart/SPY?symbol=SPY&period1=1196110800&period2=1358888400&interval=1d&events=div // Nov 26 2007 - Jan 22 2013
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?symbol=${symbol}&period1=${lastUpdated}&period2=${nowUnix}&interval=1d&events=div`;
    const response = await axios.get(url);
    const data = response.data;

    const transformedData = transformData(data);

    const newData = { ...currentData };
    debugger;
    newData.prices = newData.prices.concat(transformedData.prices);
    newData.dividends = { ...currentData.dividends, ...transformedData.dividends };
    newData.lastUpdated = transformedData.lastUpdated;

    debugger;

    const query = {
        _id: symbol
    };
    const result = await mongoDbService.update(query, newData);

    debugger;

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


function transformData(data) {
    // TRANSFORM DATA
    const result = data.chart.result[0];
    // const meta = result.meta;
    const timestamps = result.timestamp;
    const dividends = result.events ? result.events.dividends : {};
    const closePrices = result.indicators.quote[0].close;

    const newDividends = {};

    for(let key of Object.keys(dividends)) {

        const d = dividends[key];

        const time = moment.unix(d.date).utc().startOf('day').unix() + '';

        newDividends[time] = {amount: dividends[key].amount }
    }

    const prices = timestamps.reduce((arr, timestamp, index) => {
        const closePrice = closePrices[index];
        const time = moment.unix(timestamp).utc().startOf('day').unix() + '';

        const price = {
            timestamp: time,
            price: closePrice
        };

        arr.push(price);

        return arr;
    }, []);

    const nowUnix = moment().unix();

    const transformedData = {
        prices: prices,
        dividends: newDividends,
        lastUpdated: nowUnix + '',
    };

    debugger;

    return transformedData;
}

exports.fetchFinancialData = functions.runWith(runtimeOpts).pubsub.schedule(schedule).onRun(fetchDailyData);


// fetchDailyData();