import l from './common/logger'
import Knex from 'knex'
import {reverse, uniqBy} from 'lodash'

const configChoice = {

    sqlite3: {
        client: 'sqlite3',
        connection: {
            filename: '../database.sqlite'
        },
        useNullAsDefault: true
    },

    mysql: {
        client: 'mysql',
        connection: {
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            database: process.env.MYSQL_DB,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASS,
        },
    }

};

l.info('Using db library ' + process.env.DB_LIBRARY);

const config = configChoice[process.env.DB_LIBRARY];

if (!config) throw 'process.env.DB_LIBRARY must be set to a database library name: ' + Object.keys(configChoice).join(', ');

export const db = Knex(configChoice[process.env.DB_LIBRARY]);

export type Log = {
    commit: string,
    player: string,
    message: string,
    created_at: string,
    updated_at: string
}

const devicesTableName = 'devices';
const logsTableName = 'logs';

export async function prepareDatabase() {
    if (!await db.schema.hasTable(logsTableName)) {
        l.warn(`Creating ${logsTableName} table`);
        await db.schema.createTable(logsTableName, t => {
            t.increments('id').primary()
            t.timestamps(true, true)
            t.string('commit')
            t.string('player')
            t.string('message')
        })
    }


    if (!await db.schema.hasTable(devicesTableName)) {
        l.warn(`Creating ${devicesTableName} table`);
        await db.schema.createTable(devicesTableName, t => {
            t.string('hardware_id').primary();
            t.string('name');
            t.timestamps(true, true);
        })
    }
}

function logs() {
    return db(logsTableName);
}

function devices() {
    return db(devicesTableName);
}

export async function addLog(commit: string, player: string, message: string) {
    await logs().insert({
        commit,
        player,
        message
    })
}

export async function addLogs(logsList: Log[]) {
    await logs().insert(logsList)
}

export async function getLogMessages(commit: string, player: string, after: number = 0): Promise<string[]> {
    const rows = await logs()
        .where({ commit, player })
        .offset(after)
        .limit(500)
        .select('message') as {message: string}[]

    return rows.map(row => row.message)
}

/**
 * @returns Unique commits, ordered from most recently created to oldest
 */
export async function getListOfCommits(): Promise<Log[]> {
    const allCommitsAll = await logs()
        .orderBy('created_at', 'asc') // oldest should come first, so that the oldest log for each commit is chosen
        .distinct('commit')
        .select('commit', 'created_at') as Log[]
        
        const unique = uniqBy(allCommitsAll, log => log.commit)
        return reverse(unique) // show newest first
    }
    
    export async function getListOfPlayers(commit: string): Promise<Log[]> {
        const allPlayersAll = await logs()
        .where({ commit })
        .orderBy('created_at', 'desc') // newest should come first
        .distinct('player')
        .select('player', 'created_at') as Log[]

    return uniqBy(allPlayersAll, log => log.player)
}

export async function deleteLogs(commit?: string, player?: string) {
    if (player) {
        return await logs().where({commit, player}).delete()
    }
    if (commit) {
        return await logs().where({commit, player}).delete()
    }
}

type Device = {
    hardware_id: string;
    name: string;
}

export async function updateDevice({hardware_id, name}: Device) {
    console.log('update', hardware_id, name);
    const device = await devices()
        .where({hardware_id})
        .first();

    if (device) {
        await devices().where({
            hardware_id,
        }).update({
            name,
        });
    } else {
        await devices().insert({
            hardware_id,
            name,
        });
    }
}

export async function getDevices(): Promise<Device[]> {
    return await devices().select('hardware_id', 'name');
}

export async function getDeviceName({hardware_id}: {hardware_id: string}): Promise<string> {
    const device = await devices()
        .where({hardware_id})
        .select()
        .first() as Device | undefined;

    return device ? device.name : '';
}