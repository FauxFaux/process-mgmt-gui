import path from 'node:path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = import.meta.dirname;
if (!__dirname) {
  throw new Error('requires node >20.11 for no particular reason');
}

export default {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'static/bundle.[contenthash].js',
    library: 'app',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],

  // Enable sourcemaps for debugging webpack's output.
  devtool: 'source-map',

  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'babel-loader' }],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(webp|png|jpe?g|gif|eot|ttf|woff|woff2)$/i,
        type: 'asset/resource',
      }
    ],
  },
};
