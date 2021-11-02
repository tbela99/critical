# CRITICAL PATH GENERATOR

Critical path generator tools. Provides a web browser script, a node script and a command line tool.

## Web browser script

Extract critical CSS path for the current viewport in the current page.
```javascript

<script src="./dist/browser.js"></script>
<script>
    
critical.extract({
   
    fonts: true
}).then(results => {
    
    // print extracted CSS
    console.log(results.styles.join('\n'));
});
</script>
```

### Options

- options: _object_
  - fonts: _bool_ generate Javascript to load web fonts dynamically

### Limitations

The web browser script is subject to same origin policy and CSP. 
This can prevent the script from reading external stylesheets.

## Node script

Generate critical CSS path from your nodejs script using puppeteer

```javascript

const config = require('./dist/critical');
const {basename} = require("path");

const urls = [
    'http://github.com'
];

urls.forEach(url => {

    config.critical(url, {
        console: true,
        // product: 'firefox',
        // headless: false,
        // screenshot: true,
        secure: false,
        filename: 'output/' + basename(url).
                        replace(/[?#].*$/, '').replace(/[^a-zA-Z0-9@_/-]+/g, '_') + '_critical.css',
        // dimensions can be specified as an array of string or object
        // dimensions: ['1400x900', '1200x675', '992x558'],       
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

      // print extracted CSS
      console.log(results.styles.join('\n'));
    });
})

```

### Node script options

- options: _object_
  - headless: _bool_. start puppeteer in headless mode. default _true_
  - fonts: _bool_. generate javascript to load web fonts. default _true_
  - screenshot: _bool_. generate screenshot for each viewport mentioned. default _false_
  - console: _bool_. log console messages from the pages. default _true_
  - secure: _bool_. enforce browser security features such as CSP and same origin policy. default _false_
  - filename: _string_. prefix of the files generated
  - width: _int_. viewport width. default _800_
  - height: _int_. viewport height. default _600_
  - dimensions: _array_ or _string_. array of viewports. this takes precedence over height and width. viewports can be specified as objects with width and height property or a string.
  - container: _bool_. turn off additional features required to run inside a container
  - html: _bool_. create an HTML page for each dimension. each page contains an inlined critical css for the corresponding viewport
  - output: _string_. change output directory. default _'./output/'_

## Command line script

Usage

```shell

$ node ./bin/critical-cli.js url [url2 url3 ...] [options]

Options:
  -t, --headless    enable or disable headless mode                    [boolean]
  -i, --screenshot  Generate screenshots                               [boolean]
  -s, --secure      enable or disable security settings such as CSP and same
                    origin policy                                      [boolean]
  -o, --output      Output directory                                    [string]
  -n, --filename    prefix of the generated files                       [string]
  -w, --width       Viewport width                                      [number]
  -a, --height      Viewport height                                     [number]
  -d, --dimensions  Array of viewports, override height/width settings   [array]
  -f, --fonts       Generate javascript to load fonts dynamically      [boolean]
  -c, --container   Disable additional settings to run inside a container
                                                                       [boolean]
  -h, --help        Show help                                          [boolean]

```

### Example

```shell

$ node ./bin/critical-cli.js https://github.com/ https://nodejs.org --secure=no -i -d '1440x900' -d '1366x768'
```