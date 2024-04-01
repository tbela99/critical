
import {critical} from '../dist/index.js';
import {basename} from "path";

    const urls = [
        'https://www.npmjs.com/package/@tbela99/css-parser',
        // 'https://www.linkedin.com',
        'https://css-tricks.com/lodge/svg/09-svg-data-uris/',
        'https://facebook.com',
        'https://getbootstrap.com/',
        'https://getbootstrap.com/docs/5.3/getting-started/introduction/',
        'https://getbootstrap.com/docs/5.3/examples/',
        'https://www.microsoft.com/fr-ca/microsoft-365'
    ];

    urls.map(url => critical(url, {
        // product: 'firefox',
        html: true,
        console: false,
        verbose: false,
        secure: false,
        headless: true,
        screenshot: true,
        filename: 'output/' + basename(url).
        replace(/[?#].*$/, '').replace(/[^a-zA-Z0-9@_/-]+/g, '_') + '_critical.css',
        dimensions: '1920x1080 1440x900 1366x768 1024x768 768x1024 320x480'
    }).then((results) => {

        console.info('success!')
        return results
    }));
