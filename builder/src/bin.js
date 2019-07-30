const minimist = require('minimist')
const runBuild = require('./index')
const execa = require('execa')

const argv = minimist(process.argv.slice(2))

runBuild({
  buildDir: '',
  buildCmd: 'echo "hi"',
  functionsDir: '',
  zisiTempDir: '',
  nodeVersion: '10.16.0',
  rubyVersion: '2.6.2',
  yarnVersion: ''
}).catch((err) => {
  console.log('err', err)
})
