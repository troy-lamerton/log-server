import * as db from '../server/db';
import l from '../server/common/logger';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import { Log } from '../server/db';

(async function() {
    await db.prepareDatabase()
    l.info('db ready')

    
    const logsFile = path.join(__dirname, '..', 'logs.json')
    
    l.info(`reading json at ${logsFile}`)
    
    const logs: string = fs.readFileSync(logsFile, {encoding: 'utf8'})
    const logsData = JSON.parse(logs) as {
        [commit: string]: {
            [player: string]: string[]
        }
    };
    
    await db.db.transaction(trx => {

        const promises = _.map(logsData, (players, commit) => {

            const insertPromises = _.map(players, (myLogs, player) => {
                const logObjs = myLogs.map(message => ({commit, player, message}))
                const chunks = _.chunk(logObjs, 50);

                const insertChunks = chunks.map(chunk => {
                    return db.db('logs')
                            .transacting(trx)
                            .insert(chunk);
                })
                return Promise.all(insertChunks);
            });

            return Promise.all(insertPromises);
        });

        return Promise.all(promises)
    })
    // l.info(`awaiting inserts, total of ${promises.length}`)
            // await Promise.all(promises)
    l.info('done')

})();