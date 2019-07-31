# Netlify Build

Netlify build is the next generation of CI/CD tooling for modern web applications.

It is designed to support any kind of build flow and is extendable to fit any unique project requirements.

## Lifecycle

The Netlify build lifecycle consists of these `events`

Events are activities happening in the build system.

```js
const lifecycle = [
  /* Build initialization steps */
  'init',
  /* Parse netlify.toml and resolve any dynamic configuration include build image if specified */
  'configParse',
  /* Fetch previous build cache */
  'getCache',
  /* Install project dependancies */
  'install',
  /* Build the site & functions */
  'build', // 'build:site', 'build:function',
  /* Package & optimize artifact */
  'package',
  /* Deploy built artifact */
  'deploy',
  /* Save cached assets */
  'saveCache',
  /* Outputs manifest of resources created */
  'manifest',
  /* Build finished */
  'finally'
]
```

The Lifecycle flows through events and their `pre` and `post` counterparts.

```
┌───────────────┬────────────────┬──────────────────┐
│      pre      │     event      │       post       │
├───────────────┼────────────────┼──────────────────┤
│               │                │                  │
│               │                │                  │
│   prebuild    │     build      │    postbuild     │
│               │                │                  │
│               │                │                  │
└───────────────┤                ├──────────────────┘
                └────────────────┘

━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ▶

                  event flow
```

`pre` happens before a specific event

`post` happens before a specific event

**Example:**

`prebuild` runs first, then `build`, then `postbuild` in that order.

This applies to all lifecycle events listed above.

## Plugins

Plugins are POJOs (plain old javascript objects) with methods that match the various lifecycle events.

```js
function exampleNetlifyPlugin(config) {
  return {
    // Hook into `init` lifecycle
    init: () => {
      console.log('Do custom thing when buildbot initializes')
    },
    // Hook into `postbuild` lifecycle
    postbuild: () => {
      console.log('Build finished. Do custom thing')
    }
    // ... etc
  }
}
```

**Examples:**

- **netlify-lighthouse-plugin** to automatically track your lighthouse site score between deployments
- **netlify-cypress-plugin** to automatically run integration tests
- **netlify-tweet-new-post-plugin** to automatically share new content via twitter on new publish
- **netlify-sitemap-plugin** to generate sitemaps after build
- **netlify-notify-plugin** to automatically wired up build notifications
- ... skys the limit 🌈
