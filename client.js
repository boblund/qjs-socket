import * as os from 'os';
import * as std from 'std';
import { Client } from 'socket.so';
import { strToUint8 } from './strToUint8.mjs';

function clientApp( fd ){
	const readBuf = new Uint8Array( CHUNK_SIZE );
	const bytesRead = os.read( fd, readBuf.buffer, 0, readBuf.length );
	console.log( String.fromCharCode( ...new Uint8Array( readBuf.slice( 0, bytesRead ) ) ) );
	os.close( fd );
	os.setReadHandler( fd, null );
}

const CHUNK_SIZE = 4096;
if( scriptArgs.length < 2 || scriptArgs.length > 4 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } port [ip [tls]]` );
	std.exit( 1 );
}
let [ port, ip = '127.0.0.1', tls ] = scriptArgs.slice( 1 );
tls = tls ? true : undefined;
const client = new Client();
( { ipv4: ip } = client.resolveAddr( ip ) );

let fds = client.connect( { ip, port, tls } );
os.setReadHandler( fds[ 0 ], () => { clientApp( fds[ 0 ] ); } );
let ab = strToUint8( `client sending data` ).buffer;
os.write( fds[ 1 ], ab, 0, ab.byteLength );
