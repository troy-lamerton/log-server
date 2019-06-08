import l from './common/logger'
import knex from 'knex'
import { uniq, uniqBy, reverse } from 'lodash'

export const db = knex({
    client: 'sqlite3',
    connection: {
        filename: '../database.sqlite'
    },
    useNullAsDefault: true
})

function logs() {
    return db('logs')
}

export type Log = {
    commit: string,
    player: string,
    message: string,
    created_at: string,
    updated_at: string
}

export async function prepareDatabase() {
    const done = await db.schema.hasTable('logs')
    if (done) {
        l.warn('Started with existing logs from database')
        return
    }
    
    l.warn('Creating database table for logs')
    await db.schema.createTable('logs', t => {
        t.increments('id').primary()
        t.timestamps(true, true)
        t.string('commit')
        t.string('player')
        t.string('message')
    })
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