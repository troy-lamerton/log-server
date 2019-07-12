import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import { get, size, reduce, first } from 'lodash'
import { IncomingMessage, OutgoingMessage } from 'http';
import sanitizeHtml from 'sanitize-html'
import staticPlugin from 'fastify-static'
import path from 'path'
import foobarIpsum from 'foobar-ipsum'
import m from 'moment'

import l from './common/logger'
import * as db from './db';
import {CookieSerializeOptions} from "cookie";

const dummy = new foobarIpsum({
    size: {
        sentence: 3,
        paragraph: 1,
    },
})

m.locale('en-GB');

const HTML_UTF8 = 'text/html; charset=utf-8';

const viewSiteAuth = process.env.VIEW_SECRET_KEY;

/**
 * @param timestamp UTC timestamp
 */
function timestampToElement(timestamp: string, prefix?: string): string {
    const zoned = m.utc(timestamp).local()
    const formatted = zoned.fromNow()
    const formattedAbsolute = zoned.format('lll')
    return `<time datetime="${timestamp}" title="${formattedAbsolute}">${prefix ? (prefix + ' ') : ''}${formatted}</time>`
}

async function listLinks(req: FastifyRequest<IncomingMessage>, reply: FastifyReply<OutgoingMessage>) {
    const uniqueCommits = await db.getListOfCommits()

    if (!size(uniqueCommits)) {
        reply.send('There are no logs for any commit')
        return
    }

    const html = page(
        'Commits with logs',
        uniqueCommits,
        log => `<div class="list-item"><a href="/logs/${log.commit}">${log.commit}</a>${timestampToElement(log.created_at)}</div>`,
        'links'
    )

    reply.type(HTML_UTF8).send(html)
}

async function listPlayers(req: FastifyRequest<IncomingMessage>, reply: FastifyReply<OutgoingMessage>) {
    const { commit } = req.params

    const playersList = await db.getListOfPlayers(commit)

    const title = `Players on commit ${commit}</h1>`
    
    const numPlayers = size(playersList)

    if (numPlayers == 0) {
        const html = page(
            title,
            [`<div class="empty">No players with logs on commit '${commit}' yet</div>`],
            a => a
        )
        reply.type(HTML_UTF8).send(html)
        return
    }
        
    // if one player, immediately show that players logs
    if (numPlayers == 1) {
        const onlyPlayer = first(playersList).player;
        reply.redirect(`/logs/${commit}/${encodeURIComponent(onlyPlayer)}`);
        return;
    }

    const html = page(
        title,
        playersList,
        ({player, created_at}) => 
            `<div class="list-item">
                <a href="/logs/${commit}/${encodeURIComponent(player)}">${player}</a>
                ${timestampToElement(created_at, 'active')}
            </div>`,
        'links'
    )

    reply.type(HTML_UTF8).send(html)
}

export default function runServer(port: number) {
    const server = fastify({logger: l})

    server.register(require('fastify-cookie'));

    type CookieReply = FastifyReply<any> & {
        setCookie(key: string, value: string, opts: CookieSerializeOptions)
    }

    // register cookie and query auth checker
    server.addHook('onRequest', async (request, reply) => {
        if (request.req.method.toUpperCase() != 'GET') {
            return;
        }

        const cookieAuth = get(request, 'cookies.code');
        const queryAuth = get(request, 'query.code');

        if (cookieAuth === viewSiteAuth) {
            return
        }

        if (cookieAuth !== viewSiteAuth && queryAuth === viewSiteAuth) {
            (reply as CookieReply).setCookie('code', queryAuth, {
                expires: m().add(7, 'days').toDate(),
                path: '/'
            });
        } else {
            l.debug('queryAuth: ' + queryAuth +'__'+ cookieAuth);
            return reply.code(403).send('Unauthorized - please provide code in url: ?code=<code>')
        }
    });


    server.setNotFoundHandler((_, reply) => {
        reply.code(404).send('Not found')
    })

    server.get('/', (_, reply) => {
        reply.redirect('/logs')
    })
    server.get('/logs', listLinks)

    server.get('/logs/:commit', listPlayers)

    /** Show all logs for this commit */
    server.get('/logs/:commit/:player', async (req, reply) => {
        const { commit, player } = req.params

        const playerLogs = await db.getLogMessages(commit, player)

        if (!playerLogs.length) {
            playerLogs.push(`No logs for player ${player} yet`)
        }

        const content = page(
            `Logs for ${player} on commit <a href="/logs/${commit}">${commit}</a>`,
            playerLogs,
            msg => {
                let msgType = msg.match(/  \[(\w+)\] /)
                const className = msgType ? msgType[1].toLowerCase() : 'unknown'
                return `<pre class="${className}">${msg.replace('\n', '<br>')}</pre>`
            }
        )

        reply.type(HTML_UTF8).send(content)
    });

    /** get new logs for this commit */
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

    /** Receive a log message from the game */
    server.post('/logs/:commit/:player', async (req, reply) => {
        const msg = req.body.trim()
        const { commit, player } = req.params

        const safe = makeSafe(msg)

        await db.addLog(commit, player, safe)

        reply.send('OK')
    })
    
    // debug
    server.get('/logs/_fill', async (req, reply) => {
        let commit = 'abc12345'
        let player = 'playa'
        try {
            const promises = new Array(100).fill(0).map(() => {
                const d = new Date()
                const msg = `00/00 ${d.toTimeString().slice(0, 8)}  [Log] ${dummy.sentence()} ${dummy.sentence()} ${dummy.sentence()}`
                commit = Math.random().toString(16).slice(8)
                player = `playa_${Math.random().toString(16).slice(4)}`
                return db.addLog(commit, player, msg)
            })

            await Promise.all(promises)
            
            reply.code(200).send(`Filled /logs with 100 different commits`)

        } catch (err) {
            l.error(err)
            reply.code(400).send(`Error during fill: ${err}`)
        }
    })

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
    server.get('/logs/:commit/:player/_fill', async (req, reply) => {
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



function html<T>(array: T[], elementToHtml: (element: T) => string): string {
    return reduce(array, (prev, curr) => prev + elementToHtml(curr), '')
}


function page<T>(title: string, array: T[], elementToHtml: (element: T) => string, className: string = ''): string {
    const filter = `<input id="filterMessage" type="text" placeholder="Search this list" size="22" />`
    
    const button = `<button id="refresh" class="sticky" onClick="(function(){
        if (window.location.hash) {
            window.location.hash = ''
        } else {
            window.location.hash = 'paused'
        }
    })();return false;">Toggle autorefresh</button>`

    const flipOrder = `<div id="flipOrderContainer">
        <input id="flipOrder" name="flipOrder" type="checkbox">
        <label for="flipOrder">Newest logs first</label>
    </div>`
        

    const header = `<header>
        <h1 id="title" class="sticky"><a class="house" href="/">🏠</a> ${title}</h1><div id="controls">${flipOrder}${filter}${button}</div>
    </header>`

    const content = html(array, elementToHtml)

    const favicon = 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/185/clipboard_1f4cb.png'
    return `<html>
    <head>
        <title>${stripHtml(title)}</title>
        <link rel="shortcut icon" type="image/png" href="${favicon}"/>
        <link rel="stylesheet" href="/style.css" />
        <script src="/index.js"></script>
    </head>
    <body>
        
        ${header}
        
        <main class="${className}">
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

function stripHtml(html: string) {
    return sanitizeHtml(html, {
        allowedTags: [],
        allowedAttributes: {}
    })
}

function makeSafe(userInput: string): string {
    // some ios logs have logs containing strings like <filename.mm : 4859834>
    // treat all tags that dont have a space as text
    // the only tags allowed through will be <span class="">
    // because it has a space in side the < >
    userInput = userInput
        .replace(/<>/g, `&lt;&gt;`)
        .replace(/<[^\/ ]+>/g, (_, group1) => `$lt;${group1}&gt;`)

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
