import * as os from 'os';
import * as std from 'std';
import { Server } from 'socket.so';

os.signal( os.SIGINT, () => {
	console.log( 'server stopped' );
	std.exit( 0 );
} );

let port = 12345;
const server = new Server;
const { stop, pipe_fd } = server.listen( port );
console.log( `Socket server started on port: ${ port }` );
const fdBuff = new Uint8Array( 4 );

function stringToAb( str ) {
	const len = str.length;
	const buf = new ArrayBuffer( len );
	const bytes = new Uint8Array( buf );
	let i = 0;
	while ( i < len ) bytes[i] = str.charCodeAt( i++ ) & 0xFF;
	return buf;
}

const READBUF_CHUNK_SIZE = 4096;
function clientServer( client_fd ){
	const readBuf = new Uint8Array( READBUF_CHUNK_SIZE );
	let n;
	while( true ){
		if ( ( n = os.read( client_fd, readBuf.buffer, 0, readBuf.length ) )  > 0 ) {
			const msg = String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, n ) );
			console.log( `client msg: ${ msg }` );
			let ab = stringToAb( 'clientServer reply: ' + msg );
			os.write( client_fd, ab, 0, ab.byteLength );
			readBuf.fill( 0 );
		} else {
			console.log( `client disconnected on fd ${ client_fd }` );
			os.setReadHandler( client_fd, null );
			os.close( client_fd );
			break;
		}
	}
};

// Read pipe from C side to get client attaches
os.setReadHandler( pipe_fd, () => {
	if( os.read( pipe_fd, fdBuff.buffer, 0, fdBuff.length ) > 0 ){
		const client_fd = new DataView( fdBuff.buffer ).getInt32( 0, true );
		os.setReadHandler( client_fd, () => clientServer( client_fd ) );
	} else {
		console.log( 'server stopping' );
		os.close( pipe_fd );
		stop();
	}
} );
