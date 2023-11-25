export namespace main {
	
	export class ApiHTTPResult {
	    flag: boolean;
	    header: {[key: string]: string[]};
	    body: string;
	
	    static createFrom(source: any = {}) {
	        return new ApiHTTPResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.flag = source["flag"];
	        this.header = source["header"];
	        this.body = source["body"];
	    }
	}
	export class ApiIOResult {
	    flag: boolean;
	    data: string;
	
	    static createFrom(source: any = {}) {
	        return new ApiIOResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.flag = source["flag"];
	        this.data = source["data"];
	    }
	}

}

