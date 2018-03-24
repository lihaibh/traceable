var nodeExternals = require('webpack-node-externals');
var WebpackBuildNotifierPlugin = require('webpack-build-notifier');
var webpack = require('webpack');
var path = require('path');

var envData = {
    'develop': {
        out: 'index.js'
    },
    'production': {
        out: 'index.min.js'
    }
};

var webpack_opts = (env) => ({
    entry: ["./src/index.ts"],
    target: 'node',
    output: {
        filename: `${envData[env.NODE_ENV].out}`,
        libraryTarget: "commonjs2",
        library: "Traceable"
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@lib': path.resolve(__dirname, 'src/')
        }
    },
    plugins: [
        new WebpackBuildNotifierPlugin({
            title: 'Webpack Build'
        }),
        new webpack.IgnorePlugin(/spec\.ts$/),
    ],
    devtool: 'inline-source-map',
    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: "awesome-typescript-loader"
        }]
    }
});

module.exports = webpack_opts;
