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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const db_1 = require("./db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
const middleware_1 = require("./middleware");
const dotenv_1 = __importDefault(require("dotenv"));
const db_2 = require("./db");
const axios_1 = __importDefault(require("axios"));
const stripe_1 = __importDefault(require("stripe"));
const port = 3000;
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use((0, cors_1.default)());
const stripe = new stripe_1.default(process.env.STRIPE_API_KEY || '', {
    apiVersion: "2025-05-28.basil",
});
app.use(express_1.default.json());
app.post('/payment', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const courseTitle = req.body.title;
    const price = req.body.price;
    const courseId = req.body.courseId;
    try {
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: courseTitle,
                        },
                        unit_amount: price, // amount in cents (e.g., $10 = 1000)
                    },
                    quantity: 1,
                }
            ],
            mode: 'payment',
            success_url: `http://localhost:5173/paymentSuccessfull/{CHECKOUT_SESSION_ID}/${courseId}`,
            cancel_url: 'http://localhost:5173/',
        });
        res.json({ url: session.url });
    }
    catch (e) {
        res.status(500).json({
            message: e
        });
    }
}));
app.get('/verifyPayment', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = req.query.session_id;
    if (!sessionId)
        res.json({
            message: 'no session id provided'
        });
    try {
        const session = yield stripe.checkout.sessions.retrieve(sessionId);
        res.json({
            paymentStatus: session.payment_status,
        });
    }
    catch (e) {
        res.json({
            error: e
        });
    }
}));
app.post('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const code = req.body.code;
    const sendCode = `function output() {
        ${code}
    }
    output();    
    `;
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
        data: JSON.stringify({
            language_id: 93,
            source_code: btoa(sendCode),
            //stdin: 'SnVkZ2Uw'
        })
    };
    try {
        const response = yield axios_1.default.request(options);
        const data = response.data.token;
        res.json({
            token: data
        });
    }
    catch (error) {
        console.error(error);
    }
}));
app.get('/getOutput', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers['authorization'];
    const url = `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true&fields=*`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': 'f811e3ef1cmshbb7db1e85e1468ap14c5e1jsnd83ddcd6c803',
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com'
        }
    };
    try {
        let statuscode = 2;
        let result;
        while (statuscode == 2) {
            const response = yield fetch(url, options);
            result = yield response.json();
            statuscode = result.status_id;
        }
        res.json({
            result
        });
    }
    catch (error) {
        console.error({ error });
        res.json({
            error
        });
    }
}));
app.post('/signup', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const body = zod_1.z.object({
        username: zod_1.z.string().min(3).max(30),
        password: zod_1.z.string().min(3).max(30).regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
    });
    const safeParsed = body.safeParse(req.body);
    if (safeParsed.success) {
        const user = safeParsed.data;
        try {
            const sameUser = yield db_1.userModel.findOne({ username: user.username });
            if (sameUser) {
                res.json({
                    message: 'user already exist'
                });
            }
            const hashedpassword = yield bcrypt_1.default.hash(user.password, 5);
            const newUser = yield db_1.userModel.create({
                username: user.username,
                password: hashedpassword
            });
            res.json({
                message: 'new user created'
            });
        }
        catch (e) {
            res.json({
                message: 'some error',
                error: e
            });
        }
    }
    else {
        res.json({
            error: safeParsed.error.issues[0].path[0],
            message: 'not passed safely'
        });
    }
}));
app.post('/signin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requiredBody = zod_1.z.object({
        username: zod_1.z.string().max(30).min(3),
        password: zod_1.z.string().max(30).min(3).regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
    });
    const safeParsed = requiredBody.safeParse(req.body);
    if (safeParsed.success) {
        const userData = safeParsed.data;
        try {
            const user = yield db_1.userModel.findOne({
                username: userData.username
            });
            if (!user) {
                return res.json({ message: "no user found" });
            }
            if (user.password) {
                const passwordVerification = yield bcrypt_1.default.compare(userData.password, user.password);
                if (passwordVerification) {
                    const token = jsonwebtoken_1.default.sign({
                        _id: user._id
                    }, config_1.secret, { expiresIn: '24hr' });
                    res.json({
                        token: token
                    });
                }
                else {
                    res.json({
                        message: 'incorrect creds'
                    });
                }
            }
            else {
                res.json({
                    message: "no user found"
                });
            }
        }
        catch (e) {
            res.json({
                error: e
            });
        }
    }
    else {
        res.json({
            message: "some error"
        });
    }
}));
app.post('/adminsignup', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const body = zod_1.z.object({
        username: zod_1.z.string().min(3).max(30),
        password: zod_1.z.string().min(3).max(30).regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
    });
    const safeParsed = body.safeParse(req.body);
    if (safeParsed.success) {
        const user = safeParsed.data;
        try {
            const sameUser = yield db_1.adminModel.findOne({ username: user.username });
            if (sameUser) {
                res.json({
                    message: 'admin already exist'
                });
            }
            const hashedpassword = yield bcrypt_1.default.hash(user.password, 5);
            const newUser = yield db_1.adminModel.create({
                username: user.username,
                password: hashedpassword
            });
            res.json({
                message: 'new admin created'
            });
        }
        catch (e) {
            res.json({
                message: 'some error',
                error: e
            });
        }
    }
    else {
        res.json({
            error: safeParsed.error.issues[0].path[0],
            message: 'not passed safely'
        });
    }
}));
app.post('/adminsignin', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const requiredBody = zod_1.z.object({
        username: zod_1.z.string().max(30).min(3),
        password: zod_1.z.string().max(30).min(3).regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
    });
    const safeParsed = requiredBody.safeParse(req.body);
    if (safeParsed.success) {
        const userData = safeParsed.data;
        const user = yield db_1.adminModel.findOne({
            username: userData.username
        });
        if (user === null || user === void 0 ? void 0 : user.password) {
            const passwordVerification = yield bcrypt_1.default.compare(userData.password, user.password);
            if (passwordVerification) {
                const token = jsonwebtoken_1.default.sign({
                    _id: user._id
                }, config_1.secret, { expiresIn: '24hr' });
                res.json({
                    token: token
                });
            }
            else {
                res.json({
                    message: 'incorrect creds'
                });
            }
        }
        else {
            res.json({
                message: "no user found"
            });
        }
    }
    else {
        res.json({
            message: "some error"
        });
    }
}));
app.get('/me', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const user = yield db_1.userModel.findOne({
        _id: userId
    });
    res.json({ user });
}));
app.get('/adminMe', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    // const userId = req.userId;
    try {
        const user = yield db_1.adminModel.findOne({
            username: 'Mohammed'
        });
        res.json({ user });
    }
    catch (e) {
        res.json({
            message: 'some error'
        });
    }
}));
app.post('/createCourse', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    if (!userId) {
        res.json({
            message: "admin not logged in"
        });
    }
    const requiredBody = zod_1.z.object({
        title: zod_1.z.string().min(3),
        description: zod_1.z.string(),
        price: zod_1.z.number(),
        imageUrl: zod_1.z.string()
    });
    const safeParsed = requiredBody.safeParse(req.body);
    if (safeParsed.success) {
        const data = safeParsed.data;
        const response = yield db_1.courseModel.findOne({
            userId: userId,
            title: data.title
        });
        if (response) {
            res.json({
                message: "course already exist"
            });
        }
        const newCourse = yield db_1.courseModel.create({
            title: data.title,
            description: data.description,
            price: data.price,
            imageUrl: data.imageUrl,
            userId: userId
        });
        if (newCourse) {
            yield axios_1.default.post('http://localhost:3000/buy', {
                courseId: newCourse._id
            });
            res.json({
                message: 'course created'
            });
        }
        res.json({
            message: 'something went wrong'
        });
    }
    else {
        res.json({
            message: 'invalid input'
        });
    }
}));
app.get('/purchasedCourses', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const response = yield db_1.purchasedCourseModel.find({
        userId: userId
    }).populate([{
            path: 'courseId'
        }, {
            path: 'userId'
        }]);
    if (response == null) {
        res.json({
            message: 'no course purchased'
        });
    }
    res.json({
        message: response
    });
}));
app.post('/buy', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const courseId = req.body.courseId;
    if (userId == null) {
        res.json({
            message: 'user is not logged in'
        });
    }
    const response = yield db_1.purchasedCourseModel.findOne({
        userId: userId,
        courseId: courseId
    });
    if (response) {
        res.json({
            message: 'already purchased'
        });
        return;
    }
    const purchase = yield db_1.purchasedCourseModel.create({
        userId: userId,
        courseId: courseId
    });
    if (purchase) {
        res.json({
            message: "purchased"
        });
    }
}));
app.get('/courses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const courses = yield db_1.courseModel.find({}).populate('userId');
    res.json({
        courses: courses
    });
}));
app.get('/course/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const courseId = req.params['id'];
    const response = yield db_1.courseModel.findOne({
        _id: courseId
    });
    res.json({
        response
    });
}));
app.post('/addLecture/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requiredBody = zod_1.z.object({
        title: zod_1.z.string(),
        videoUrl: zod_1.z.string()
    });
    const courseId = req.params['id'];
    const safeParsed = requiredBody.safeParse(req.body);
    const data = safeParsed.data;
    if (safeParsed.success) {
        try {
            const response = yield db_2.lectureModel.create({
                title: data === null || data === void 0 ? void 0 : data.title,
                videoUrl: data === null || data === void 0 ? void 0 : data.videoUrl,
                courseId: courseId
            });
            if (response) {
                res.json({
                    message: 'lecture has been created'
                });
            }
            else {
                res.json({
                    message: "lecture not created"
                });
            }
        }
        catch (e) {
            res.json({ message: 'some error ocured' });
        }
    }
    else {
        res.json({
            message: "invalid input"
        });
    }
}));
app.get('/getLectures/:id', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const courseId = req.params['id'];
    const isUser = yield db_1.purchasedCourseModel.findOne({
        userId: userId,
        courseId: courseId
    });
    if (!isUser) {
        res.json({
            message: 'user has not purchased the course'
        });
    }
    const lectures = yield db_2.lectureModel.find({
        courseId: courseId
    });
    if (lectures) {
        res.json({
            lectures
        });
    }
    else {
        res.json({
            message: 'something went wrong'
        });
    }
}));
app.get('/lecture/:id', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const lectureId = req.params['id'];
    const lecture = yield db_2.lectureModel.findOne({
        _id: lectureId
    });
    if (!lecture)
        res.json({ message: 'invalid lecturecode' });
    res.json({
        lecture
    });
}));
app.get('/getAdminCourses', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const adminId = req.userId;
    try {
        const courses = yield db_1.courseModel.find({
            userId: adminId
        });
        res.json({
            courses
        });
    }
    catch (error) {
        res.json({
            message: 'some error ocurred'
        });
    }
}));
app.post('/deleteCourse', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const courseId = req.body.courseId;
    try {
        const response = yield db_1.courseModel.deleteOne({
            _id: courseId,
            userId: userId
        });
        if (response.deletedCount) {
            res.json({
                message: "course has been deleted"
            });
        }
    }
    catch (e) {
        res.json({
            message: "some error occured",
            error: e
        });
    }
}));
app.post('/deleteLecture', middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const lectureId = req.body.lectureId;
    try {
        const response = yield db_2.lectureModel.deleteOne({
            _id: lectureId
        });
        if (response.deletedCount) {
            res.json({
                message: "course has been deleted"
            });
        }
    }
    catch (e) {
        res.json({
            message: "some error occured",
            error: e
        });
    }
}));
app.listen(process.env.PORT, () => {
    console.log('listening on port');
});
