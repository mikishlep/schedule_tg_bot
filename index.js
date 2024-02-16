const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const axios = require('axios');
const sqlite = require('sqlite3').verbose();
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const bot = new Telegraf('6560704523:AAE9a6vWJ4C-11OMI_QYcLH_NZqk_XSId9c');
let db = new sqlite.Database('./users.db');
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, lastName TEXT, username TEXT)');
});

bot.start((ctx) => ctx.reply('Привет чепушня, введи /меню для запуска меню со списком команд <3'))

bot.hears('/пляж', async (ctx) => {
    await ctx.replyWithPhoto({url: 'https://i.ibb.co/sjLh7gg/image.png'});
});

bot.hears('/еблоутиное', async (ctx) => {
    await ctx.replyWithPhoto({url: 'https://i.ibb.co/19xDPJ7/image.png'});
});

bot.hears('/осадки', async (ctx) => {
    ctx.reply('Ожидается небольшая облачность:')
    await ctx.replyWithPhoto({url: 'https://i.ibb.co/qpzdPBG/image.png'});
});

bot.hears('/list', async (ctx) => {
    await ctx.replyWithHTML('<b>Вот команды бота:</b> \n\n<b>1.</b> /пляж; \n<b>2.</b> /погода; \n<b>3.</b> /еблоутиное; \n<b>4.</b> /расписание;\n<b>5.</b> /осадки.');
});

bot.hears('/погода', async (ctx) => {
    await ctx.reply('Отправьте свою геопозицию при помощи скрепки: ')
});

bot.hears('/help', async (ctx) => {
    await ctx.replyWithHTML('<b>Пропиши /list!</b>');
});

const takeScreenshot = async (url, outputFileName) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ path: outputFileName });

    await browser.close();
}

// ----------MENU-----------
bot.hears('/меню', async (ctx) => {
    const menu = {
        reply_markup: {
            keyboard: [
                [{ text: '/расписание' }, { text: '/осадки' }],
                [{ text: '/еблоутиное' }, { text: '/погода' }],
                [{ text: '/пляж' }]
            ],
            resize_keyboard: true
        }
    };
    await ctx.reply('Выберите команду:', menu);
});
// ---------MENU---------

bot.hears('/расписание', async (ctx) => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // открытие сайта
        await page.goto('http://ntgmk.ru/program/r_student.php');

        // ожидание
        console.log('Ожидание ебливое...');
        console.log('Загружено.');

        await page.select('#spisok_gr', '47');
        console.log('Группа выбрана...');
        await new Promise(resolve => setTimeout(resolve, 1000));
// -----------------------ДАТЫ----------------------------------
        const currentDate = new Date();
        const futureDate = new Date(currentDate);
        futureDate.setDate(currentDate.getDate() + 7);

        const formatDate = (date) => {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
          };

        const dt2Value = await page.$eval('#dt2', input => input.value);

        console.log('dt2Value:', dt2Value);

        const [dt2Day, dt2Month, dt2Year] = dt2Value.split('.').map(Number);

        const dt2Date = new Date(dt2Year, dt2Month - 1, dt2Day);

        console.log('dt2Date:', dt2Date);

        dt2Date.setDate(dt2Date.getDate() + 7);

        const newDt2Value = formatDate(dt2Date);

        await page.$eval('#dt2', (input, value) => input.value = value, newDt2Value);

        console.log('newDt2Value:', newDt2Value);

        console.log('Даты выбраны...');
// -----------------------ДАТЫ-----------------------------------
        await page.click('#button2');
        console.log('Просмотр нажат.');
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const screenshotBuffer = await page.screenshot();
            const croppedBuffer = await sharp(screenshotBuffer)
            .extract({ left: 0, top: 0, width: 600, height: 600 }) // Замените значениями ширину и высоту, которые вам нужны
            .toBuffer();
            
            await ctx.replyWithPhoto({ source: croppedBuffer });
        } catch (error) {
            console.error('Ошибка при создании скриншота:', error);
            ctx.reply('Произошла ошибка при создании скриншота. Убедитесь, что URL корректен и попробуйте снова.');
        }

        // Закрываем браузер
        await browser.close();
    } catch (error) {
        console.error('Error:', error);
        await ctx.reply('Не удалось загрузить расписание.');
    }
});

bot.on('message', async (ctx)=>{
    if (ctx.message.location){
        console.log(ctx.message.location);
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${ctx.message.location.latitude}&lon=${ctx.message.location.longitude}&appid=31de6c1e9982ea547186a5d0c260ed8b`;
        const response = await axios.get(url);
        const temperatureCelsius = response.data.main.temp - 273.15; // Конвертация из Кельвинов в градусы Цельсия
        ctx.reply(`${response.data.name}: ${temperatureCelsius.toFixed(1)}°C`);
    }
    const user = ctx.from;
    db.run(`INSERT INTO users (firstName, lastName, username) VALUES (?, ?, ?)`, [user.first_name, user.last_name, user.username],
    function(err) {
        if (err) {
            return
    console.log(err.message);
        }
        console.log(`Пользователь ${user.first_name} (${user.username}) успешно добавлен.`);
    });
    /*await
ctx.telegram.sendMessage('686963601', `Пользователь ${user.first_name} (${user.username}) отправил сообщение: "${ctx.message.text}"`);*/
});
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))