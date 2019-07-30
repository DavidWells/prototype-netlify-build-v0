const path = require('path')
const minimist = require('minimist')
const chalk = require('chalk')
const execa = require('execa')
const deepLog = require('./src/utils/deeplog')
const netlifyConfig = require('./src/config')

const baseDir = path.join(__dirname, '..')
const netlifyConfigFile = path.join(baseDir, 'netlify.yml')
const cliFlags = minimist(process.argv.slice(2))

/* env vars */
process.env.SITE = 'https://site.com'

;(async function main () {
  /* Load config */
  let config = {}
  try {
    config = await netlifyConfig(netlifyConfigFile, cliFlags)
  } catch (err) {
    console.log('Config error', err)
  }
  console.log('Current Netlify Config')
  deepLog(config)
  console.log()

  /* Parse plugins */
  const plugins = config.plugins || []
  const allPlugins = plugins.filter((plug) => {
    /* Load enabled plugins only */
    const name = Object.keys(plug)[0]
    const pluginConfig = plug[name] || {}
    return pluginConfig.enabled !== false && pluginConfig.enabled !== 'false'
  }).reduce((acc, curr) => {
    const name = Object.keys(curr)[0]
    const pluginConfig = curr[name] || {}
    let code
    try {
      // resolve file path
      console.log(chalk.yellow(`Loading plugin "${name}"`))
      // Resolves relative plugins and plugins from node_modules dir. TODO harden resolution
      const filePath = (!name.match(/^\./)) ? name : path.resolve(baseDir, name)
      code = require(filePath)
    } catch (e) {
      console.log(`Error loading ${name} plugin`)
      console.log(e)
      // TODO If plugin not found, automatically try and install and retry here
    }

    if (typeof code !== 'object' && typeof code !== 'function') {
      throw new Error(`Plugin ${name} is malformed. Must be object or function`)
    }

    const methods = (typeof code === 'function') ? code(pluginConfig) : code

    // Map plugins methods in order for later execution
    Object.keys(methods).forEach((hook) => {
      if (!acc.lifeCycleHooks[hook]) {
        acc.lifeCycleHooks[hook] = []
      }
      if (config.build.lifecycle[hook]) {
        // Only add commands from 'build.lifecycle' once. Todo refactor
        const alreadyThere = acc.lifeCycleHooks[hook].some((x) => {
          return x.config
        })
        if (!alreadyThere) {
          acc.lifeCycleHooks[hook] = acc.lifeCycleHooks[hook].concat({
            name: 'config',
            hook: hook,
            config: {},
            method: async () => {
              try {
                // Parse commands and turn into exec
                if (Array.isArray(config.build.lifecycle[hook])) {
                  const doCommands = config.build.lifecycle[hook].map((cmd) => {
                    return execCommand(cmd)
                  })
                  await Promise.all(doCommands)
                } else {
                  const commands = config.build.lifecycle[hook].split('\n')
                  const doCommands = commands.map((cmd) => {
                    if (!cmd) {
                      return Promise.resolve()
                    }
                    return execCommand(cmd)
                  })
                  await Promise.all(doCommands)
                }
              } catch (err) {
                console.log(chalk.redBright(`Error from netlify config build.lifecycle.${hook} hook from command:`))
                console.log(`"${config.build.lifecycle[hook]}"`)
                console.log()
                console.log(chalk.redBright('Error message\n'))
                console.log(err.stderr)
                console.log()
                process.exit(1)
              }
            }
          })
        }
      }
      acc.lifeCycleHooks[hook] = acc.lifeCycleHooks[hook].concat({
        name: name,
        hook: hook,
        config: pluginConfig,
        method: methods[hook]
      })
    })

    return acc
  }, {
    lifeCycleHooks: {}
  })

  // console.log('Build Lifecycle:')
  // deepLog(allPlugins)

  const lifecycle = [
    'init',
    'configParse',
    'getCache',
    'install',
    'build',
    // >
    // 'build:site'
    // 'build:function',
    'package',
    'deploy',
    'saveCache',
    'manifest',
    'finally'
  ]

  // Add pre & post hooks
  const fullLifecycle = lifecycle.reduce((acc, hook) => {
    acc = acc.concat([
      preFix(hook),
      hook,
      postFix(hook)
    ])
    return acc
  }, [])
  // console.log('fullLifecycle', fullLifecycle)

  /* Get active build instructions */
  const buildInstructions = fullLifecycle.reduce((acc, n) => {
    if (allPlugins.lifeCycleHooks[n]) {
      acc = acc.concat(allPlugins.lifeCycleHooks[n])
    }
    return acc
  }, [])

  // console.log('buildInstructions', buildInstructions)
  /* patch environment dependencies */

  /* Execute build with plugins */
  console.log()
  const manifest = await engine(buildInstructions, config)
  console.log(chalk.greenBright('Build complete'))
  if (Object.keys(manifest).length) {
    console.log('Manifest:')
    deepLog(manifest)
  }
})()

function preFix(hook) {
  return `pre${hook}`
}

function postFix(hook) {
  return `post${hook}`
}

async function execCommand(cmd) {
  console.log(chalk.yellowBright(`Running "${cmd}"`))
  const subprocess = execa(`${cmd}`, { shell: true })
  subprocess.stdout.pipe(process.stdout)
  const { stdout } = await subprocess
  return stdout
}

/**
 * Plugin engine
 * @param  {Array} methodsToRun - Plugin functions to run
 * @param  {Object} config - Netlify config file values
 * @return {Object} updated config?
 */
async function engine(methodsToRun, config) {
  const returnData = await methodsToRun.reduce(async (promiseChain, plugin, i) => {
    const { method, hook, config, name } = plugin
    const currentData = await promiseChain
    if (method && typeof method === 'function') {
      console.log(chalk.cyanBright(`> ${i + 1}. Running "${hook}" lifecycle from "${name}" plugin`))
      console.log()
      const pluginReturnValue = await method(config)
      console.log()
      if (pluginReturnValue) {
        return Promise.resolve(Object.assign({}, currentData, pluginReturnValue))
      }
    }
    return Promise.resolve(currentData)
  }, Promise.resolve({}))
  // console.log('returnData', returnData)
  return returnData
}
