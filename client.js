import * as os from 'os';
import * as std from 'std';
import { Client } from 'socket.so';
import { strToUint8 } from './strToUint8.mjs';

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
	let ab = strToUint8( `client send ${ ++cnt } ${ name }` ).buffer;
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
let ab = strToUint8( `client send ${ cnt } ${ name }` ).buffer;
os.write( fd, ab, 0, ab.byteLength );
