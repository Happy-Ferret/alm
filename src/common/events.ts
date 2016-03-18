export interface Listener<T> {
    (event: T): any;
}

export interface Disposable {
    dispose();
}

export class CompositeDisposible implements Disposable {
    private disposibles: Disposable[] = [];
    add(disposible: Disposable) {
        this.disposibles.push(disposible);
    }
    dispose() {
        this.disposibles.forEach(d=> d.dispose());
    }
}

/** passes through events as they happen. You will not get events from before you start listening */
export class TypedEvent<T> {
    private listeners: Listener<T>[] = [];
    private listenersOncer: Listener<T>[] = [];

    on = (listener: Listener<T>): Disposable => {
        this.listeners.push(listener);
        return {
            dispose: () => this.off(listener)
        };
    }

    once = (listener: Listener<T>): void => {
        this.listenersOncer.push(listener);
    }

    off = (listener: Listener<T>) => {
        var callbackIndex = this.listeners.indexOf(listener);
        if (callbackIndex > -1) this.listeners.splice(callbackIndex, 1);
    }

    emit = (event: T) => {
        this.listeners.forEach((listener) => listener(event));
        this.listenersOncer.forEach((listener) => listener(event));
        this.listenersOncer = [];

        this._last = event;
        while (this._currentQueue.length) {
            let item = this._currentQueue.pop();
            item.resolve(event);
        }
    }

    pipe = (te: TypedEvent<T>): Disposable => {
        return this.on((e)=>te.emit(e));
    }

    /**
     * A promise that is resolved on first event
     * ... or immediately with the last value
     */
    private _currentQueue:PromiseDeferred<T>[] = [];
    private _last: T = null;
    current = (): Promise<T> => {
        if (this._last != null){
            return Promise.resolve(this._last);
        }
        else {
            const promise = new Promise((resolve,reject)=>{
                this._currentQueue.push({ promise, resolve, reject });
            })
            return promise;
        }
    }
}

/** single event listener queue */
export class SingleListenerQueue<T> {
    private listener: Listener<T> = null;
    private pending: T[] = [];

    pendingCount = () => this.pending.length;

    on(listener: Listener<T>) {
        this.listener = listener;

        // clear pending
        this.pending.forEach((evt) => this.listener(evt));
        this.pending = [];
    }

    off() {
        this.listener = null;
    }

    emit(event: T) {
        if (!this.listener) {
            this.pending.push(event);
        } else {
            this.listener(event);
        }
    }
}
