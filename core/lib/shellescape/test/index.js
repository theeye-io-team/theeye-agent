
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const shellescape = require('../shellescape')
const join = require('path').join
const script = join(__dirname, 'script.js')
const os = require('os')

const argsList = [
  ["arg1","arg 2","'"],
  ['arg1 "',"arg 2",'"""""""""'],
  ['y al fin llego "el ser de luz"',"arg 2","arg 3 C:\\windows\\"],
  ["arg1","symbols","&/<>|^"],
  ["%windir%","symbols","&/<>|^"],
  ["!",`${os.EOL}`, `Dear Test:${os.EOL}This is a newline.${os.EOL}This is another newline. bye`]
]

const main = async () => {
  let count = 0
  for (args of argsList) {
    count++
    console.log('-----------------')
    console.log(`test set ${count}`)
    console.log('-----------------')
    console.log('raw arguments')
    console.log(args)
    console.log('-----------------')
    console.log('escaped command')

    let escArgs = shellescape(args)
    let cmd = `node "${script}" ${escArgs}`
    console.log(cmd)
    const { stdout, stderr } = await exec(cmd)
    console.log(stdout, stderr)
  }
}

main()
