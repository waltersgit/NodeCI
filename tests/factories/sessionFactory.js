const Buffer = require('safe-buffer').Buffer;
const Keygrip = require('keygrip');
const keys = require('../../config/keys');
const keygrip = new Keygrip([keys.cookieKey]);

module.exports = (user) => {
    const sessionObject = {
        passport: {
            //mongoose user._id 是一個object，若調用字符串時
            //會打印出字符串
            user: user._id.toString()
        }
    };
    const session = Buffer.from(
        JSON.stringify(sessionObject)
    ).toString('base64')
    const sig = keygrip.sign('session=' + session);

    return { session, sig };
}