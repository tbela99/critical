# CRITICAL PATH GENERATOR

![screenshot](https://raw.githubusercontent.com/tbela99/critical/master/screenshot.png)

Critical path generator tools using node oe the web browser.

## Web browser script

Extract critical CSS path for the current viewport in the current page.

```html

<script src="./dist/browser.js"></script>
<script>

    critical.extract({

    fonts: true
  // print extracted CSS
}).then(results => console.log(results.styles.join('\n')));
</script>
```

### Options

- options: _object_
    - fonts: _bool?_ generate Javascript to load web fonts dynamically
    - html: _bool?_ generate an HTML page containing inlined critical css
    - signal: _AbortSignal?_ abort critical extraction using AbortSignal
    - transform: _function_ function used to minify css

optimize css using a css parser

```html

<script type="module">
import {transform} from 'https://esm.sh/@tbela99/css-parser@0.4.1/web';
import {critical} from 'https://esm.sh/@tbela99/critical@0.2.0';

    critical.extract({

    fonts: true,
    transform: transform
  // print extracted CSS
}).then(results => console.log(results.styles.join('\n')));
</script>
```

### Limitations

The web browser script is subject to the same origin policy and CSP.
This can prevent the script from reading external stylesheets.

## Node script

Generate critical CSS path from your nodejs script

```javascript

import {critical} from "@tbela99/critical";

const urls = [
    'http://github.com',
    'https://docs.npmjs.com/cli/v8/configuring-npm/package-json#directories'
];

urls.forEach(async url => critical(url, {
    html: false,
    console: true,
    screenshot: true,
    secure: false,
    // dimensions can be specified as an array of string or object
    dimensions: ['1400x900', '1200x675', '992x558']
}).then((results) => {

    // print extracted CSS
    console.log(results.styles.join('\n'));
}));

```

### Node script options

- options: _object_
  > browser settings
    - headless: _bool_. start the browser in headless mode. default _true_
    - browser: _string_. browser to use [choices: "chromium", "firefox", "webkit", "edge", "chrome"]
      default _"chromium"_
    - browserType: _string_. use a desktop or mobile browser [choices: 'desktop', 'mobile']
    - randomBrowser: use a random web browser
    - randomUserAgent: _bool_. use a random user agent
  > runtime settings
    - container: _bool_. turn off additional security features, required to run inside a container
    - secure: _bool_. enforce browser security features such as CSP and same origin policy. default _false_
  > screenshots settings
    - screenshot: _bool_. generate screenshot for each viewport mentioned. default _false_
    - colorScheme: _string_. force a color scheme [choices: 'dark', 'light']
    - filename: _string_. prefix of the generated files
    - width: _int_. viewport width. default _800_
    - height: _int_. viewport height. default _600_
    - dimensions: _array_ or _string_. array of viewports. this takes precedence over height and width. viewports can be
      specified as objects with width and height property or a string.
  > output settings    
    - html: _bool_. generate an HTML page containing inlined critical css
    - output: _string_. change output directory. default _'./output/'_
    - fonts: _bool_. generate javascript to load web fonts. default _true_
  > debugging settings
    - console: _bool_. log console messages from the pages. default _true_
    - verbose: _bool_. enable verbose mode

## Command line script

when installed globally, it is available as _critical-cli_

```bash
$ sudo npm install -g @tbela99/critical
$ critical-cli -i http://google.com
```

Usage

```shell
$ critical-cli.js [options+] url [url+]
run the command line tools:
Example: critical-cli.js -d 800x600 -d 1024x768 -i https://facebook.com

Options:
      --version        Show version number                             [boolean]
  -t, --headless       enable or disable headless mode [boolean] [default: true]
  -b, --browser        browser to use
  [string] [choices: "chromium", "firefox", "webkit", "edge", "chrome"] [default
                                                                   : "chromium"]
  -k, --browser-type   use a mobile browser
                                         [string] [choices: "mobile", "desktop"]
  -r, --randomBrowser  use a random browser           [boolean] [default: false]
  -i, --screenshot     Generate screenshots                            [boolean]
  -s, --secure         enable or disable security settings such as CSP and same
                       origin policy                                   [boolean]
  -m, --color-scheme   color scheme
                           [string] [choices: "light", "dark"] [default: "dark"]
  -o, --output         Output directory                                 [string]
  -n, --filename       prefix of the generated files                    [string]
  -w, --width          Viewport width                                   [number]
  -a, --height         Viewport height                                  [number]
  -d, --dimensions     Array of viewports, override height/width settings[array]
  -f, --fonts          Generate javascript to load fonts dynamically   [boolean]
  -l, --console        Show console messages from the browser          [boolean]
  -c, --container      Disable additional security settings to run inside a cont
                       ainer                                           [boolean]
  -p, --html           Generate an HTML page containing inlined critical css
                                                                       [boolean]
  -v, --verbose        Enable verbose mode            [boolean] [default: false]
  -h, --help           Show help                                       [boolean]


```

### Example

```shell

$ critical-cli https://github.com/ https://nodejs.org --secure=no -i -d '1440x900' -d '1366x768'
```
