export default class Response {
    constructor(success = true, data = {}, message = "") {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    json = () => {
        return {
            success: this.success,
            message: this.message,
            data: this.data
        };
    };
}