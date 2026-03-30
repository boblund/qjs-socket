import * as os from 'os';
import * as std from 'std';
import { createServer } from 'net.mjs';
import { strToUint8 } from './strToUint8.mjs';

os.signal( os.SIGINT, () => {
	console.log( 'server stopped' );
	std.exit( 0 );
} );

if( scriptArgs.length != 2 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } port` );
	std.exit( 1 );
}
const [ port ] = scriptArgs.slice( 1 );

const server = createServer( ( socket ) => {
	socket.on( 'data', readBuf => {
		const msg = String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, readBuf.length ) );
		console.log( `client msg: ${ msg }` );
		let ab = strToUint8( 'clientServer reply: ' + msg ).buffer;
		socket.write( ab );
	} );
} );

server.listen( port );
