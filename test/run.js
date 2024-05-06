
import {critical} from '../dist/index.js';
import {basename} from "node:path";

    const urls = [
        // 'https://www.npmjs.com/package/@tbela99/css-parser',
        // 'https://www.linkedin.com',
        // 'https://css-tricks.com/lodge/svg/09-svg-data-uris/',
        // 'https://facebook.com',
        // 'https://getbootstrap.com/',
        // 'https://getbootstrap.com/docs/5.3/getting-started/introduction/',
        // 'https://getbootstrap.com/docs/5.3/examples/',
        // 'https://www.microsoft.com/fr-ca/microsoft-365',
       // dirname( new URL(import.meta.url).pathname) + '/playground.html',
        'http://localhost:3004/playground.html'
    ];

    urls.map(url => critical(url, {
        html: true,
        console: true,
        verbose: true,
        secure: false,
        fonts: true,
        headless: true,
        screenshot: true,
        container: true,
        filename: 'output/' + basename(url).
        replace(/[?#].*$/, '').replace(/[^a-zA-Z0-9@_/-]+/g, '_') + '_critical.css',
        dimensions: '1920x1080 1440x900 1366x768 1024x768 768x1024 320x480'
    }).then((results) => {

        console.info('success!')
        return results
    }));
