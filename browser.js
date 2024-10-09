const puppeteer = require('puppeteer');

const startBrowser = async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            //Không hiển thị GUI lên
            headless: false,
            defaultViewport: false,
            args: [
                "--disable-setuid-sandbox",
                "--no-sandbox",
                "--no-zygote",
              ],
            'ignoreHTTPSErrors': true,
        })
        
    } catch (error) {
        console.log("Không tạo được browser: "+ browser);
    };
    
    return browser;

}

module.exports = startBrowser;