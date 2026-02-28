import * as os from 'os';
import * as std from 'std';
import { Server } from 'socket.so';

const workers = {};
os.signal( os.SIGINT, () => {
	console.log( 'server stopped' );
	Object.entries( workers ).forEach( ( [ fd, worker ] ) => {
		console.log( `aborting worker for fd: ${ fd }` );
		worker.postMessage( { type: 'abort' } );
		os.close( worker );
		delete workers[ fd ];
	} );
	std.exit( 0 );
} );

/* socket server app worker */
const workerFileName = '/tmp/clientServer.mjs';
const worker_src = `
import * as os from "os";

function stringToAb( str ) {
	const buf = new ArrayBuffer( str.length );
	const bytes = new Uint8Array( buf );
	for ( let i = 0; i < str.length; i++ ) {
		bytes[i] = str.charCodeAt( i ) & 0xFF;
	}
	return buf;
}

const READBUF_CHUNK_SIZE = 4096;
let parent = os.Worker.parent;

function handle_msg( e ) {
	let ev = e.data;
	let fd;
	switch( ev.type ) {
		case "fd":
			console.log( \`client connected on fd: \${ ev.fd }\`,  );
			fd = ev.fd;
			clientServer( ev.fd );
			break;

		case "abort":
			console.log( \`worker done: \${ fd }\` );
			parent.onmessage = null; /* terminate the worker */
			break;
	}
}

function clientServer( client_fd ){
	const readBuf = new Uint8Array( READBUF_CHUNK_SIZE );
	let n;
	while( true ){
		if ( ( n = os.read( client_fd, readBuf.buffer, 0, readBuf.length ) )  > 0 ) {
			const msg = String.fromCharCode( ...new Uint8Array( readBuf.buffer, 0, n ) );
			console.log( \`client msg: \${ msg }\` );
			let ab = stringToAb( 'clientServer reply: ' + msg );
			os.write( client_fd, ab, 0, ab.byteLength );
			readBuf.fill( 0 );
		} else {
			console.log( \`client disconnected on fd \${ client_fd }\` );
			os.setReadHandler( client_fd, null );
			os.close( client_fd );
			parent.postMessage( { type: "done", fd: client_fd } );
			break;
		}
	}
};

function worker_main() {
	parent.onmessage = handle_msg;
}

worker_main();
`;

let port = 12345;
const server = new Server;
const { stop, pipe_fd } = server.listen( port );
console.log( `Socket server started on port: ${ port }` );
const fdBuff = new Uint8Array( 4 );

const workerFile = std.open( workerFileName, 'w' );
if ( !workerFile ) {
	console.log( `Failed to open worker file ${ workerFileName }` );
	std.exit( 1 );
}
workerFile.puts( worker_src );
workerFile.flush();
workerFile.close();

// Read pipe from C side to get client attaches
os.setReadHandler( pipe_fd, () => {
	if( os.read( pipe_fd, fdBuff.buffer, 0, fdBuff.length ) > 0 ){
		const client_fd = new DataView( fdBuff.buffer ).getInt32( 0, true );
		workers[ client_fd ] = new os.Worker( workerFileName );
		workers[ client_fd ].onmessage = function ( e ){
			switch( e.data.type ) {
				case "done":
					/* terminate */
					console.log( `thread done for fd: ${ e.data.fd }` );
					workers[ e.data.fd ].onmessage = null;
					delete workers[ e.data.fd ];
					break;
			}
		};
		workers[ client_fd ].postMessage( { type: "fd", fd: client_fd } );
	} else {
		console.log( 'server stopping' );
		std.remove( workerFileName );
		os.close( pipe_fd );
		stop();
	}
} );
