import pino from 'pino';

const l = pino({
  name: 'Logs Server',
  level: process.env.LOG_LEVEL || 'debug',
  prettyPrint: {
    translateTime: 'HH:MM:ss.L',
    levelFirst: false,
    ignore: 'pid,hostname',
  }
});

export default l;

export function intArrayToString(ints: number[]) {
  let str = ''
  for (const i in ints){
      str += String.fromCharCode(ints[i])
  }
  return str
}