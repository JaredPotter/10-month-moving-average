const MongoClient = require('mongodb').MongoClient;
const ObjectId = require("mongodb").ObjectId;
require('dotenv').config('./');

const connectionString = process.env.MONGO_DB_CONNECTION_STRING;
const databaseName = process.env.DATABASE_NAME;
const collectionName = process.env.COLLECTION_NAME;
const settings = {
    useUnifiedTopology: true
};

const mongoDbService = {
    _mongoDbClient: null,
    async connect() {
        return new Promise((resolve, reject) => {
            MongoClient.connect(connectionString, settings, function(err, client) {
                if(err) {
                    reject(err);
                }
                else {
                    console.log('SUCCESSFULLY CONNECTED TO DATABASE!');

                    const database = client.db(databaseName);

                    resolve(database);
                }
            });
        })
    },
    async insert() {
        while(!this._mongoDbClient) {
            console.log('Attempting to connect...');
            this._mongoDbClient = await this.connect();
        }

        debugger;
    },
    async find(query = {}) {
        while(!this._mongoDbClient) {
            console.log('Attempting to connect...');
            this._mongoDbClient = await this.connect();
        }

        return new Promise((resolve, reject) => {
            const collection = this._mongoDbClient.collection(collectionName);
    
            collection.find(query).toArray(function(err, res) {
                if(err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });
    },
    async findOne(query = {}) {
        while(!this._mongoDbClient) {
            console.log('Attempting to connect...');
            this._mongoDbClient = await this.connect();
        }

        return new Promise((resolve, reject) => {
            const collection = this._mongoDbClient.collection(collectionName);
    
            collection.findOne(query, function(err, res) {
                if(err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });
    },
    async update(query, updatedDocument) {
        const lastUpdated = updatedDocument.lastUpdated;
        const prices = updatedDocument.prices;
        const dividends = updatedDocument.dividends;
        
        const updatedDoc = { $set: { lastUpdated, prices, dividends } };        

        while(!this._mongoDbClient) {
            console.log('Attempting to connect...');
            this._mongoDbClient = await this.connect();
        }

        return new Promise((resolve, reject) => {
            const collection = this._mongoDbClient.collection(collectionName);
    
            collection.updateOne(query, updatedDoc, function(err, res) {
                if(err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });        
    },
};

module.exports =  mongoDbService;