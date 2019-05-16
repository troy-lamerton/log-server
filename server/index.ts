import './common/env';
import runServer from './server';

const port = parseInt(process.env.PORT || '8090');

runServer(port)
