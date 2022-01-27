# CRITICAL PATH GENERATOR

![screenshot](https://raw.githubusercontent.com/tbela99/critical/master/screenshot.png)

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
  - fonts: _bool?_ generate Javascript to load web fonts dynamically
  - html: _bool?_ generate an HTML page containing inlined critical css
  - signal: _AbortSignal?_ abort critical extraction using AbortSignal

### Limitations

The web browser script is subject to same origin policy and CSP. 
This can prevent the script from reading external stylesheets.

## Node script

Generate critical CSS path from your nodejs script using puppeteer

```javascript

const {critical} =  require("@tbela99/critical");
const urls = [
  'http://github.com',
  'https://docs.npmjs.com/cli/v8/configuring-npm/package-json#directories'
];

urls.forEach(url => {

  critical(url, {
    html: false,
    console: true,
    screenshot: true,
    secure: false,
    // dimensions can be specified as an array of string or object
    dimensions: ['1400x900', '1200x675', '992x558']
  }).then((results) => {

    // print extracted CSS
    console.log(results.styles.join('\n'));
  });
})

```

### Node script options

- options: _object_
  - headless: _bool_. start puppeteer in headless mode. default _true_
  - browser: _string_. browser to use [choices: "chromium", "firefox", "webkit", "edge", "chrome"]
    default _"chromium"_
  - fonts: _bool_. generate javascript to load web fonts. default _true_
  - screenshot: _bool_. generate screenshot for each viewport mentioned. default _false_
  - console: _bool_. log console messages from the pages. default _true_
  - secure: _bool_. enforce browser security features such as CSP and same origin policy. default _false_
  - filename: _string_. prefix of the files generated
  - width: _int_. viewport width. default _800_
  - height: _int_. viewport height. default _600_
  - dimensions: _array_ or _string_. array of viewports. this takes precedence over height and width. viewports can be specified as objects with width and height property or a string.
  - container: _bool_. turn off additional features required to run inside a container
  - html: _bool_. generate an HTML page containing inlined critical css
  - output: _string_. change output directory. default _'./output/'_

## Command line script

when installed globally, it is available as _critical-cli_

```bash
$ sudo node install -g @tbela99/critical
$ critical-cli -i http://google.com
```

Usage

```shell
$ critical-cli url [url2 url3 ...] [options]

Options:
  -t, --headless    enable or disable headless mode    [boolean] [default: true]
  -b, --browser     browser to use
           [string] [choices: "chromium", "firefox", "webkit", "edge", "chrome"]
                                                             [default: chromium]
  -i, --screenshot  Generate screenshots                               [boolean]
  -s, --secure      enable or disable security settings such as CSP and same
                    origin policy                                      [boolean]
  -o, --output      Output directory                                    [string]
  -n, --filename    prefix of the generated files                       [string]
  -w, --width       Viewport width                                      [number]
  -a, --height      Viewport height                                     [number]
  -d, --dimensions  Array of viewports, override height/width settings
  [array] [default: '1920x1080', '1440x900', '1366x768', '1024x768', '768x1024',
                                                                      '320x480']
  -f, --fonts       Generate javascript to load fonts dynamically
                                                       [boolean] [default: true]
  -l, --console     Show console messages from the browser
                                                       [boolean] [default: true]
  -c, --container   Disable additional security settings to run inside a container
                                                                       [boolean]
  -p, --html        generate an HTML page containing inlined critical css
                                                                       [boolean]
  -h, --help        Show help                                          [boolean]
```

### Example

```shell

$ critical-cli https://github.com/ https://nodejs.org --secure=no -i -d '1440x900' -d '1366x768'
```