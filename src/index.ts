import * as ssh2 from 'ssh2';
import { readFileSync } from 'fs';

const motd = readFileSync('art.txt').toString()
const width = 78;

const ansi = (code: string): string => `\u001b[${code}`;
const block = '█';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const server = new ssh2.Server({
  hostKeys: [readFileSync('fake.key')]
}, (client: ssh2.Connection) => {
  const id = Math.round(Math.random() * 1e5);
  let name: string | null = null;
  let cols: number = 80;
  let rows: number = 20;

  console.log(`New connection ID ${id}`);

  const log = (...msg: any[]) => console.log(`[${id}]`, ...msg);

  client.on('authentication', (ctx: ssh2.AuthContext) => {
    log(`Auth as ${ctx.username}`);
    name = ctx.username;
    ctx.accept();
  })

  client.on('ready', function() {
    log('Ready');
  });

  client.on('session', function(accept) {
    log('Session');

    const session = accept();
    let stream: ssh2.ServerChannel;

    session.on('pty', function(accept, _reject, info) {
      rows = info.rows;
      cols = info.cols;

      accept();
    });

    session.on('shell', async function(accept) {
      stream = accept();

      const clear = ansi('2J');
      const topLeft = ansi('H');
      const lineStart = ansi('1G');

      async function write(text: string): Promise<void> {
        stream.write(`${text}\n${lineStart}`);
      }

      if (cols < 80) {
        write('Please try again from an >80 character terminal.');
        stream.exit(1);
        stream.end();
        return;
      }


      stream.write(clear);
      stream.write(topLeft);

      const dottedLine = new Array(cols).fill(block).join('');

      const leftPad = (cols - 2 - width) / 2;

      const pad = (n: number): string => {
        let result = '';
        for (let i = 0; i < n; i++) {
          const str = Math.random() < 0.2 ? '.' : ' ';
          result += str;
        }
        return result;
      }

      const center = (line: string): string => {
        const leftSpace = pad(Math.floor(leftPad));
        const rightPad = cols - 2 - line.length - leftPad;
        const rightSpace = pad(Math.ceil(rightPad));
        return block + leftSpace + line + rightSpace + block;
      }

      const lines = motd.split('\n');
      const verticalPadding = Math.max(0, (rows - 3 - lines.length) / 2);

      const msg: string[] = [];

      msg.push(dottedLine);

      for (let i = 0; i < Math.floor(verticalPadding); i++) {
        msg.push(center(''));
      }

      for (let line of lines) {
        msg.push(center(line.replace(/\{\{name\}\}/g, name || '')));
      }

      for (let i = 0; i < Math.ceil(verticalPadding); i++) {
        msg.push(center(''));
      }

      msg.push(dottedLine);

      for (const msgLine of msg) {
        await write(msgLine);
        await sleep(90);
      }

      await sleep(1000);

      stream.exit(0);
      stream.end();
    });

    session.on('window-change', function(_accept, _reject, info) {
      rows = info.rows;
      cols = info.cols;
      log('Window change', rows, cols);
    });
  });

  client.on('end', function() {
    log('End');
  });

  client.on('error', console.error);
});

server.listen(22, '0.0.0.0', function() {
  console.log(`Up and running`);
});
