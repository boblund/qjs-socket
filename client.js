import * as os from 'os';
import * as std from 'std';
import { Client } from 'socket.so';

function stringToAb( str ) {
	const buf = new ArrayBuffer( str.length );
	const bytes = new Uint8Array( buf );
	for ( let i = 0; i < str.length; i++ ) {
		bytes[i] = str.charCodeAt( i ) & 0xFF;
	}
	return buf;
}

let cnt = 1;
async function clientApp( fd ){
	if( cnt == 5 ){
		os.close( fd );
		os.setReadHandler( fd, null );
		console.log( 'done' );
		return;
	}

	const readBuf = new Uint8Array( CHUNK_SIZE );
	const bytesRead = os.read( fd, readBuf.buffer, 0, readBuf.length );
	console.log( String.fromCharCode( ...new Uint8Array( readBuf.slice( 0, bytesRead ) ) ) );
	await new Promise( res => os.setTimeout( res, 5000 ) );
	let ab = stringToAb( `client send ${ ++cnt } ${ name }` );
	os.write( fd, ab, 0, ab.byteLength );
}

const CHUNK_SIZE = 4096;
if( scriptArgs.length < 3 || scriptArgs.length > 4 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } name port [ip]` );
	std.exit( 1 );
}
const [ name, port, ip = '127.0.0.1' ] = scriptArgs.slice( 1 );
const client = new Client();

let fd = client.connect( { ip, port } );
os.setReadHandler( fd, () => { clientApp( fd ); } );
let ab = stringToAb( `client send ${ cnt } ${ name }` );
os.write( fd, ab, 0, ab.byteLength );
