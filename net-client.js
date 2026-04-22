import * as std from 'std';
import { createConnection } from './net.mjs';
import { strToUint8 } from './strToUint8.mjs';


const CHUNK_SIZE = 4096;
if( scriptArgs.length != 2 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } [(http|https)://](ip4Addr|hostname):port` );
	std.exit( 1 );
}

const client = createConnection();
client.on( 'close', () => { std.exit( 0 ); } );
client.connect( scriptArgs[ 1 ], () => { client.write( strToUint8( `client sending data` ).buffer ); } );

client.on( 'data', ( msg ) => {
	console.log( `client.onData:\n${ String.fromCharCode( ...new Uint8Array( msg ) ) }` );
	client.destroy();
} );

client.on( 'error', e => {
	console.log( `client error: ${ e }` );
	std.exit( e );
} );
