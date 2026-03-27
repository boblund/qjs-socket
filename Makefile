QJSC = /usr/local/bin/qjsc
CC = gcc
CFLAGS = -g -O0 -Wall -fPIC -I/usr/local/include/quickjs
LDFLAGS = -L/usr/local/lib/quickjs -lquickjs -lm -lpthread -ldl

# socket
socket.o: socket.c
	$(CC) $(CFLAGS) -c socket.c -o socket.o

socket.so: socket.c
	$(CC) -fPIC -shared -DJS_SHARED_LIBRARY -o socket.so socket.c \
	    -I/usr/local/include/quickjs -L/usr/local/lib/quickjs \
	    -lquickjs -lm -lpthread -ldl

# net-client
net-client.c: net-client.js
	$(QJSC) -e -M socket.so,socket -o net-client.c net-client.js net.mjs

net-client.o: net-client.c
	$(CC) $(CFLAGS) -c net-client.c -o net-client.o

net-client: net-client.o socket.o
	$(CC) $(LDFLAGS) -o net-client net-client.o socket.o

# net-server
net-server.c: net-server.js
	$(QJSC) -e -M socket.so,socket -o net-server.c net-server.js net.mjs

net-server.o: net-server.c
	$(CC) $(CFLAGS) -c net-server.c -o net-server.o

net-server: net-server.o socket.o
	$(CC) $(LDFLAGS) -o net-server net-server.o socket.o

# client
client.c: client.js
	$(QJSC) -e -M socket.so,socket -o client.c client.js

client.o: client.c
	$(CC) $(CFLAGS) -c client.c -o client.o

client: client.o socket.o
	$(CC) $(LDFLAGS) -o client client.o socket.o

# server
server.c: server.js
	$(QJSC) -e -M socket.so,socket -o server.c server.js

server.o: server.c
	$(CC) $(CFLAGS) -c server.c -o server.o

server: server.o socket.o
	$(CC) $(LDFLAGS) -o server server.o socket.o

bundleFiles: bundleFiles.mjs abConversions.mjs
	$(QJSC) -o bundleFiles bundleFiles.mjs abConversions.mjs

HTTP_PATHS_FILES := $(shell find files -type f) #$(wildcard files/*)
print-http:
	@echo $(HTTP_PATHS_FILES)

httpPaths.mjs: $(HTTP_PATHS_FILES) bundleFiles
	./bundleFiles $(HTTP_PATHS_FILES)

# httpServer
httpServer.c: httpServer.js httpPaths.mjs abConversions.mjs
	$(QJSC) -e -M socket.so,socket -o httpServer.c httpServer.js httpPaths.mjs abConversions.mjs

httpServer.o: httpServer.c
	$(CC) $(CFLAGS) -c httpServer.c -o httpServer.o

httpServer: httpServer.o socket.o
	$(CC) $(LDFLAGS) -o httpServer httpServer.o socket.o

# net-httpServer
net-httpServer.c: net-httpServer.js httpPaths.mjs abConversions.mjs WebSocketServer.mjs sha1.mjs
	$(QJSC) -e -M socket.so,socket -o net-httpServer.c net-httpServer.js httpPaths.mjs abConversions.mjs  WebSocketServer.mjs sha1.mjs

net-httpServer.o: net-httpServer.c
	$(CC) $(CFLAGS) -c net-httpServer.c -o net-httpServer.o

net-httpServer: net-httpServer.o socket.o
	$(CC) $(LDFLAGS) -o net-httpServer net-httpServer.o socket.o

# wsHttpServer
wsHttpServer.c: wsHttpServer.js httpPaths.mjs abConversions.mjs http.mjs ws.mjs sha1.mjs net.mjs
	$(QJSC) -e -M socket.so,socket -o wsHttpServer.c wsHttpServer.js httpPaths.mjs abConversions.mjs  http.mjs ws.mjs sha1.mjs net.mjs

wsHttpServer.o: wsHttpServer.c
	$(CC) $(CFLAGS) -c wsHttpServer.c -o wsHttpServer.o

wsHttpServer: wsHttpServer.o socket.o
	$(CC) $(LDFLAGS) -o wsHttpServer wsHttpServer.o socket.o

.PHONY: clean

clean:
	rm -f *.o net-*.c client.c server.c httpServer.c wsHttpServer.c
