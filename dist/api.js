"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchData = fetchData;
const axios = require('axios');
const code = 'console.log("hi")';
const options = {
    method: 'POST',
    url: 'https://judge0-ce.p.rapidapi.com/submissions',
    params: {
        base64_encoded: 'true',
        wait: 'false',
        fields: '*'
    },
    headers: {
        'x-rapidapi-key': 'f811e3ef1cmshbb7db1e85e1468ap14c5e1jsnd83ddcd6c803',
        'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
        'Content-Type': 'application/json'
    },
    data: {
        language_id: 93,
        source_code: code,
        stdin: 'SnVkZ2Uw'
    }
};
function fetchData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios.request(options);
            console.log(response.data);
        }
        catch (error) {
            console.error(error);
        }
    });
}
