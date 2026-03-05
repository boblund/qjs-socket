import * as std from 'std';
import * as os from 'os';
import { atob } from 'atobtoa.mjs';

function readFile( name, mode = '' ) {
	let f = std.open( name, `r${ mode }` );

	if( mode = '' ){
		const s = f.readAsString();
		f.close();
		return s;
	}

	let totalLen = 0;
	const chunks = [];  // array of Uint8Array

	while ( true ) {
		let buf = new Uint8Array( 64 * 1024 );
		let len = f.read( buf.buffer, 0, buf.length );
		if ( len <= 0 ) break;
		chunks.push( buf.subarray( 0, len ) );  // keep raw bytes
		totalLen += len;
	}
	f.close();

	// Join into final Uint8Array
	let result = new Uint8Array( totalLen );
	let offset = 0;
	for ( let chunk of chunks ) {
		result.set( chunk, offset );
		offset += chunk.length;
	}

	return mode === '' ? Array.from( result, b => String.fromCharCode( b ) ).join( '' ) : result;
}

const paths = {};
const [ files, err ] = os.readdir( './files' );
if( err ){
	console.error( `Reading ./files error ${ -err }` );
	std.exit( 1 );
} else {
	files.filter( file => file !== '.' && file !== '..' ).forEach( file => {
		const ext = file.split( '.' ).pop();
		switch( ext ){
			case 'ico':
			case 'png':
				paths[ `/${ file }` ] = {
					body: atob( readFile( `./files/${ file }`, 'b' ) ),
					type: `image/${ ext }`
				};
				break;

			case 'html':
				paths[ `/${ file }` ] = {
					body: readFile( `./files/${ file }` ),
					type: 'text/html;charset=utf-8'
				};
				break;

			case 'js':
			case 'mjs':
				paths[ `/${ file }` ] = {
					body: readFile( `./files/${ file }` ),
					type: 'text/javascript'
				};
				break;
		}
	} );
}

let f = std.open( './httpPaths.mjs', 'w' );
f.puts( `
	// DO NOT EDIT. body (base64 encoded for image) and content-type for ${ Object.keys( paths ) }
	export { paths };
	const paths = ${ JSON.stringify( paths, null, 2 ) };
` );
f.close();
