
const config = require('../dist/critical');
const {basename, resolve, dirname} = require("path");

const urls = [
    // resolve(dirname(__filename) + '/media/index.html'),
    // 'https://github.com',
    'https://ideabytes.com/',
    // 'https://thehackernews.com/',
    // 'https://www.linkedin.com',
    // 'http://127.0.0.1:2080',
    // 'https://css-tricks.com/lodge/svg/09-svg-data-uris/'
];

urls.forEach(url => {

    config.critical(url, {
        console: false,
        // product: 'firefox',
        // headless: false,
        screenshot: true,
        console: true,
        secure: false,
        html: true,
        filename: 'output/' + basename(url).
                        replace(/[?#].*$/, '').replace(/[^a-zA-Z0-9@_/-]+/g, '_') + '_critical.css',
        dimensions: [
            {
                width: 1400,
                height: 900
            },
            {
                width: 1200,
                height: 675
            },
            {
                width: 992,
                height: 558
            },
            {
                width: 768,
                height: 480
            },
            {
                width: 576,
                height: 320
            }
        ]
    }).then((results) => {

        console.log(JSON.stringify([results.stats], null, 1));
        console.info('success!')
    });
})
