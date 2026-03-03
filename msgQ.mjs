// simple, no dependency, 16 line message queue class

// comment out following 2 lines if not used in quickjs or if tests are removed
//import * as os from 'os';
//const setTimeout = ( fn, delay ) => os.setTimeout( fn, delay );

export { MsgQ };

class MsgQ {
	#v_queue = [];
	#get_queue = [];
	closed = false;

	add( v ){
		if( this.closed ) return false;
		this.#get_queue.length > 0 ? this.#get_queue.shift()( v ) : this.#v_queue.push( v );
		return true;
	}

	get(){
		if( this.closed ) return null;
		if( this.#v_queue.length > 0 ) return this.#v_queue.shift();
		return new Promise( res => { this.#get_queue.push( res ); } );
	}
}

async function test1(){
	console.log( 'test1' );
	const msgQ = new MsgQ;

	( async () => {
		while( true ){
			const v = await msgQ.get();
			if( v === null ) break;
			console.log( `msgQ.get(): ${ v }` );
		}
		console.log( `msgQ.closed == ${ msgQ.closed }` );
	} )();

	for( let i = 0; i < 2; i++ ){
		console.log( `msgQ.add( ${ i } )` );
		msgQ.add( i );
		await new Promise( res => setTimeout( res, 1000 ) );
	}
	console.log( `adder: msgQ.closed = true` );
	msgQ.closed = true;
}

async function test2(){
	console.log( '\ntest2' );
	const msgQ = new MsgQ;

	( async ()=> {
		let v;
		while( ( v = await msgQ.get() ) <  3 ){
			console.log( `msgQ.get(): ${ v }` );
		}
		msgQ.closed = true;

	} )();

	let i = 0;
	while( msgQ.add( i++ ) ){
		console.log( `msgQ.add( ${ i - 1 } )` );
		await new Promise( res => setTimeout( res, 1000 ) );
	}
	console.log( `msgQ.closed == ${ msgQ.closed }` );
}

async function test3(){
	console.log( '\ntest3' );
	const msqQ = new MsgQ;
	( async () => {
		await new Promise( res => setTimeout( res, 2000 ) );
		console.log( `msgQ.add( 1 )` );
		msqQ.add( 1 );
	} )();

	console.log( `msgQ.get()` );
	console.log( `msgQ.get(): ${ await msqQ.get() }` );

}

//await test1();
//await test2();
//test3();
