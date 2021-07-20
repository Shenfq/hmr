// webpack 热更新
if (module.hot) {
  module.hot.accept('./num')
}
$(function() {
  let num = 0
  const $app = $('#app')
  $app.text(`同步修改结果: ${num}`)
  setInterval(() => {
    num = require('./num').setNum(num)
    $app.text(`同步修改结果: ${num}`)
  }, 1e3)
})