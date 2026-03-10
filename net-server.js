import * as os from 'os';
import * as std from 'std';
import { createServer } from 'net.mjs';


function stringToAb( str ) {
	const len = str.length;
	const buf = new ArrayBuffer( len );
	const bytes = new Uint8Array( buf );
	let i = 0;
	while ( i < len ) bytes[i] = str.charCodeAt( i++ ) & 0xFF;
	return buf;
}

os.signal( os.SIGINT, () => {
	console.log( 'server stopped' );
	std.exit( 0 );
} );

let port = 12345;

const server = createServer( ( socket ) => {
	socket.on( 'data', readBuf => {
		const msg = String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, readBuf.length ) );
		console.log( `client msg: ${ msg }` );
		let ab = stringToAb( 'clientServer reply: ' + msg );
		socket.write( ab );
		//readBuf.fill( 0 );
	} );
} );

server.listen( port );
