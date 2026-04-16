import * as os from 'os';
import * as std from 'std';
import { createServer } from 'net.mjs';
import { strToUint8 } from './strToUint8.mjs';

let body = '<html><body><h1>Hello from HTTPS</h1></body></html>';
let response =
	"HTTP/1.1 200 OK\r\n" +
	"Content-Type: text/html\r\n" +
	`Content-Length: ${ body.length }\r\n` +
	"Connection: Keep-Alive\r\n" +
	"\r\n" +
	body;

os.signal( os.SIGINT, () => {
	console.log( 'server stopped' );
	std.exit( 0 );
} );

if( scriptArgs.length > 3 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } port [tls]` );
	std.exit( 1 );
}
const [ port, tls = false ] = scriptArgs.slice( 1 );

const server = createServer( ( socket ) => {
	socket.on( 'data', readBuf => {
		const msg = String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, readBuf.length ) );
		//console.log( `server request: ${ msg }` );
		let ab = strToUint8( response ).buffer;
		socket.write( ab );
	} );
} );

const args = tls
	? { port, key: "key.pem", cert: "cert.pem" }
	: { port };

server.listen( tls ? { port, key: "key.pem", cert: "cert.pem" } : { port } );
