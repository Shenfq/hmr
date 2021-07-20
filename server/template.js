const wrapperFn = (content) => {
  return  `function (require, module, exports) {\n  ${content.split('\n').join('\n  ')}\n}`
}
const modulesFn = (files, contents) => {
  let modules = 'const modules = {\n'
  files.forEach(file => {
    modules += `"${file}": ${wrapperFn(contents[file])},\n\n`
  })
  modules += '}'
  return modules
}
const requireFn = () => `const require = function(url) {
  const module = { exports: {} }
  const factory = modules[url] || function() {}
  factory.call(module, require, module, module.exports)
  return module.exports
}`
const socketFn = () => `const socket = io()
socket.on('updateMsg', function (msg){
  const json = JSON.parse(msg)
  if (json.type === 'update') {
    // 根据文件名，请求更新的模块
    fetch('/update/' + json.file)
      .then(rsp => rsp.text())
      .then(text => {
        eval(text) // 执行模块
      })
  }
})
`

module.exports = {
  wrapperFn,
  modulesFn,
  requireFn,
  socketFn
}