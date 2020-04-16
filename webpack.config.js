const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');

module.exports = {
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "index.js",
  },
  mode: "development",
  plugins: [
    new CopyWebpackPlugin(['./src/index.html'])
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
      {
        test: /\.(glsl|frag|vert)$/,
        exclude: /node_modules/,
        use: [
          'raw-loader',
          {
            loader: 'glslify-loader',
            options: {
              transform: [
                ['glslify-hex', { 'option-1': true, 'option-2': 42 }]
              ]
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [ '.ts', '.js', 'glsl' ]
  },
};
