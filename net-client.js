import * as std from 'std';
import { createConnection } from './net.mjs';
import { strToUint8 } from './strToUint8.mjs';


const CHUNK_SIZE = 4096;
if( scriptArgs.length < 2 || scriptArgs.length > 4 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } port [ip [tls]]` );
	std.exit( 1 );
}
let [ port, ip = '127.0.0.1', tls ] = scriptArgs.slice( 1 );
tls = tls ? true : undefined;

const client = createConnection();
client.on( 'close', () => { std.exit( 0 ); } );
client.connect( { port, ip, tls }, () => { client.write( strToUint8( `client sending data` ).buffer ); } );

client.on( 'data', ( msg ) => {
	console.log( `client.onData:\n${ String.fromCharCode( ...new Uint8Array( msg ) ) }` );
	client.destroy();
} );

client.on( 'error', e => {
	console.log( `client error: ${ e }` );
	std.exit( e );
} );
