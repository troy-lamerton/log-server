import l from './common/logger'
import knex from 'knex'
import {uniq} from 'lodash'

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
    message: string
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
        t.timestamp('created_at').defaultTo(db.fn.now());
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

export async function getListOfCommits(): Promise<string[]> {
    const allCommitsAll = await logs()
        .select('commit') as {commit: string}[]

    const allCommits = allCommitsAll.map(obj => obj.commit)
    return uniq(allCommits)
}

export async function getListOfPlayers(commit: string): Promise<string[]> {
    const allPlayersAll = await logs()
        .where({ commit })
        .select('player') as {player: string}[]

    const allPlayers = allPlayersAll.map(obj => obj.player)
    return uniq(allPlayers)
}

export async function deleteLogs(commit?: string, player?: string) {
    if (player) {
        return await logs().where({commit, player}).delete()
    }
    if (commit) {
        return await logs().where({commit, player}).delete()
    }
}