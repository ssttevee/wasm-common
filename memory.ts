export default class Memory {
    private _memory: WebAssembly.Memory;
    private _view: Uint8Array;
    private _allocs: [number, number][] = [];

    constructor(memoryDescriptor: WebAssembly.MemoryDescriptor) {
        this._memory = new WebAssembly.Memory(memoryDescriptor);
        this._view = new Uint8Array(this._memory.buffer);
    }

    public get memory(): WebAssembly.Memory {
        return this._memory;
    }

    public copyIn(src: Uint8Array): number {
        const ptr = this.alloc(src.length);
        this._view.set(src, ptr);
        return ptr;
    }

    public copyOut(ptr: number, length: number): Uint8Array {
        return this._view.slice(ptr, ptr + length);
    }
    
    public alloc(length: number): number {
        if (!this._allocs.length) {
            this._allocs.push([0, length]);
            return 0;
        }
    
        // look for space in between allocations
    
        const last_alloc = this._allocs[this._allocs.length - 1];
        if (this._allocs.length > 1) {
            if (last_alloc[0] + last_alloc[1] + length > this._view.length) {
                // not enough memory to allocate; grow and try again
                this._memory.grow(1);
                this._view = new Uint8Array(this._memory.buffer);
                return this.alloc(length);
            }
    
            for (let i = 0; i < this._allocs.length - 1; i++) {
                const a = this._allocs[i][0] + this._allocs[i][1];
                const b = this._allocs[i + 1][0];
                if (b - a >= length) {
                    this._allocs.splice(i + 1, 0, [a, length]);
                    return a;
                }
            }
        }
    
        // allocate at the end
    
        const ptr = last_alloc[0] + last_alloc[1];
        this._allocs.push([ptr, length]);
        return ptr;
    }
    
    public free(ptr: number): void {
        for (const [i, alloc] of this._allocs.entries()) {
            if (alloc[0] === ptr) {
                this._allocs.splice(i, 1);
                return;
            }
        }
    
        throw new Error('attempted to free invalid pointer');
    }
}
