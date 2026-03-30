export function strToUint8( str ) {
	const buf = new Uint8Array( str.length );
	for ( let i = 0; i < str.length; i++ ) {
		buf[i] = str.charCodeAt( i ) & 0xFF;
	}
	return buf;
};
