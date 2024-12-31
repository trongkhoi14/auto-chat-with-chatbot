const express = require('express')
const fs = require('fs/promises');
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

// reenactment()

const scrapeTour = async (browser, link) => {
    let page = await browser.newPage();
    await page.goto(link, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 60000 });
    await page.waitForSelector(".info-tour");

    tour = {}

    titles = await page.$$eval(".tour-banner-title", (els) =>
        els.map(el => el.innerText)
    );
    tour.name = titles[0]

    infoTour = await page.$$eval(".info-tour", (els) =>
        els.map(el => {
            const textStrongEls = el.querySelectorAll(".text-strong");
            return Array.from(textStrongEls).map(textEl => textEl.innerText);
        })
        
    );
    infoTour = infoTour[0]
    tour.travel_day_number = infoTour[0].split(" ")[0]
    tour.travel_night_number = infoTour[0].split(" ")[2]
    tour.description = infoTour[1]
    tour.source = infoTour[2]
    tour.destination = infoTour[3]

    tour.link_tour = link
    tour.link_file = ""


    let tourDetails = await page.$$eval(".tour-detail-content-col", (cols) =>
        cols.map(col => {
            const rows = col.querySelectorAll(".row"); // Lấy tất cả thẻ .row bên trong .tour-detail-content-col
            return Array.from(rows).map(row => {
                const strongTags = row.querySelectorAll("strong"); // Lấy tất cả thẻ strong trong từng .row
                return Array.from(strongTags).map(strong => strong.innerText); // Lấy innerText của các thẻ strong
            });
        })
    );
    tourDetails = tourDetails[0]
    tour.available_dates = tourDetails.map(item => convertDateFormat(item[0]))
    tour.natural_keys = tourDetails.map(item => item[1])

    const prices = tourDetails.map(item => {
        if (item[2]) {
            return parseInt(item[2].replace(/\./g, ''), 10);
        }
        return Infinity; 
    });
    
    tour.price_per_pax =  prices[0].toString()
    tour.price_per_pax_currency = "VND"

    let commonInfo = await page.$$eval('#tour-term div.commonInfo > *', (elements) =>
        elements
            .filter(el => el.tagName.toLowerCase() !== 'table') 
            .map(el => el.innerText.trim())
    );
    commonInfo = commonInfo.filter(i => i.length > 0)
    
    tour.description = tour.description + ". " + commonInfo.filter(info => info.toLowerCase().includes("giá tour"));
    

    let landmarks = await page.$$eval('#tour-program div.commonInfo strong', (elements) =>
        elements
            .filter(el => !el.innerText.includes("NGÀY") && el.innerText.length > 6)
            .map(el => el.innerText.trim())
    );
    tour.landmarks = landmarks

    let highlights = await page.$$eval('.content-description', (elements) =>
        elements
            .map(el => el.innerText.trim())
    );
    tour.highlights = highlights[0]

    tour.type = "tour"
    return tour
}

const scraping = async () => {
    let browser = await startBrowser();
    console.log(">> Browser is opening ...")
    try {
        link = "https://saigontourist.net/vi/tour/tet-nguyen-dan-2025-trong-nuoc"
        let page = await browser.newPage();
        await page.goto(link, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 60000 });
        
        await page.waitForSelector('div[id="region"]');
        await page.click('div[id="region"]');

        let linkTours = await page.$$eval(".title-tour a", (els) =>
            els.map(el => el.href)
        );
        if(linkTours.length > 6){
            linkTours = linkTours.slice(5,10)
        }
        console.log(linkTours);

        listTourData = []
        for(let i=0; i< linkTours.length; i++) {
            setTimeout(()=>{

            }, 2000)
            try {
                const tour = await scrapeTour(browser, linkTours[i])
                listTourData.push(tour)
            } catch (error) {
                console.log(error)
            }
            
        }
        console.log(listTourData.length)
        const filePath = './data.json';
        fs.writeFile(filePath, JSON.stringify(listTourData, null, 2));
        console.log(`Data saved to ${filePath}`);

    } catch (error) {
        console.log(error);

    } finally {
        // await browser.close();
        console.log(">> Browser is closed")
    }
}

function convertDateFormat(dateString) {
    if (!dateString) {
        return
    }
    const [day, month, year] = dateString.split('/'); 
    return `${day}-${parseInt(month)}-${year}`;
}

scraping()