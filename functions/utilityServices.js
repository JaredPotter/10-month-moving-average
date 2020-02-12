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

export default { getSymbolName }