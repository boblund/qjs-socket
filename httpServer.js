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
const workerFileName = './httpWorker.js'; //'/tmp/httpWorker.js';
const worker_src = `

`;

let port = 12345;
const server = new Server;
const { stop, pipe_fd } = server.listen( port );
console.log( `Socket server started on port: ${ port }` );
const fdBuff = new Uint8Array( 4 );

/*
const workerFile = std.open( workerFileName, 'w' );
if ( !workerFile ) {
	console.log( `Failed to open worker file ${ workerFileName }` );
	std.exit( 1 );
}
workerFile.puts( worker_src );
workerFile.flush();
workerFile.close();
*/

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
