import * as os from 'os';
import * as std from 'std';
import { createConnection } from './net.mjs';

function stringToAb( str ) {
	const buf = new ArrayBuffer( str.length );
	const bytes = new Uint8Array( buf );
	for ( let i = 0; i < str.length; i++ ) {
		bytes[i] = str.charCodeAt( i ) & 0xFF;
	}
	return buf;
}

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
		let ab = stringToAb( `client send ${ cnt++ } ${ name }` );
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
	let ab = stringToAb( `client send ${ cnt++ } ${ name }` );
	client.write( ab );
} );
