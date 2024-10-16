const express = require('express')
const fs = require('fs');
const readline = require('readline');
const startBrowser = require('./browser');
const app = express()
const port = 8001

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

const readLines = async (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    let lines = [];
    for await (const line of rl) {
        lines.push(line);
    }
    return lines;
};

const sendMessage = async (page, message) => {
    await page.waitForSelector('.mantine-Textarea-input');
    await page.type('.mantine-Textarea-input', message, {delay: 25});
    
    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');
   
    // Chờ phản hồi từ API
    const response = await page.waitForResponse(response => 
        response.url().includes('http://localhost:8000/api/chat_message/create') && response.status() === 202,
        { timeout: 100000 }
    );

};


const reenactment = async () => {
    let browser = await startBrowser();
    console.log(">> Browser is opening ...")
    try {
        link = "http://localhost:3000/chats/new"
        let page = await browser.newPage();
        await page.goto(link, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 60000 });
        
        const messages = await readLines('chat.txt');

        for (const message of messages) {
            console.log(`Sending message: ${message}`);
            await sendMessage(page, message); 
            await page.waitForNetworkIdle({ timeout: 30000 });
        }

    } catch (error) {
        console.log(error);

    } finally {
        // await browser.close();
        console.log(">> Browser is closed")
    }
}

reenactment()