var path = require('path')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var webpack = require('webpack')
var CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = {
  // entry: './src/index.js',    // 入口文件
  entry: {
    index: './src/index.js',
    sort: './example/sort-table.js'
  },
  devServer: {
    contentBase: './dist',
    host: 'localhost',
    port: 3000,
    open: true,
    hot: true, /// 热更新,
  },
  output: {
    filename: '[name].[hash:4].js',
    path: path.resolve('dist')
  },    // 出口文件
  module: {},     // 处理对应模块
  plugins: [
    new HtmlWebpackPlugin({
      tempalte: './index.html',
      hash: true,
      title: 'virtual-dom'
    }),
    new webpack.HotModuleReplacementPlugin(),
    new CleanWebpackPlugin()
  ],
  mode: 'development',
}