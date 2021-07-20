const fs = require('fs')
const path = require('path')
const minimist = require('minimist')
const chokidar = require('chokidar')
const template = require('./template')

module.exports = class Build {
  watcher = null
  onUpdate = function () {}

  files = new Set()
  contents = new Object()

  constructor() {
    const args = minimist(process.argv.slice(2))
    const { index, entry, output } = args

    if (!entry || !output) {
      throw new Error('Params Error')
    }

    this.index = index || 'index.html'
    this.entry = path.join('./', entry)
    this.output = path.join('./', output)

    // 获取所有js依赖
    this.getScript()
    // 开启文件监听
    this.startWatch()
  }
  processJS (dir, content) {
    let match = []
    let result = content
    const depReg = /require\s*\(['"](.+)['"]\)/g

    while ((match = depReg.exec(content)) !== null) {
      const [statements, url] = match
      let newUrl = url
      // 不存在文件后缀时，手动补充后缀
      if (!newUrl.endsWith('.js')) {
        newUrl += '.js'
      }

      newUrl = path.join(dir, newUrl)
      // 将require中的相对地址替换为绝对地址
      let newRequire = statements.replace(url, newUrl)
      newRequire = newRequire.replace('(', `(/* ${url} */`)
      result = result.replace(statements, newRequire)
      this.files.add(newUrl)
    }

    return result
  }
  getScript() {
    this.files.add(this.entry)
    this.files.forEach(file => {
      const dir = path.dirname(file)
      const content = fs.readFileSync(file, 'utf-8')
      const newContent = this.processJS(dir, content)
      this.contents[file] = newContent
    })
  }
  genIndex() {
    const { index, output } = this
    const htmlStr = fs.readFileSync(index, 'utf-8')
    const insertIdx = htmlStr.indexOf('</head>') || htmlStr.indexOf('<body>')
    const insertScript = `
    <script src="/socket.io/socket.io.js"></script>
    <script src="${output}"></script>
    `
    return htmlStr.slice(0, insertIdx) + insertScript + htmlStr.slice(insertIdx)
  }
  genCode() {
    let outputJS = ''
    outputJS += `/* all modules */${template.modulesFn(this.files, this.contents)}\n`
    outputJS += `/* require */${template.requireFn()}\n`
    outputJS += `/* socket */${template.socketFn()}\n`
    outputJS += `/* start */require('${this.entry}')\n`
    // 放到闭包内，避免污染全局变量
    return `(() => {${outputJS}})()`
  }
  startWatch() {
    this.watcher = chokidar.watch([...this.files], {
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    }).on('change', (file) => {
      // 获取更新后的文件
      const dir = path.dirname(file)
      const content = fs.readFileSync(file, 'utf-8')
      const newContent = this.processJS(dir, content)
      // 将更新的文件写入内存
      this.contents[file] = newContent
      this.onUpdate && this.onUpdate(file)
    })
  }
  onWatch(callback) {
    this.onUpdate = callback
  }
}
