import * as os from 'os';
import * as std from 'std';
import { Server } from 'socket.so';
import { paths } from 'httpPaths.mjs';
import { fromBase64, stringToAb } from 'abConversions.mjs';

os.signal( os.SIGINT, () => {
	console.log( 'server stopped' );
	std.exit( 0 );
} );

let port = 12345;
const server = new Server;
const { stop, pipe_fd } = server.listen( port );
console.log( `Socket server started on port: ${ port }` );
const fdBuff = new Uint8Array( 4 );

// Entries in paths of type image have a base64 encoded body
// convert back to Uint8Array
Object.keys( paths ).forEach( path => {
	if( paths[ path ].type.includes( 'image' ) ){
		paths[ path ].body = fromBase64( paths[ path ].body );
	}
} );

const pathNames = Object.keys( paths );

// Simple request parser (very lightweight)
function parseRequest( data ) {
	const str = data.toString();
	const lines = str.split( '\r\n' );
	const [ method, path ] = lines[0].split( ' ' );
	return { method, path: path || '/' };
}

const READBUF_CHUNK_SIZE = 4096;

function socketWrite( fd, status, statusText, contentType, body ){
	// chunked transfer is always used, whether it's needed or not
	const CHUNKSIZE = 128 * 1024;
	const headers = stringToAb(
		`HTTP/1.1 ${ status } ${ statusText }\r\n` +
		`Content-Type: ${ contentType }\r\n` +
		'Transfer-Encoding: chunked\r\n' +
		'Connection: keep-alive\r\n\r\n'
	);
	os.write( fd, headers, 0, headers.byteLength );

	const chunkTrailer = stringToAb( '\r\n' );
	const bodyLen = body instanceof ArrayBuffer || body instanceof Uint8Array ? body.byteLength : body.length;

	for( let pos = 0; pos < body.length; ) {
		const chunkLen = ( pos + CHUNKSIZE < bodyLen ) ? CHUNKSIZE : ( bodyLen - pos );
		const chunkHeader = stringToAb( `${ chunkLen.toString( 16 ) }\r\n` );
		const chunk = body instanceof ArrayBuffer || body instanceof Uint8Array
			? body.slice( pos, pos + chunkLen ).buffer
			: stringToAb( body.slice( pos, pos + chunkLen ) );

		os.write( fd, chunkHeader, 0, chunkHeader.byteLength );
		os.write( fd, chunk, 0, chunk.byteLength );
		os.write( fd, chunkTrailer, 0, chunkTrailer.byteLength );

		pos += chunkLen;
	}

	const endOfResp = stringToAb( '0\r\n\r\n' );
	os.write( fd, endOfResp, 0, endOfResp.byteLength );
}

function httpServerApp( client_fd ){
	const readBuf = new Uint8Array( READBUF_CHUNK_SIZE );
	let n;
	if ( ( n = os.read( client_fd, readBuf.buffer, 0, readBuf.length ) )  > 0 ) {
		const req = parseRequest( String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, n ) ) );
		const path = req.path === '/' ? '/index.html' : pathNames.includes( req.path ) ? req.path : '';
		console.log( 'request:', req.path );
		if( path !== '' ){
			socketWrite( client_fd, 200, "OK", paths[ path ].type, paths[ path ].body );
		} else {
			socketWrite( client_fd, 404, 'Not Found', {}, `404 ${ path.req } not Found\n` );
		}
	} else {
		console.log( `client disconnected on fd ${ client_fd }` );
		os.setReadHandler( client_fd, null );
		os.close( client_fd );
	}
}
// Read pipe from C side to get client attaches
os.setReadHandler( pipe_fd, () => {
	if( os.read( pipe_fd, fdBuff.buffer, 0, fdBuff.length ) > 0 ){
		const client_fd = new DataView( fdBuff.buffer ).getInt32( 0, true );
		console.log( `httpServer client on fd: ${ client_fd }` );
		os.setReadHandler( client_fd, () => { httpServerApp( client_fd ); } );
	} else {
		console.log( 'server stopping' );
		os.close( pipe_fd );
		stop();
	}
} );
