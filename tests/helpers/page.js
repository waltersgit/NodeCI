const puppeteer = require('puppeteer');
const sessionFactory = require('../factories/sessionFactory');
const userFactory = require('../factories/userFactory');

class CustomPage {
    static async build(){
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox']
        });

        const page = await browser.newPage();
        
        const customPage = new CustomPage(page);

        return new Proxy(customPage, {
            get: function(target, property){
                return customPage[property] || browser[property] || page[property];
            }
        })
    }

    constructor(page){
        this.page = page;
    }

    async login() {
        const user = await userFactory();
        const { session, sig } = sessionFactory(user);

        await this.page.setCookie({ name: 'session', value: session });
        await this.page.setCookie({ name: 'session.sig', value: sig });
        await this.page.goto('http://localhost:3000/blogs');
        //等待應用程序渲染，否則因為程式執行過快無法取得此dom節點(bug)
        await this.page.waitFor('a[href="/auth/logout"]');
    }

    async getContentsOf(selector) {
        return this.page.$eval(selector, el => el.innerHTML);
    }

    get(path){
        //page.evaluate將第二個參數資料，當成第一個參數(function)的參數代入
        return this.page.evaluate(
            async (_path) => {
                let jsonData = await fetch(_path, { 
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                return jsonData.json();
            },
            path
        )
    }

    post(path, data){
        return this.page.evaluate(
            async (_path, _data) => {
                let jsonData = await fetch((_path), { 
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(_data)
                })
                return jsonData.json();
            },
            path,
            data
        )
    }

    execRequests(actions){
        return Promise.all(
            actions.map(({ method, path, data }) => {
                return this[method](path, data);
            })
        )
    }
}
module.exports = CustomPage;