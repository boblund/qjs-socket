import * as os from 'os';
import * as std from 'std';

function readFile( name, mode = '' ) {
	let f = std.open( name, `r${ mode }` );
	let totalLen = 0;
	const chunks = [];  // array of Uint8Array

	while ( true ) {
		let buf = new Uint8Array( 4096 );
		let len = f.read( buf.buffer, 0, buf.length );
		if ( len <= 0 ) break;
		chunks.push( buf.subarray( 0, len ) );  // keep raw bytes
		totalLen += len;
	}
	f.close();

	// Join into final Uint8Array
	let result = new Uint8Array( totalLen );
	let offset = 0;
	for ( let chunk of chunks ) {
		result.set( chunk, offset );
		offset += chunk.length;
	}

	return mode === '' ? Array.from( result, b => String.fromCharCode( b ) ).join( '' ) : result;
}

function* chunkString( str, chunkSize = 16384 ) {  // 16KB default
	for ( let i = 0; i < str.length; i += chunkSize ) {
		yield str.slice( i, i + chunkSize );
	}
}

const paths = {
	"/favicon.ico": {
		body: readFile( 'favicon.ico', 'b' ),
		type: 'image/png'
	},
	"/index.html": {
		body: readFile( 'index.html' ),
		type: 'text/html;charset=utf-8'
	},
	"/index.bundle-2.0.1.js": {
		body: readFile( 'index.bundle-2.0.1.js' ),
		type: 'text/javascript'
	}
};

const pathNames = Object.keys( paths );

// Simple request parser (very lightweight)
function parseRequest( data ) {
	const str = data.toString();
	const lines = str.split( '\r\n' );
	const [ method, path ] = lines[0].split( ' ' );
	// Very naive, no headers parsing
	return { method, path: path || '/' };
}

function stringToAb( str ) {
	const buf = new ArrayBuffer( str.length );
	const bytes = new Uint8Array( buf );
	for ( let i = 0; i < str.length; i++ ) {
		bytes[i] = str.charCodeAt( i ) & 0xFF;
	}
	return buf;
}

const READBUF_CHUNK_SIZE = 4096;
let parent = os.Worker.parent;

function handle_msg( e ) {
	let ev = e.data;
	let fd;
	switch( ev.type ) {
		case "fd":
			console.log( `client connected on fd: ${ ev.fd }`,  );
			fd = ev.fd;
			httpServer( ev.fd );
			break;

		case "abort":
			console.log( `worker done: ${ fd }` );
			parent.onmessage = null; /* terminate the worker */
			break;
	}
}

function socketWrite( fd, status, statusText, contentType, body ){
	//console.log( 'socketWrite:', fd, status, statusText, contentType, body.length );
	if ( contentType === 'image/png' || contentType === 'image/ico' ) {
		let headers = stringToAb(
			`HTTP/1.1 200 OK\r\nContent-Type: ${ contentType }\r\nContent-Length: ${ body.length }\r\n\r\n`
		);
		//console.log( `body check: ${ body.buffer instanceof ArrayBuffer ? 'body is ArrayBuffer' : 'body is ArrayBuffer' }` );
		os.write( fd, headers, 0, headers.byteLength );
		os.write( fd, body.buffer, 0, body.buffer.byteLength );
		return;
	}

	const headers = stringToAb(
		`HTTP/1.1 ${ status } ${ statusText }\r\n` +
		`Content-Type: ${ contentType }\r\n` +
		'Transfer-Encoding: chunked\r\n' +
		'Connection: keep-alive\r\n\r\n'
	);

	//console.log( `socketWrite headers: ${ headers }` );
	os.write( fd, headers, 0, headers.byteLength );

	// C-LEVEL chunk loop (NO QuickJS calls)
	const chunkSize = 128 * 1024;
	let pos = 0;
	let chunkHeader, chunk;
	while ( pos < body.length ) {
		let chunkLen = ( pos + chunkSize < body.length ) ? chunkSize : ( body.length - pos );
		//chunk = stringToAb( `${ chunkLen.toString( 16 ) }\r\n` + body.slice( pos, pos + chunkLen ) + '\r\n' );
		//os.write( fd, chunk, 0, chunk.byteLength );
		chunkHeader = stringToAb( `${ chunkLen.toString( 16 ) }\r\n` );
		os.write( fd, chunkHeader, 0, chunkHeader.byteLength );
		chunk = stringToAb( body.slice( pos, pos + chunkLen ) + '\r\n' );
		console.log( `chunk: byteLength: ${ chunk.byteLength }, pos: ${ pos }, chunkLen: ${ chunkLen }` );
		os.write( fd, chunk, 0, chunk.byteLength );

		pos += chunkLen;
	}

	// Final zero chunk
	chunk = stringToAb( '0\r\n\r\n' );
	os.write( fd, chunk, 0, chunk.byteLength );
}

function httpServer( client_fd ){
	const readBuf = new Uint8Array( READBUF_CHUNK_SIZE );
	let n;
	while( true ){
		if ( ( n = os.read( client_fd, readBuf.buffer, 0, readBuf.length ) )  > 0 ) {
			//const request = String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, n ) );
			//console.log( `client msg: ${ request }` );
			const req = parseRequest( String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, n ) ) );
			//console.log( `httpServer req: ${ JSON.stringify( req ) }` );
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
			parent.postMessage( { type: "done", fd: client_fd } );
			break;
		}
	}
};

function worker_main() {
	parent.onmessage = handle_msg;
}

worker_main();

