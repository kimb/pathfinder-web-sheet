"use strict"; // vim: ts=2:sw=2:ft=javascript:
var path = require('path');
var webpack = require('webpack');
var WebpackCleanupPlugin = require('webpack-cleanup-plugin');

module.exports = {
  name: 'bundle',
  entry: './src/index.jsx',
  output: {
    filename: '[name].js',
      path: path.resolve(__dirname, 'docs')
  },
  module: {
    rules: [
      {
        test: /\.jsx$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
              options: {
                presets: ['es2015','react','stage-2']
              }
          }
      }
    ]
  },
  resolve: {
    extensions: ['.js','.jsx']
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: "vendor",
        minChunks: function(module){
          return module.context && module.context.indexOf("node_modules") !== -1;
        }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
          screw_ie8: true,
          drop_console: false,
          drop_debugger: false
      },
      extractComments: true,
      include: "vendor.js"
    })
  ]
};
