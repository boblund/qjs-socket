QJSC = /usr/local/bin/qjsc
CC = gcc
CFLAGS = -g -O0 -Wall -fPIC -I/usr/local/include/quickjs -I/usr/local/include/msgq
LDFLAGS = -L/usr/local/lib/quickjs -lquickjs -L/usr/local/lib/msgq -lmsgq -lm -lpthread -ldl
ifndef TARGET
$(error Error: TARGET must be specified: 'make TARGET=server|client|httpServer')
endif

all: $(TARGET)

$(TARGET).c:  $(TARGET).js
	$(QJSC)  -e -M socket.so,socket -o $(TARGET).c $<

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

$(TARGET): $(TARGET).o socket.o
	$(CC) $(LDFLAGS) -o $(TARGET) $(TARGET).o socket.o


clean:
	rm -f $(TARGET).o socket.o $(TARGET).c

clean-all: clean
	rm -f $(TARGET)

.PHONY: all run clean