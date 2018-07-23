const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);//將client.get的結果由callback轉promise

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');

    return this;
}

mongoose.Query.prototype.exec = async function () {

    if(!this.useCache){
        //照舊執行exec
        return exec.apply(this, arguments);
    }
    
    //取得query的內容{_id:123123123}
    //console.log(this.getQuery());
    //取得查詢集合的名稱 users OR blogs
    //console.log(this.mongooseCollection.name);
    //取得唯一的key值，由query內容 + 查詢的集合名稱所組成，
    //因為不想影響原先的內容，所以先object值復製後，再組成key
    // const key = JSON.stringify(
    //     Object.assign({}, this.getQuery(), {
    //         collection: this.mongooseCollection.name
    //     })                   
    // )
    const key = JSON.stringify({
        ...this.getQuery(), 
        collection: this.mongooseCollection.name
    });

    const cacheValue = await client.hget(this.hashKey, key);

    if(cacheValue){
        //若直接回傳JSON.parse(cacheValue)只是單純的json，並不包含
        //mongoose model 實例的所有功能，所以用下列解法：
        //類似於new Blog({ title: 'hi', content: 'There'})
        // const doc = new this.model(JSON.parse(cacheValue));
        // return doc;
        console.log('from cache')
        const doc = JSON.parse(cacheValue);
        return Array.isArray(doc) 
            ? doc.map(d => new this.model(d))
            : new this.model(doc);
    }

    const result = await exec.apply(this, arguments);

    client.hset(this.hashKey, key, JSON.stringify(result));
    client.expire(this.hashKey, 10);
    // return exec.apply(this, arguments);
    console.log('from mongodb')
    return result;
}

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    }
}