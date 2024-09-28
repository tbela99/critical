# CRITICAL PATH GENERATOR
[![npm](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftbela99%2Fcritical%2Fmaster%2Fpackage.json&query=version&logo=npm&label=npm&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40tbela99%2Fcritical)](https://www.npmjs.com/package/@tbela99/critical) [![NPM Downloads](https://img.shields.io/npm/dm/%40tbela99%2Fcritical)](https://www.npmjs.com/package/@tbela99/critical)
![screenshot](https://raw.githubusercontent.com/tbela99/critical/master/screenshot.png)

Critical path generator tools using node oe the web browser.

## Web browser script

Extract critical CSS path for the current viewport in the current page.

Using modules
```html
<script type="module">

  import {parse, render} from 'https://esm.sh/@tbela99/css-parser@0.6.0/web';
  import {extract} from 'https://esm.sh/@tbela99/critical@1.1.1/browser';

  const results = await extract({fonts: true});
  // css is optimized using https://www.npmjs.com/package/@tbela99/css-parser
  // pretty print css
  const css = await parse(results.styles.join('\n')).then(result => render(result.ast, {minify: false}).code);

  console.debug(css);
</script>
```

Without using modules
```html
<script src="https://cdn.jsdelivr.net/gh/tbela99/critical@1.1.1/dist/browser-umd.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tbela99/css-parser@0.6.0/dist/index-umd-web.js"></script>
<script>

  (async () => {

    const {parse, render} = CSSParser;

    const results = await critical.extract({fonts: true});
    // optimize and pretty print css
    const css = await parse(results.styles.join('\n')).then(result => render(result.ast, {minify: false}).code);

    console.debug(css);
  })();
</script>
```

### Options

- options: _object_
    - fonts: _bool?_ generate Javascript to load web fonts dynamically
    - html: _bool?_ generate an HTML page containing inlined critical css
    - signal: _AbortSignal?_ abort critical extraction using AbortSignal

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
    html: true,
    console: true,
    screenshot: true,
    secure: false,
    // dimensions can be specified as an array of string or object
    dimensions: ['1400x900', '1200x675', '992x558'],
    advanced: true
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
  > input settings
    - input: _string_. specify HTML input
    - base: _string_. specify HTML <base> of the HTML input
  > output settings
    - base: _string_. specify HTML <base> for URL
    - html: _bool_. generate an HTML page containing the inlined critical css
    - output: _string_. change output directory. default _'./output/'_
    - fonts: _bool_. generate javascript to load web fonts. default _true_
    - json: _bool_. dump result as JSON
    - advanced: _bool_. remove parts of css selectors that do not match any element. default _false_
  > debugging settings
    - console: _bool_. log console messages from the pages. default _true_
    - verbose: _bool_. enable verbose mode

## Command line script

### Use with npx

```bash
$ npx @tbela99/critical --help
$ npx @tbela99/critical -r -i -e --html https://github.com/ https://nodejs.org
```

### Use with bun

```bash
$ bunx @tbela99/critical --help
$ bunx @tbela99/critical -r -i -e --html https://github.com/ https://nodejs.org
```

### Install from npm

```bash
$ npm install @tbela99/critical
```

### Install from jsr
install for deno specific project

```bash
$ deno add @tbela99/critical
```

### Install globally

when installed globally, it is available as _critical-cli_

```bash
$ npm install -g @tbela99/critical
$ critical-cli -i http://google.com
```

## Usage

```shell
$ critical-cli.js [options+] url [url+]
run the command line tools:
Example: critical-cli.js -d 800x600 -d 1024x768 -i https://facebook.com

Options:
      --help            Show help                                      [boolean]
      --version         Show version number                            [boolean]
  -t, --headless        enable or disable headless mode[boolean] [default: true]
  -g, --base            base path using reading data from stdin         [string]
  -b, --browser         browser to use
  [string] [choices: "chromium", "firefox", "webkit", "edge", "chrome"] [default
                                                                   : "chromium"]
  -k, --browser-type    use a mobile browser
                                         [string] [choices: "mobile", "desktop"]
  -r, --random-browser  use a random browser          [boolean] [default: false]
  -i, --screenshot      Generate screenshots                           [boolean]
  -s, --secure          enable or disable security settings such as CSP and same
                         origin policy                                 [boolean]
  -m, --color-scheme    color scheme
                           [string] [choices: "light", "dark"] [default: "dark"]
  -o, --output          Output directory                                [string]
  -n, --filename        prefix of the generated files                   [string]
  -w, --width           Viewport width                                  [number]
  -a, --height          Viewport height                                 [number]
  -d, --dimensions      Array of viewports, override height/width settings
                                                                         [array]
  -f, --fonts           Generate javascript to load fonts dynamically
                                                       [boolean] [default: true]
  -l, --console         Show console messages from the browser         [boolean]
  -c, --container       Disable additional security settings to run inside a con
                        tainer                                         [boolean]
  -p, --html            Generate an HTML page containing inlined critical css
                                                                       [boolean]
      --json            print result in JSON format   [boolean] [default: false]
  -e, --advanced        remove parts of css selectors that do not match any elem
                        ent                           [boolean] [default: false]
  -v, --verbose         Enable verbose mode           [boolean] [default: false]


```

### Example

```shell

$ critical-cli https://github.com/ https://nodejs.org --secure=no -i -d '1440x900' -d '1366x768' --json
```

### Read data from cli

```shell

$ cat pages/dashboard.html | critical-cli --base=pages/ --secure=no -i -d '1440x900' -d '1366x768' --json
```

## CHANGELOG

### V1.1.1

- fix node 22 compatibility issues 
- publish to jsr.io

### V1.1.0

- read data from STDIN
- remove unused selectors
- dump cli result as JSON

### V1.0.1

- fix package.json dependencies and dev dependencies mix up

### V1.0.0

- converted to typescript
- changed default export to es module
- optimized generated css (merge rule, remove duplicate, minify, generate nested css)
- specify color scheme [dark/light]


