import * as os from 'os';
import * as std from 'std';
import { createConnection } from './net.mjs';
import { strToUint8 } from './strToUint8.mjs';


if( scriptArgs.length < 3 || scriptArgs.length > 4 ){
	console.log( `Usage: ${ scriptArgs[ 0 ] } name port [ip]` );
	std.exit( 1 );
}
const [ name, port, ip = '127.0.0.1' ] = scriptArgs.slice( 1 );
let cnt = 1;

const client = createConnection();
client.on( 'close', () => { std.exit( 0 ); } );

client.on( 'data', async ( msg ) => {
	console.log( `client.onData: ${ 	String.fromCharCode( ...new Uint8Array( msg ) ) }` );
	await new Promise( res => os.setTimeout( res, 2000 ) );
	if( cnt < 5 ){
		let ab = strToUint8( `client send ${ cnt++ } ${ name }` ).buffer;
		client.write( ab );
	} else {
		client.destroy();
	}
} );

client.on( 'error', e => {
	console.log( `client error: ${ e }` );
	std.exit( e );
} );

client.connect( { port, ip }, () => {
	let ab = strToUint8( `client send ${ cnt++ } ${ name }` ).buffer;
	client.write( ab );
} );
