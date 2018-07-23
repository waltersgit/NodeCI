jest.setTimeout(30000);
require('../models/User');

const mongoose = require('mongoose');
const keys = require('../config/keys');

mongoose.Promise = global.Promise;
//useMongoClient 避免棄用警告顯示
mongoose.connect(keys.mongoURI, { useMongoClient: true });
