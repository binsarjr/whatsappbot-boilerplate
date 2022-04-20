export class Request<Data = { [i: string]: any } | any> {
    private data: Data
    constructor(data?: Data) {
        this.data = data || ({} as Data)
    }
    has(name: keyof Data) {
        return Object.keys(this.data).includes(name as any)
    }
    set(name: keyof Data, value: any) {
        this.data[name] = value
    }

    get(name: keyof Data) {
        return this.data[name]
    }
    delete(name: keyof Data) {
        if (this.has(name)) delete this.data[name]
    }
    all() {
        return this.data
    }
}
