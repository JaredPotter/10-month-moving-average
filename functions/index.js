const admin = require('firebase-admin');
const functions = require('firebase-functions');
const axios = require('axios');
const moment = require('moment');
// const json = require('./data5'); // for testing
const cors = require('cors')({ origin: true });
const cheerio = require('cheerio');

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

async function fetchData(symbol) {
    const now = moment();
    const nowUnix = now.format('X');
    const tenMonthsAgo = moment(now).add(-9, 'months');
    tenMonthsAgo.date(now.date());

    const tenMonthsAgoUnix = tenMonthsAgo.format('X');

    debugger;
    // Example URL: https://query1.finance.yahoo.com/v8/finance/chart/SPY?symbol=SPY&period1=1552867200&period2=1579478400&interval=1d
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?symbol=${symbol}&period1=${tenMonthsAgoUnix}&period2=${nowUnix}&interval=1d`;
    const response = await axios.get(url);

    if (response.status === 200) {
        const averageResponse = calculateTenMonthMovingAverageResponse(
            symbol,
            response.data
        );

        const action =
            averageResponse.average > averageResponse.lastPrice
                ? 'GET OUT (SELL)'
                : 'STAY IN (AND BUY)';
        const margin =
            averageResponse.average > averageResponse.lastPrice
                ? 1 - averageResponse.lastPrice / averageResponse.average
                : 1 - averageResponse.average / averageResponse.lastPrice;
        const percentFormatted = `${(margin * 100).toFixed(2)}%`;
        debugger;

        console.log(
            'Symbol: ' +
                symbol +
                ' => AVG ' +
                averageResponse.average +
                ' ::: CURRENT: ' +
                averageResponse.lastPrice +
                ` ::: [ACTION = ${action}] ::: MARGIN: ${percentFormatted}`
        );

        const result = {
            average: averageResponse.average,
            currentPrice: averageResponse.lastPrice,
            margin: margin,
            datetime: moment().toString(),
            prices: averageResponse.prices
        };

        return result;
    } else {
        console.log(response);

        return null;
    }
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

function calculateTenMonthMovingAverageResponse(symbol, data) {
    const timestamps = data.chart.result[0].timestamp;
    const closing = data.chart.result[0].indicators.quote[0].close;

    const startDateTime = moment.unix(timestamps[0]);
    const startPrice = closing[0];
    const lastPrice = closing[closing.length - 1];

    const prices = [
        {
            price: startPrice,
            datetime: startDateTime.toString()
        }
    ];

    let targetDate = moment(startDateTime).add(1, 'months');

    for (let i = 0; i < timestamps.length; i++) {
        const currentUnixEpoch = timestamps[i];
        const currentDateTime = moment.unix(currentUnixEpoch);

        if (currentDateTime.isAfter(targetDate)) {
            const currentClosingPrice = closing[i];
            const payload = {
                price: currentClosingPrice,
                datetime: currentDateTime.toString()
            };
            prices.push(payload);

            targetDate.add(1, 'months');
        }
    }

    console.log('symbol: ' + symbol);

    // The most recent price.
    if (!symbol.includes('-')) {
        prices.push({
            price: lastPrice,
            datetime: moment.unix(timestamps[timestamps.length - 1]).toString()
        });
    }

    const sum = prices.reduce((total, item) => {
        return total + item.price;
    }, 0);
    const average = sum / prices.length;

    return {
        average,
        lastPrice,
        prices
    };
}

// DEV
// fetchData('SPY');
// fetchData('VOO');
// fetchData('VFINX');
// fetchData('VTI');
// fetchData('BTC-USD');
// fetchData('ETH-USD');
// fetchData('XRP-USD');
// fetchData('JD');
// fetchData('MDB');
// fetchData('ARKK');
// fetchData('XLY');
// fetchData('SHOP');
// fetchData('ALGN');
// getSymbolName('MDB');
// getSymbolName('VOO');
// getSymbolName('BTC-USD');

async function updateAllUsers() {
    const usersSnapshot = await firestore.collection('users').get();
    for (doc of usersSnapshot.docs) {
        const data = doc.data();

        console.log(`Updating Symbols for ${data.username}`);

        const symbols = data.symbols;

        console.log(`Object.keys(symbols): ${Object.keys(symbols)}`);

        for (let key of Object.keys(symbols)) {
            console.log(`Updating Symbol - ${sym}`);
            const response = await fetchData(sym);

            const payload = {
                symbols: {
                    [sym]: response
                }
            };

            const setResponse = await firestore
                .collection('users')
                .doc(doc.id)
                .set(payload, { merge: true });

            if (!setResponse._writeTime) {
                console.log(`Failed To Update ${sym} for ${data.username}`);
                return false;
            } else {
                console.log(`Successfully Updated ${sym} for ${data.username}`);
                return true;
            }
        }
    }
}

async function updateUserSymbols(username) {
    const usersSnapshot = await firestore
        .collection('users')
        .where('username', '==', username)
        .get();

    for (doc of usersSnapshot.docs) {
        const data = doc.data();

        console.log(`Updating Symbols for ${data.username}`);

        const symbols = data.symbols;

        console.log(`Object.keys(symbols): ${Object.keys(symbols)}`);

        for (let key of Object.keys(symbols)) {
            console.log(`Updating Symbol - ${sym}`);
            const response = await fetchData(sym);

            const payload = {
                symbols: {
                    [sym]: response
                }
            };

            const result = await firestore
                .collection('users')
                .doc(doc.id)
                .set(payload, { merge: true });
            if (!result.writeTime) {
                return false;
            }

            return true;
        }
    }
}

exports.calculateForUser = functions.https.onRequest(
    async (request, response) => {
        cors(request, response, async () => {
            const username = request.body.username;

            if (username) {
                await updateUserSymbols(username);

                response.send('complete');
            } else {
                response.send('username field is missing from body');
            }
        });
    }
);

exports.calculateAllUserAverage = functions.https.onRequest(
    async (request, response) => {
        console.log('calculateAllUserAverage() CALLED');

        await updateAllUsers();

        response.send('calculateAllUserAverage() DONE');
        console.log('calculateAllUserAverage() RETURN');
    }
);

exports.tenMonthMovingAverage = functions
    .runWith(runtimeOpts)
    .pubsub.schedule('0 17 * * *')
    .onRun(async context => {
        await updateAllUsers();
    });

// NORMAL DATA ENDPOINTS
exports.userData = functions.https.onRequest(async (request, response) => {
    cors(request, response, async () => {
        const username = request.body.username;

        if (!username) {
            response.send('username is missing');
        }

        const usersSnapshot = await firestore
            .collection('users')
            .where('username', '==', username)
            .get();

        usersSnapshot.forEach(doc => {
            const data = doc.data();

            response.send(data);

            return;
        });
    });
});

exports.addSymbol = functions.https.onRequest(async (request, response) => {
    cors(request, response, async () => {
        const username = request.body.username;
        const symbol = request.body.symbol;

        if (!username || !symbol) {
            response.send('Missing username or symbol!');
            return;
        }

        const usersSnapshot = await firestore
            .collection('users')
            .where('username', '==', username)
            .get();

        for (doc of usersSnapshot.docs) {
            const data = doc.data();
            const docRef = firestore.collection('users').doc(doc.id);

            if (data.username === username) {
                const newSymbols = { ...data.symbols };
                newSymbols[symbol] = null;

                const setResponse = await docRef.set(
                    {
                        symbols: newSymbols
                    },
                    { merge: true }
                );

                if (!setResponse._writeTime) {
                    console.log(setResponse);
                    response.send('symbol failed to add');
                }

                await updateUserSymbols(username);

                response.send('symbol added');
            } else {
                response.send('username is missing');
            }
        }
    });
});
