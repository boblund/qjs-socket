import * as os from 'os';
import { Client } from 'socket.so';
import { MsgQ } from './MsgQ.mjs';

function stringToAb( str ) {
	const buf = new ArrayBuffer( str.length );
	const bytes = new Uint8Array( buf );
	for ( let i = 0; i < str.length; i++ ) {
		bytes[i] = str.charCodeAt( i ) & 0xFF;
	}
	return buf;
}

// alternative for < 100KB String.fromCharCode( ...new Uint8Array( buf ) )

const CHUNK_SIZE = 4096;
const name = scriptArgs.length == 2 ? scriptArgs[ 1 ] : 'unkown';
const client = new Client();

let fd = client.connect( { ip: '192.168.0.30', port: 12345 } );
let readBuf = new Uint8Array( CHUNK_SIZE );
let cnt = 1;

const msgQ = new MsgQ;

os.setReadHandler( fd, () => {
	const bytesRead = os.read( fd, readBuf.buffer, 0, readBuf.length );
	if ( bytesRead > 0 ){
		msgQ.add( readBuf.buffer.slice( 0, bytesRead ) );
		readBuf.fill( 0 );
	} else {
		os.setReadHandler( fd, null );
		msgQ.closed = true;
	}
} );

let msg;
while( cnt < 5 ){
	let ab = stringToAb( `client send ${ cnt } ${ name }` );
	os.write( fd, ab, 0, ab.byteLength );
	if( ( msg = await msgQ.get() ) === null ) break;
	console.log( `msgQ.get: ${ 	String.fromCharCode( ...new Uint8Array( msg ) ) }` );
	await new Promise( res => os.setTimeout( res, 10000 ) );
	cnt++;
}
os.setReadHandler( fd, null );
msgQ.closed = true;
os.close( fd );

console.log( 'done' );
