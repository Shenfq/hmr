const fs = require('fs')
const koa = require('koa')
const nodePath = require('path')
const koaSocket = require('koa-socket-2')

const Build = require('./build')
const template = require('./template')


const build = new Build()
// 直接生成代码
// const code = build.genCode()
// fs.writeFileSync(build.output, code)

// 启动服务
const app = new koa()
const socket = new koaSocket()

socket.attach(app)

app.use(async ctx => {
  const { method, path } = ctx
  console.log(method, path)
  if (method === 'GET') {
    if (path === '/') {
      // 返回 html
      ctx.set('Content-Type', 'text/html;charset=utf-8')
      ctx.body = build.genIndex()
      return
    } else if (nodePath.join('./', path) === build.output) {
      ctx.set('Content-Type', 'application/x-javascript;charset=utf-8')
      ctx.body = build.genCode()
      return
    } else if (path.startsWith('/update/')) {
      const file = nodePath.relative('/update/', path)
      const content = build.contents[file]
      if (content) {
        ctx.set('Content-Type', 'application/x-javascript;charset=utf-8')
        ctx.body = `modules['${file}'] = ${template.wrapperFn(content)}`
        return
      }
    }
  }
  ctx.throw(404, 'Not Found');
})

build.onWatch((file) => {
  app._io.emit('updateMsg', JSON.stringify({
    type: 'update', file
  }));
})

app.listen(8080)

console.log('Project is running at http://localhost:8080/')