

const dailyFetchData = async function() {
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
                lastUpdated: nowDay,
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

    for(let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const time = moment.unix(timestamp).utc().startOf('day').unix();
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
            prices.push(price);
        }
    }

    const nowUnix = moment().utc().startOf('day').unix();

    const transformedData = {
        prices: prices,
        dividends: newDividends,
        lastUpdated: nowUnix,
    };

    return transformedData;
};

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
        lastUpdated: tradingDayMoment.unix(),
        title: tradingDayMoment.utc().format('MMM D, YYYY'),
    };

    return tenMonthMovingAverage;
};

function getFirstTradingDayOfMonth(prices, timestamp) {
    let pervious = null;
    let current = null;
    const targetMoment = moment.unix(Number(timestamp)).utc().startOf('day');
    const targetYear = targetMoment.utc().year();
    const targetMonth = targetMoment.utc().month();
    const length = prices.length;

    for(let i = 0; i < length; i++) {
        current = prices[i];

        if(i > 0) {
            pervious = prices[i - 1];
        }

        if(pervious) {
            const previousTimestamp = Number(pervious.timestamp);
            const currentTimestamp = Number(current.timestamp);
            const previousMoment = moment.unix(previousTimestamp).utc();
            const currentMoment = moment.unix(currentTimestamp).utc();
            const previousMonth = previousMoment.month();
            const currentMonth = currentMoment.month();

            // Month Changed.
            if(previousMonth !== currentMonth) {
                
                // Check if target month and year match.
                const currentYear = currentMoment.year();

                if(currentMonth === targetMonth && currentYear === targetYear) {
                    // debugger;
                    return current;
                }
            }
        }
    }
};

function getLastTradingDayOfMonth(prices, timestamp) {
    // TODO: implement
};

export default dailyFetchData;