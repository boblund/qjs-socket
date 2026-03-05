export { btoa, atob };

function btoa( b64 ) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	const len = b64.length;
	let buf = new Uint8Array( Math.floor( len * 3 / 4 ) );
	let out = 0, bits = 0, shift = 0;

	for ( let i = 0; i < len; i++ ) {
		const c = b64[i];
		const val = chars.indexOf( c );
		if ( val === -1 ) continue;

		bits |= val << shift;
		shift += 6;

		if ( shift >= 8 ) {
			buf[out++] = ( bits >> ( shift - 8 ) ) & 0xFF;
			shift -= 8;
		}
	}
	return buf.slice( 0, out );
}

function atob( uint8 ) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	let result = '';
	let i = 0;
	const len = uint8.length;

	while ( i < len ) {
		const a = uint8[i++] || 0;
		const b = uint8[i++] || 0;
		const c = uint8[i++] || 0;

		result += chars.charAt( a >> 2 );
		result += chars.charAt( ( ( a & 3 ) << 4 ) | ( b >> 4 ) );
		result += i > len + 1 ? '=' : chars.charAt( ( ( b & 15 ) << 2 ) | ( c >> 6 ) );
		result += i > len ? '=' : chars.charAt( c & 63 );
	}

	return result;
}
