# qjs-socket

## Overview

qjs-socket implements a TCP socket api for quickjs.

<img style="display: block; margin: auto;" src="./architecture.drawio.png">
<p style="text-align: center;">socket architecture</p>

A socket server starts with JavaScript (JS) creating an instance of the Server class exposed by the C module and calling its listen method (1). The C module creates a pipe. The pipe's write end is passed to a thread that loops waiting for client requests and the pipe's read end is returned to JS and used in os.setReadHandler (2).

Later, a client creates an instance of the Client class and calls the connect method (3). Which C module makes the request (4) and returns the client connection file descriptor (FD) to JS (5). The server accepts the request and sends the server connection FD to JS (5) where it is used in a os.setReadHanler (6).

At this point, client and server JS send data using os.write(fd, ...) and receive data in their respective readHandlers. client.js and server.js provide an example of these steps.

The motivation for qjs-socket was to embed an HTTP/WS server in a quickjs application to provide a local UI with the minimal amout of code; [qjs-wsHttpServer](www.gitbub.com/boblund/qjs-wsHttpServer.git) is an example (that embeds favicon.ico, index.html and index.js) is a 1 MB executable file. A design goal was to do the minimum required for client and server sockets in the C module, keeping the bulk of application and UI development in JS, HTML and CSS.

# API
## socket.so
A quickjs C module exporting Client and Server classes for creating TCP sockets. These sockets are exposed as quickjs file descriptors that can be read and written to. To use:
```
import{ Client, Server } from 'socket.so'
```
### Client
#### Constructor
const client = new Client;

#### Methods
connect( { ip, port } ) -  Connect to server.
- ip: server host ip address
- port: server host port
- Returns: file descriptor for server socket

const fd = client.connect( { ip, port } )
fd
- Returns: the socket file descriptor

### Server
#### Constructor
const server = new Server( );

#### Methods
server.listen( port ) - Listen for client connects.
- port: port to listen on for connects
- Returns:
	- stop: function to end thread listening for connects
	- pipe_fd: file descriptor to receive client socket file descriptor

fd
- Returns: the socket file descriptor

## net.mjs
Wrapper for socket.so that emulates a subset of the node.js 'net' module API. To use:
```
import{ createConnection, createServer } from 'net.mjs'
```
### createConnection
const client = createConnection( func ) - A factory function that creates an instance of a client TCP socket.
- func: function to call on ClientSocket 'connect' event
- Returns: ClientSocket

### ClientSocket
Emulates a subset of the nodejs client net.Socket.
#### Events
- close: Emitted when server closes socket
- connect: Emitted when connection is created
- data: Emitted when data is received. The argument is an ArrayBuffer containing the data.
- error: Emitted when an error occurs. The argument is the C errno.

#### Methods
client.connect( { port, ip }, func ) - Connect to server.
- ip: server host ip address
- port: server host port
- func: functiob to call on 'connect' event
- Returns: undefined

client.end( aBuf ) - Send FIN to server indicating nothing more will be written.
- aBuf: optional ArrayBuffer to be written before the FIN packaet.
- Returns: undefined

client.destroy() - Destroy the client.
- Returns: undefined

client.on( event, func ) - Register a callback for event.
- event: Event name 'data' | 'close' | 'connect' | 'error'
- func: function to call on event
- Returns: undefined

### createServer
const server = createServer( func ) - A factory function that creates an instance of a TCP Server.
- func: function to call on a new connection.
- Returns: TCP Server instance

#### Methods
server.listen( port ) - Listen for client connections.
- port: port to listen on for connection requests
- Returns: undefined

### ServerSocket
Emulates a subset of the nodejs server net.Socket.

#### Events
- data: Emitted when data is received. The argument is an ArrayBuffer.
- close: Emitted when the connection is closed.
- error: Emitted when an error occurs. The argument is the C errno.

#### Methods
on( event, func ) - Register a callback for event.
- event: Event name 'data' | 'close' | 'error'
- func: function to call on event
- Returns: undefined

removeEventListener( event, func ) - Remove a callback for event.
- event: Event name 'data' | 'close' | 'error'
- func: function to call on event
- Returns: undefined

write( aBuf ) - Write to the socket.
- aBuf: an ArrayBuffer
- Returns: undefined

# Using
qjs-socket was designed for and tested in QuickJS Compiler version 2025-09-13. The intended applications are compiled, standalone applications that need to communicate over TCP sockets. The 'make' command is used for building the following targets: client, server, net-client, net-server, httpServer and a dynamically loaded socket.so. There is no make all target.

## client/server
Simple TCP socket client and server that use a statically linked socket.so. Modify 'Makefile' to use the installed 'gcc' and quickjs 'qjsc' commands, then:

```
make client server
```

then, in separate terminal windows

```
./client <client-name>, port
./server port
```

## net-client/net-server
Simple TCP socket client and server that use net.mjs module.
```
make net-client net-server
```

then, in separate terminal windows

```
./net-client <client-name>, port
./net-server port
```

# License

Software license: Creative Commons Attribution-NonCommercial 4.0 International

**THIS SOFTWARE COMES WITHOUT ANY WARRANTY, TO THE EXTENT PERMITTED BY APPLICABLE LAW.**
