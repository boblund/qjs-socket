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
if( scriptArgs.length < 3 || scriptArgs.length > 4 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } name port [ip]` );
	std.exit( 1 );
}
const [ name, port, ip = '127.0.0.1' ] = scriptArgs.slice( 1 );
const client = new Client();

let fds = client.connect( { ip, port, tls: true } );
os.setReadHandler( fds[ 0 ], () => { clientApp( fds[ 0 ] ); } );
let ab = strToUint8( `client send ${ name }` ).buffer;
os.write( fds[ 1 ], ab, 0, ab.byteLength );
