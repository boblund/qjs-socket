import * as os from 'os';
import { Client, Server } from 'socket.so';

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
						//write_fd = https ? fds[ 1 ] : fds[ 0 ];
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

// s = [protocol://]v4|v6|host[:port][/path]
// returns { protocol, addr, port, path }

function parseUrl( s ){
	let addr, addrEnd, port, path;

	// Determine protocol
	let [ protocol, rest ] = s.split( '://' );
	if( rest === undefined ){
		rest = protocol;
		protocol = 'http';
	}

	// find the addr
	if( rest[0] === '[' ){
		addrEnd = rest.indexOf( ']' );
		addr = rest.slice( 1, addrEnd );
		rest = rest.slice( addrEnd + 1 );
	} else {
		addrEnd = rest[ 0 ] === ':'
			? 0
			: rest.indexOf( ':' ) > -1
				? rest.indexOf( ':' )
				: rest.indexOf( '/' );

		if( addrEnd === -1 ){
			addr = rest;
			rest = '';
		}else{
			addr = rest.slice( 0, addrEnd );
			rest = rest.slice( addrEnd );
		}
	}

	//find port and path
	if( rest !== '' ){
		if( rest[ 0 ] === ':' ){
			let portEnd = rest.indexOf( '/' );
			portEnd = portEnd === -1 ? rest.length : portEnd;
			port = Number( rest.slice( 1, portEnd ) );
			path = rest.slice( portEnd );
			path = path == '' ? undefined : path;
		}else{
			path = rest;
		}
	}

	return( { protocol, addr, port, path } );
}

export function createConnection( func = undefined ){
	const listeners = {
		data: new Set,
		close: new Set,
		connect: new Set,
		error: new Set
	};

	let fds, client;

	const socket = {
		connect( url, func = undefined ){
			if( typeof func === 'function' ) listeners[ 'connect' ].add( func );
			const CHUNK_SIZE = 4096;
			client = new Client();
			const { protocol, addr, port } = parseUrl( url );
			const { ipv4, ipv6 } = client.resolveAddr( addr );
			fds = client.connect( { ip: ipv4 ? ipv4 : ipv6, port, tls: protocol === 'https' ? true : undefined } );

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