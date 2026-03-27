import * as os from 'os';
import * as std from 'std';
import {  createServer } from 'net.mjs';
import { wsServer } from 'WebSocketServer.mjs';
import { paths } from 'httpPaths.mjs';
import { fromBase64, stringToAb } from 'abConversions.mjs';

os.signal( os.SIGINT, () => {
	console.log( 'server stopped' );
	std.exit( 0 );
} );

function aBufToString(buffer) {
	return String.fromCharCode.apply(null, new Uint16Array(buffer));
}

if( scriptArgs.length != 2 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } port` );
	std.exit( 1 );
}
const [ port ] = scriptArgs.slice( 1 );

// Entries in paths of type image have a base64 encoded body
// convert back to Uint8Array
Object.keys( paths ).forEach( path => {
	if( paths[ path ].type.includes( 'image' ) ){
		paths[ path ].body = fromBase64( paths[ path ].body );
	}
} );

const pathNames = Object.keys( paths );

function parseRequest( data ) {
	const str = data.toString();
	const lines = str.split( '\r\n' );
	const [ method, path, protocol ] = lines[0].split( ' ' );
	const headers = {};
	lines.slice( 1 ).forEach( line => {
		const [ key, ...value ] = line.split( ': ' );
		headers[key.toLowerCase()] = value.join( ': ' );
	} );

	return { method, path, protocol, headers };
}

function httpRespWrite( socket, status, statusText, contentType, body ){
	// chunked transfer is always used, whether it's needed or not
	const CHUNKSIZE = 128 * 1024;
	const headers = stringToAb(
		`HTTP/1.1 ${ status } ${ statusText }\r\n` +
		`Content-Type: ${ contentType }\r\n` +
		'Transfer-Encoding: chunked\r\n' +
		'Connection: keep-alive\r\n\r\n'
	);
	socket.write( headers );
	console.log( console.log( `headers: ${ [ ...new Uint8Array( headers ) ] }` ) );

	const chunkTrailer = stringToAb( '\r\n' );
	const bodyLen = body instanceof ArrayBuffer || body instanceof Uint8Array ? body.byteLength : body.length;

	for( let pos = 0; pos < body.length; ) {
		const chunkLen = ( pos + CHUNKSIZE < bodyLen ) ? CHUNKSIZE : ( bodyLen - pos );
		const chunkHeader = stringToAb( `${ chunkLen.toString( 16 ) }\r\n` );
		const chunk = body instanceof ArrayBuffer || body instanceof Uint8Array
			? body.slice( pos, pos + chunkLen ).buffer
			: stringToAb( body.slice( pos, pos + chunkLen ) );

		socket.write( chunkHeader );
		socket.write( chunk );
		socket.write( chunkTrailer );

		pos += chunkLen;
	}

	const endOfResp = stringToAb( '0\r\n\r\n' );
	socket.write( endOfResp );
}

const server = createServer( ( socket ) => {
	socket.on( 'data', readBuf => {
		const req = parseRequest( String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, readBuf.buffer.length ) ) );
		if( req.headers?.[ "upgrade" ] == "websocket" ){
			wsServer.handleUpgrade( req.headers['sec-websocket-key'], socket ); //server.emit( 'upgrade', req.headers, socket );
			return;
		}
		//console.log( JSON.stringify( req, null, 2 ) );
		const path = req.path === '/' ? '/index.html' : pathNames.includes( req.path ) ? req.path : '';
		console.log( 'request:', req.path );
		if( path !== '' ){
			httpRespWrite( socket, 200, "OK", paths[ path ].type, paths[ path ].body );
		} else {
			httpRespWrite( socket, 404, 'Not Found', {}, `404 ${ path.req } not Found\n` );
		}
	} );

	socket.on( 'close', () => {
		console.log( `client disconnected` );
	} );

	socket.on( 'error', n => {
		console.log( n == 54 ? `client (fd ${ socket.fd }) closed` : `server error: ${ n }` );
	} );
} );

server.listen( port );
console.log( `Socket server started on port: ${ port }` );
