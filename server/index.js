const path = require('path')
const express = require('express')
const consola = require('consola')
const request = require('request')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const { Nuxt, Builder } = require('nuxt')
const app = express()

const isDev = process.env.ENV === 'dev'
const isBuild = process.env.ACTION === 'build'

// Import and Set Nuxt.js options
const config = require('../nuxt.config.js')
Object.assign(config, {
  dev: isDev
})

// 设置应用静态目录
app.use(express.static(path.join(__dirname, 'static')))

// 通过文章地址获取文章 html内容
app.all('/getUrlHtml', function (req, res, next) {
  try {
    const qUrl = req.query.url || ''

    // 获取准确的文章内容
    const getDom = (html, selector) => {
      const dom = new JSDOM(html)
      const htmlContent = dom.window.document.querySelector(selector)
      return htmlContent
    }

    // 获取文章的 title
    const getTitle = (content) => {
      const title = getDom(content, 'title')
      if (title) { return title.textContent }
      return '获取标题失败~'
    }

    // 获取不同平台的文章内容
    const getBody = (content) => {
      const getBySelector = selector => getDom(content, selector)

      // 掘金
      if (qUrl.includes('juejin')) {
        const htmlContent = getBySelector('.markdown-body')
        htmlContent.querySelector('style').remove()
        htmlContent.querySelectorAll('.copy-code-btn').forEach((v) => { v.remove() })
        return htmlContent.innerHTML
      }
      // oschina
      if (qUrl.includes('oschina')) {
        const htmlContent = getBySelector('.article-detail')
        htmlContent.querySelector('.ad-wrap').remove()
        return htmlContent.innerHTML
      }
      // cnblogs
      if (qUrl.includes('cnblogs')) {
        const htmlContent = getBySelector('#cnblogs_post_body')
        return htmlContent.innerHTML
      }
      // weixin
      if (qUrl.includes('weixin')) {
        const htmlContent = getBySelector('#js_content')
        return htmlContent.innerHTML
      }

      const htmlArticle = getBySelector('article')
      if (htmlArticle) { return htmlArticle.innerHTML }

      const htmlBody = getBySelector('body')
      if (htmlBody) { return htmlBody.innerHTML }

      return content
    }

    // 通过请求获取链接的 html
    request({
      url: qUrl,
      method: 'GET'
    }, (error, response, body) => {
      if (error) {
        res.status(404).send('Url Error')
        return
      }
      res.type('text/json')
      const json = {
        code: 1,
        title: getTitle(body),
        html: getBody(body)
      }
      res.status(200).send(json)
    })
  } catch (error) {

  }
})

// 全局错误抛出
app.use((error, req, res, next) => {
  if (error) {
    console.log('全局错误抛出：', error)
  }
})

async function start () {
  // Init Nuxt.js
  const nuxt = new Nuxt(config)

  const { host, port } = nuxt.options.server

  if (isBuild) {
    const builder = new Builder(nuxt)
    await builder.build()
    consola.success({
      message: `🚀 Packaged! 🚀`,
      badge: true
    })
    return
  }

  // Build only in dev mode
  if (isDev) {
    const builder = new Builder(nuxt)
    await builder.build()
  } else {
    await nuxt.ready()
  }

  // Give nuxt middleware to express
  app.use(nuxt.render)

  // Listen the server
  app.listen(port, host)

  // 拦截“未捕获的异常”
  process.on('uncaughtException', function (err) {
    console.log('未捕获的异常：', err)
  })

  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })
}
start()
