import { b64_sha1 } from 'sha1.mjs';
import { fromBase64, stringToAb } from 'abConversions.mjs';

function parseWebSocketFrame( buf ) {
	//https://www.openmymind.net/WebSocket-Framing-Masking-Fragmentation-and-More/
	if ( !( buf instanceof Uint8Array ) || buf.length < 2 ) return null;

	const byte0      = buf[0];
	const byte1      = buf[1];
	const fin        = Boolean( byte0 & 0x80 );        // bit 7
	const rsv1       = Boolean( byte0 & 0x40 );        // bit 6
	const rsv2       = Boolean( byte0 & 0x20 );        // bit 5
	const rsv3       = Boolean( byte0 & 0x10 );        // bit 4
	const opcode     = byte0 & 0x0F;                 // bottom 4 bits
	const masked     = Boolean( byte1 & 0x80 );        // bit 7
	let   payloadLen = byte1 & 0x7F;                 // bottom 7 bits

	let offset = 2;

	// Extended payload length
	if ( payloadLen === 126 ) {
		if ( buf.length < offset + 2 ) return null;
		payloadLen = ( buf[offset] << 8 ) | buf[offset + 1];
		offset += 2;
	} else if ( payloadLen === 127 ) {
		if ( buf.length < offset + 8 ) return null;
		// Simplified: treat as 32‑bit (ignore top 32 bits)
		payloadLen =
      ( buf[offset] << 24 ) |
      ( buf[offset + 1] << 16 ) |
      ( buf[offset + 2] << 8 ) |
      buf[offset + 3];
		offset += 4;
		// Skip extra 4 zero bytes per RFC6455
		offset += 4;
	}

	let maskingKey = null;
	if ( masked ) {
		if ( buf.length < offset + 4 ) return null;
		maskingKey = buf.slice( offset, offset + 4 );
		offset += 4;
	}

	if ( buf.length < offset + payloadLen ) return null;
	let payload = buf.slice( offset, offset + payloadLen );

	// If client‑to‑server, payload is masked
	if ( masked ) {
		payload = payload.map( ( byte, i ) => byte ^ maskingKey[i % 4] );
	}

	return { fin, rsv1, rsv2, rsv3, opcode, masked, payloadLen, payload /* Uint8Array */ };
}

function wsFrame( mode, data ) {
	// mode: 1 = text (0x01), 2 = binary (0x02)
	const opcode = mode === 1 ? 0x01 : 0x02;
	const fin    = 0x80; // FIN bit set

	const payloadLen = data.length;

	// Header length: 2 base + 2 or 8 for extended length
	let headerLen = 2;
	if ( payloadLen >= 126 ) {
		headerLen += payloadLen <= 65535 ? 2 : 8;
	}

	const raw = new Uint8Array( headerLen + payloadLen );
	let offset = 0;

	// Byte 0: FIN + opcode
	raw[offset++] = fin | opcode;

	// Byte 1: length (no mask)
	if ( payloadLen <= 125 ) {
		raw[offset++] = payloadLen;
	} else if ( payloadLen <= 65535 ) {
		raw[offset++] = 126;
		raw[offset++] = ( payloadLen >>> 8 ) & 0xFF;
		raw[offset++] = payloadLen & 0xFF;
	} else {
		raw[offset++] = 127;
		// upper 32 bits zero
		for ( let i = 0; i < 4; i++ ) raw[offset++] = 0;
		// lower 32‑bit length
		for ( let i = 0; i < 4; i++ ) raw[offset++] = ( payloadLen >>> ( 24 - 8 * i ) ) & 0xFF;
	}

	// Copy payload
	raw.set( data, offset );

	return raw.buffer;
}

const magicGUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export const wsServer = new class{
	handleUpgrade( webSocketKey, socket ) {
		socket.write( stringToAb( "HTTP/1.1 101 Switching Protocols\r\n" +
			"Upgrade: websocket\r\n" +
			"Connection: Upgrade\r\n" +
			`Sec-WebSocket-Accept: ${ b64_sha1( webSocketKey + magicGUID ) }\r\n` +
			"\r\n" ) );

		console.log( `socket (fd ${ socket.fd }) websocket upgrade` );

		socket.on( 'data', aBuf => {
			socket.write( wsFrame( 1, parseWebSocketFrame( new Uint8Array( aBuf ) ).payload ) );
		} );

		socket.on( 'close', () => { console.log( `websocket (fd: ${ socket.fd }) closing` ); } );
		return true;
	}
};
