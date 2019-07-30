const { copyFiles } = require('./fs')
// move_cache
module.exports = async function moveCache(src, dest, message) {
  console.log(`Started ${message}`)
  await copyFiles(src, dest)
  console.log(`Finished ${message}`)
}
