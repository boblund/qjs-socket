import * as std from 'std';
import { createConnection } from './net.mjs';
import { strToUint8 } from './strToUint8.mjs';


if( scriptArgs.length < 3 || scriptArgs.length > 4 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } name port [ip]` );
	std.exit( 1 );
}
const [ name, port, ip = '127.0.0.1' ] = scriptArgs.slice( 1 );

const client = createConnection();
client.on( 'close', () => { std.exit( 0 ); } );
client.connect( { port, ip, tls: true }, () => { client.write( strToUint8( `client send ${ name }` ).buffer ); } );

client.on( 'data', ( msg ) => {
	console.log( `client.onData:\n${ String.fromCharCode( ...new Uint8Array( msg ) ) }` );
	client.destroy();
} );

client.on( 'error', e => {
	console.log( `client error: ${ e }` );
	std.exit( e );
} );
