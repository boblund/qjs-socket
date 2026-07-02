import 'std'; //required for proper quickjs async I/O init, do import * as std from 'std'; if std is used
import * as os from 'os';
import { Client, Server } from 'socket.so';
import { parseUrl } from './parseUrl.mjs';

export function createServer( createServerCb ){
	const server = new Server();
	const ret = {
		listen( { port, key, cert } ){
			const READBUF_CHUNK_SIZE = 4096;
			const fdBuff = new Int32Array( 2 ); //( https ? 2 : 1 );
			const { stop, pipe_fd } = server.listen( { port, key, cert } );
			os.setReadHandler( pipe_fd, () => {
				if( os.read( pipe_fd, fdBuff.buffer, 0, fdBuff.length * 4 ) > 0 ){
					const fds = Array.from( fdBuff );
					const socket = new class{
						read_fd = fds[ 0 ];
						write_fd = fds[ 1 ];
						listeners = {
							data: () => {},
							close: () => {},
							error: () => {}
						};
						end(){ server.end( socket.read_fd ); }
						on( event, func ){
							this.listeners[ event ] = func;
							return func;
						};
						write( aBuf ){ os.write( this.write_fd, aBuf, 0, aBuf.byteLength ); }
					};

					createServerCb( socket );
					os.setReadHandler( socket.read_fd, () => {
						const readBuf = new Uint8Array( READBUF_CHUNK_SIZE );
						let n;
						if ( ( n = os.read( socket.read_fd, readBuf.buffer, 0, readBuf.length ) )  > 0 ) {
							socket.listeners.data( readBuf.slice( 0, n ) );
							readBuf.fill( 0 );
							return;
						}
						n === 0
							? socket.listeners.close()
							: socket.listeners.error( -n );
						os.close( socket.read_fd );
						os.close( socket.write_fd );
						os.setReadHandler( socket.read_fd, null );
					} );
				} else {
					os.close( pipe_fd );
					stop();
				}
			} );
		}
	};
	return ret;
}

export function createConnection( func = undefined ){
	const listeners = {
		data: new Set,
		close: new Set,
		connect: new Set,
		end: new Set,
		error: new Set
	};

	let fds, client;

	const socket = {
		connect( url, func = undefined ){
			if( typeof func === 'function' ) listeners[ 'connect' ].add( func );
			const CHUNK_SIZE = 4096;
			client = new Client();
			let { protocol, addr, port } = parseUrl( url );
			port = port ? port : ( protocol == 'wss' || protocol == 'https' ? 443 : 80 );
			fds = client.connect( { port, host: addr, tls: ( protocol === 'https' || protocol == 'wss' ) ? true : undefined } );

			if( fds === undefined ){
				listeners.error.forEach( func => func( -fds[ 0 ] ) );
				return undefined;
			}
			listeners.connect.forEach( func => func() );
			listeners.connect.clear();
			let readBuf = new Uint8Array( CHUNK_SIZE );
			os.setReadHandler( fds[ 0 ], () => {
				const n = os.read( fds[ 0 ], readBuf.buffer, 0, readBuf.length );
				if ( n > 0 ){
					listeners.data.forEach( func => func( readBuf ) );
					return;
				}
				n === 0
					? listeners.close.forEach( func => func() )
					: listeners.error.forEach( func => func( -n ) );
				os.close( fds[ 0 ] );
				os.setReadHandler( fds[ 0 ], null );
				client = undefined;
			} );
		},

		end( aBuf = undefined ){
			if( aBuf ) os.write( fds[ 0 ], aBuf, 0, aBuf.byteLength );
			client.end();
		},

		destroy(){
			client = undefined;
			os.close( fds[ 0 ] );
			os.setReadHandler( fds[ 0 ], null );
		},

		on( event, func ){ listeners[ event ].add( func ); },
		removeEventListener( event, func ){ listeners[ event ].delete( func ); },
		write( aBuf ){ os.write( fds[ 1 ], aBuf, 0, aBuf.byteLength ); }
	};

	if( typeof func === 'function' ) listeners[ 'connect' ].add( func );
	return socket;
}