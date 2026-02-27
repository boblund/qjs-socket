import * as os from 'os';
import { Client } from 'socket.so';
import { Channel } from './Channel.mjs';

function stringToAb( str ) {
	const buf = new ArrayBuffer( str.length );
	const bytes = new Uint8Array( buf );
	for ( let i = 0; i < str.length; i++ ) {
		bytes[i] = str.charCodeAt( i ) & 0xFF;
	}
	return buf;
}

function abToString( buf ) {
	const bytes = new Uint8Array( buf );
	let str = '';
	for ( let i = 0; i < bytes.length; i++ ) {
		str += String.fromCharCode( bytes[i] );
	}
	return str;
	// alternative. only: return String.fromCharCode( ...new Uint8Array( buf ) )
}


const CHUNK_SIZE = 4096;
const name = scriptArgs.length == 2 ? scriptArgs[ 1 ] : 'unkown';
const client = new Client();

let fd = client.connect( { ip: '192.168.0.30', port: 12345 } );
let readBuf = new Uint8Array( CHUNK_SIZE );
let cnt = 1;

const chan = new Channel;

os.setReadHandler( fd, () => {
	const bytesRead = os.read( fd, readBuf.buffer, 0, readBuf.length );
	if ( bytesRead > 0 ){
		chan.send( readBuf.buffer.slice( 0, bytesRead ) );
		readBuf.fill( 0 );
	} else {
		os.setReadHandler( fd, null );
		chan.close();
	}
} );

let msg;
while( cnt < 5 ){
	let ab = stringToAb( `client send ${ cnt } ${ name }` );
	os.write( fd, ab, 0, ab.byteLength );
	if( ( msg = await chan.get() ) === null ) break;
	console.log( `chan.get: ${ 	String.fromCharCode( ...new Uint8Array( msg ) ) }` );
	await new Promise( res => os.setTimeout( res, 10000 ) );
	cnt++;
}
os.setReadHandler( fd, null );
chan.close();
os.close( fd );

console.log( 'done' );
