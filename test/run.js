Promise.all(['../dist/index.js', 'path'].map(e => import(e))).then(modules => {

    const config = modules[0];
    const {basename, resolve, dirname} = modules[1];

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

    Promise.all(urls.map(url => config.critical(url, {
            // product: 'firefox',
            html: true,
            console: true,
            secure: false,
            container: true,
            headless: true,
            screenshot: true,
            randomUserAgent: true,
            filename: 'output/' + basename(url).replace(/[?#].*$/, '').replace(/[^a-zA-Z0-9@_/-]+/g, '_') + '_critical.css',
            dimensions: '1920x1080 1440x900 1366x768 1024x768 768x1024 320x480'.split(/[,\s]/g)
            /*[
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
            },
            {
                width: 320,
                height: 480
            }
        ]
        */
        }).then((results) => {

            // console.log(JSON.stringify([results.stats], null, 1));
            console.log(JSON.stringify({results}, null, 1))
            console.info('success!')
            return results
        })
    ))
    // .then(results => {

    // console.log('done')
    // console.log(JSON.stringify({results}, null, 1))
// });


});