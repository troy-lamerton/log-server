import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import l from './common/logger'
import { size, reduce, first } from 'lodash'
import { IncomingMessage, OutgoingMessage } from 'http';
import sanitizeHtml from 'sanitize-html'
import staticPlugin from 'fastify-static'
import path from 'path'
import foobarIpsum from 'foobar-ipsum'
import * as db from './db';

const dummy = new foobarIpsum({
    size: {
        sentence: 3,
        paragraph: 1,
    },
})

async function listLinks(_, reply: FastifyReply<OutgoingMessage>) {
    const commits = await db.getListOfCommits()
    if (!size(commits)) {
        reply.send('There are no logs for any commit')
        return
    }

    const html = page('List of commits with logs:', commits,
        commit => `<div><a href="/logs/${commit}">${commit}</a></div>`
    )

    reply.type('text/html; charset=utf-8').send(html)
}

async function listPlayers(req: FastifyRequest<IncomingMessage>, reply: FastifyReply<OutgoingMessage>) {
    const { commit } = req.params

    const playersList = await db.getListOfPlayers(commit)

    const title = `Players on commit ${commit}</h1>`
    
    const numPlayers = size(playersList)
    if (numPlayers == 0) {
        const html = page(title,
            [`<div class="empty">No players with logs on commit '${commit}' yet</div>`],
            a => a
            )
            reply.type('text/html; charset=utf-8').send(html)
            return
        }
        
        // if one player, immediately show that players logs
        if (numPlayers == 1) {
            const onlyPlayer = first(playersList);
            reply.redirect(`/logs/${commit}/${onlyPlayer}`);
            return;
    }

    const html = page(
        title,
        playersList,
        player => `<div><a href="/logs/${commit}/${player}">${player}</a></div>`
    )

    reply.type('text/html; charset=utf-8').send(html)
}

export default function runServer(port: number) {
    const server = fastify({logger: l})

    server.setNotFoundHandler((_, reply) => {
        reply.code(404).send('Not found')
    })

    server.get('/', (_, reply) => {
        reply.redirect('/logs')
    })
    server.get('/logs', listLinks)

    server.get('/logs/:commit', listPlayers)

    /** Show all logs for this commit */
    server.get('/logs/:commit/:player/new', async (req, reply) => {
        const { commit, player } = req.params

        const afterIndex = req.query.after || 0

        const newLogs = await db.getLogMessages(commit, player, afterIndex)

        if (newLogs.length == 0) {
            reply
                .type('application/json')
                .code(200)
                .send({error: 'No new logs m8' })
            return
        }

        const content = html(
            newLogs,
            msg => {
                let msgType = msg.match(/  \[(\w+)\] /)
                const className = msgType ? msgType[1].toLowerCase() : 'unknown'
                return `<pre class="${className}">${msg.replace('\n', '<br>')}</pre>`
            }
        )

        reply.type('application/json').send({
            html: content
        })
    })
    server.get('/logs/:commit/:player', async (req, reply) => {
        const { commit, player } = req.params

        const playerLogs = await db.getLogMessages(commit, player)

        if (!playerLogs.length) {
            playerLogs.push(`No logs for player ${player} yet`)
        }

        const content = page(
            `Logs for ${player} on commit ${commit}`,
            playerLogs,
            msg => {
                let msgType = msg.match(/  \[(\w+)\] /)
                const className = msgType ? msgType[1].toLowerCase() : 'unknown'
                return `<pre class="${className}">${msg.replace('\n', '<br>')}</pre>`
            },
            true
        )

        reply.type('text/html').send(content)
    })

    /** Receive a log message from the game */
    server.post('/logs/:commit/:player', async (req, reply) => {
        const msg = req.body.trim()
        const { commit, player } = req.params

        const safe = makeSafe(msg)

        await db.addLog(commit, player, safe)

        reply.send('OK')
    })

    server.get('/hackme', (req, reply) => {
        if (!req.query) {
            reply.code(404).send('Not found')
            return;
        }
        const { code, auth } = req.query;
        // much security wow
        if (auth !== 'happy2banana') {
            reply.code(404).send('Not found')
            return;
        }
        try {
            const codeToExe = decodeURIComponent(code)
            const res = eval(codeToExe)
            reply.code(200).send(`Executed got result:\n${res}`)
        } catch (err) {
            l.warn(err.message)
            reply.code(400).send(`Your code threw ${err}`)
        }
    })

    /** Delete logs */
    server.delete('/logs', deleteLogs)
    server.delete('/logs/:commit', deleteLogs)
    server.delete('/logs/:commit/:player', deleteLogs)

    // debug
    server.get('/logs/:commit/:player/:msg', async (req, reply) => {
        const { commit, player, msg } = req.params
        try {
            await db.addLog(commit, player, makeSafe(msg))
            reply.send('OK')
        } catch {
            reply.code(400).send(`Bad input: ${commit}/${player}`)
        }
    })

    // debug
    server.get('/logs/:commit/:player/fill', async (req, reply) => {
        const { commit, player } = req.params
        try {
            const promises = new Array(100).fill(0).map(() => {
                const d = new Date()
                const msg = `00/00 ${d.toTimeString().slice(0,8)}  [Log] ${dummy.sentence()} ${dummy.sentence()} ${dummy.sentence()}`
                return db.addLog(commit, player, msg)
            })

            await Promise.all(promises)
            
            reply.send(`Filled ${player} with some logs`)

        } catch (err) {
            l.error(err)
            reply.code(400).send(`Bad input: ${commit}/${player}`)
        }
    })

    // serve static files
    server.register(staticPlugin, {
        root: path.join(__dirname, 'public')
    })

    // 0.0.0.0 listens on all ips, required to work in docker container
    db.prepareDatabase().then(() => {
        server.listen(port, '0.0.0.0', err => {
            if (err) throw err
        })
    })
}



function html(array: any[], elementToHtml: (element: string) => string): string {
    return reduce(array, (prev, curr) => prev + elementToHtml(curr), '')
}


function page(title: string, array: any[], elementToHtml: (element: string) => string, includeScript: boolean = false): string {
    const filter = `<input id="filterMessage" type="text" placeholder="Filter logs" size="12" />`
    
    const button = `<button id="refresh" class="sticky" onClick="(function(){
        if (window.location.hash) {
            window.location.hash = ''
        } else {
            window.location.hash = 'paused'
        }
    })();return false;">Toggle autorefresh</button>`

    const flipOrder = `<div id="flipOrder">
    <input type="checkbox"  name="flipOrder">
    <label for="flipOrder">Oldest first</label>
  </div>`
    

    const header = `<header>
        <h1 id="title" class="sticky">${title}</h1><div id="controls">${flipOrder}${filter}${button}</div>
    </header>`

    const content = html(array, elementToHtml)

    return `<html>
    <head>
        <title>${title}</title>
        ${includeScript ? '<script src="/index.js"></script>' : ''}
        <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
        ${header}
        <main>
            ${content}
        </main>
    </body>
    </html>`
}


const sanitizeOptions = {
    allowedTags: [ 
        'h2', 'h3', 'h4', 'h5', 'h6', 
        'blockquote', 'p', 'a', 'ul', 'ol', 'nl', 'li',
        'b', 'i', 'strong', 'em', 'strike', 'code',
        'hr', 'br', 'pre', 'span'
    ],
    allowedAttributes: {
        a: [ 'href' ],
        span: [ 'class' ],
    }
}

function makeSafe(userInput: string): string {
    // some ios logs have logs containing strings like <filename.mm : 4859834>
    userInput = userInput.replace(/</g, `&lt;`)
    userInput = userInput.replace(/>/g, `&gt;`)
    return sanitizeHtml(userInput, sanitizeOptions)
}


async function deleteLogs(req: FastifyRequest<IncomingMessage>, reply: FastifyReply<OutgoingMessage>) {
    const { commit, player } = req.params

    await db.deleteLogs(commit, player)

    if (commit && player) {
        reply.send(`Deleted all logs for the player ${player} on commit ${commit}`)

    } else if (commit) {
        reply.send(`Deleted all logs for commit ${commit}`)

    } else {
        reply.send('Must specify a commit or player for logs to delete')
    }
}