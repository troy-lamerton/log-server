require('dotenv').config();

const sh = require('shelljs');

sh.exec(`docker run -d --rm
    -p ${process.env.DASHBOARD_PORT}:8080
    -v ${process.env.DB_FOLDER}:/data
    -e SQLITE_DATABASE="database.sqlite"
    -e SQLITE_WEB_PASSWORD=abc123
    coleifer/sqlite-web
    sqlite_web -H 0.0.0.0 -x --password --read-only database.sqlite`
    .replace(/\n/g, ' '),
);
