const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    target: 'node',
    mode: 'development',
    entry: './server/index.ts',
    devtool: 'inline-source-map',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'index.js'
    },
    node: {
        __dirname: false,
        __filename: false
    },
    plugins: [
        new CopyPlugin([
            '.env',
            { from: 'server/public', to: 'public' }
        ])
    ],
    resolve: {
        extensions: ['.ts', '.js'] //resolve all the modules other than index.ts
    },
    externals: {
        knex: 'commonjs knex'
    },
    module: {
        rules: [
            {
                use: 'ts-loader',
                test: /\.ts?$/
            }
        ]
    },
}
