// Software license: Creative Commons Attribution-NonCommercial 4.0 International
//
// THIS SOFTWARE COMES WITHOUT ANY WARRANTY, TO THE EXTENT PERMITTED BY APPLICABLE LAW.

export {Channel};

class Channel {
	#senders = [];
	#getters = [];
	#status = 'open';

	constructor(){};
	
	closed() {return this.#status == 'closed';}
	close() {
		this.#status = 'closed';
		if(this.#senders.length == 0){ // new for SocketPromise
			for(const getter of this.#getters){
				getter(null);
			}
		}
	};

	get(){
		return new Promise(res => {
			switch(true) {
				case this.#senders.length > 0:
					const {sender, msg} = this.#senders.shift();
					sender(true); // sender promise response
					res(msg); // getter promise response
					break;
				
				case this.closed():
					res(null);
					break;

				default:
					this.#getters.push(res);
			}
		});
	};

	send(msg){
		return new Promise(res => {
			switch(true) {
				case this.#getters.length > 0:
					this.#getters.pop()(msg); // getter promise response
					res(true); // sender promise response
					break;

				case this.closed():
					res(false);
					break;

				default:
					this.#senders.push({sender: res, msg});
			}
		});
	};

	async *[Symbol.asyncIterator]() {
		while (true) {
			if(this.closed()) break;
			yield await this.get();
		}
	};


	static async anyIdx(promiseArray){
		let retArray = promiseArray.map((promise, idx) => {
			return new Promise((res, rej) => { promise.then(value => res({idx,value})).catch(e => rej(e)); }); 
		});
		let r = undefined;
		try{ r = await Promise.any(retArray);}
		catch(e){ r = {index: -1, value: undefined}; }
		return r;
	}
}
