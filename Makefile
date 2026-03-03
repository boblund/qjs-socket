QJSC = /usr/local/bin/qjsc
CC = gcc
CFLAGS = -g -O0 -Wall -fPIC -I/usr/local/include/quickjs -I/usr/local/include/msgq
LDFLAGS = -L/usr/local/lib/quickjs -lquickjs -L/usr/local/lib/msgq -lmsgq -lm -lpthread -ldl
ifndef TARGET
$(error Error: TARGET must be specified: 'make TARGET=server|client|httpServer|socketso')
endif

all: $(TARGET)

$(TARGET).c:  $(TARGET).js
	$(QJSC)  -e -M socket.so,socket -o $(TARGET).c $<

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

$(TARGET): $(TARGET).o socket.o
	$(CC) $(LDFLAGS) -o $(TARGET) $(TARGET).o socket.o

# Special target: build only the shared library
ifeq ($(TARGET),socketso)
$(TARGET):
	$(CC) -fPIC -shared -DJS_SHARED_LIBRARY -o socket.so socket.c \
	    -I/usr/local/include/quickjs -L/usr/local/lib/quickjs \
	    -lquickjs -lm -lpthread -ldl
endif

clean:
	rm -f $(TARGET).o socket.o $(TARGET).c

clean-all: clean
	rm -f $(TARGET)

.PHONY: all run clean