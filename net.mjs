import * as os from 'os';
import { Client, Server } from 'socket.so';


export function createServer( createServerCb ){
	const server = new Server;
	return {
		listen( port ){
			const READBUF_CHUNK_SIZE = 4096;
			const fdBuff = new Uint8Array( 4 );
			const { stop, pipe_fd } = server.listen( port );
			os.setReadHandler( pipe_fd, () => {
				if( os.read( pipe_fd, fdBuff.buffer, 0, fdBuff.length ) > 0 ){

					const socket = new class{
						fd = undefined;
						listeners = {
							data: new Set,
							close: new Set,
							error: new Set
						};
						on( event, func ){ this.listeners[ event ].add( func ); };
						removeEventListener( event, func ){ this.listeners[ event ].delete( func ); };
						write( aBuf ){ os.write( this.fd, aBuf, 0, aBuf.byteLength ); }
					};

					socket.fd = new DataView( fdBuff.buffer ).getInt32( 0, true );
					console.log( `server client on fd: ${ socket.fd }` );
					createServerCb( socket );
					os.setReadHandler( socket.fd, () => {
						const readBuf = new Uint8Array( READBUF_CHUNK_SIZE );
						let n;
						if ( ( n = os.read( socket.fd, readBuf.buffer, 0, readBuf.length ) )  > 0 ) {
							socket.listeners.data.forEach( func => func( readBuf.slice( 0, n ) ) );
							readBuf.fill( 0 );
							return;
						}
						n === 0
							? socket.listeners.close.forEach( func => func() )
							: socket.listeners.error.forEach( func => func( -n ) );
						os.close( socket.fd );
						os.setReadHandler( socket.fd, null );
						console.log( `closed server client on fd: ${ socket.fd }` );
					} );
				} else {
					//listeners.close.forEach( func => func() );
					os.close( pipe_fd );
					stop();
				}
			} );
		}
	};
}

export function createConnection(){
	const listeners = {
		data: new Set,
		close: new Set,
		connect: new Set,
		error: new Set
	};

	let fd, ref_client;

	const socket = {
		connect( port, host, func ){
			const CHUNK_SIZE = 4096;
			const client = new Client();
			ref_client = client; // keeps client alive, set to undefine when done
			fd = client.connect( { ip: host, port } );
			//console.log( `client.connect:`, fd, host, port );
			if( fd < 0 ){
				listeners.error.forEach( func => func( -fd ) );
				return undefined;
			}

			let readBuf = new Uint8Array( CHUNK_SIZE );
			os.setReadHandler( fd, () => {
				const n = os.read( fd, readBuf.buffer, 0, readBuf.length );
				//console.log( `client readHandler` );
				if ( n > 0 ){
					listeners.data.forEach( func => func( readBuf ) );
					return;
				}
				n === 0
					? listeners.close.forEach( func => func() )
					: listeners.error.forEach( func => func( -n ) );
				os.close( fd );
				os.setReadHandler( fd, null );
				ref_client = undefined;
			} );
			func();
		},

		end( aBuf = undefined ){
			if( aBuf ) os.write( fd, aBuf, 0, aBuf.byteLength );
			os.close( fd );
		},

		destroy(){
			ref_client = undefined;
			os.close( fd );
			os.setReadHandler( fd, null );
		},

		on( event, func ){ listeners[ event ].add( func ); },
		removeEventListener( event, func ){ listeners[ event ].delete( func ); },
		write( aBuf ){ os.write( fd, aBuf, 0, aBuf.byteLength ); }
	};

	return socket;
}